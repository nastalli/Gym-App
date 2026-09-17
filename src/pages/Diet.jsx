import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const Diet = () => {
  const { t } = useTranslation();
  const { measurements, diet, dailyChecklist, saveSettings } = useAppContext();
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  const [localDiet, setLocalDiet] = useState(diet);
  
  // Fasting State
  const [fastingElapsed, setFastingElapsed] = useState(0);
  const [fastingActive, setFastingActive] = useState(false);
  const [fastingGoal, setFastingGoal] = useState(16);

  useEffect(() => {
    let interval;
    if (localDiet.fastingStartTime) {
      setFastingActive(true);
      if (localDiet.fastingGoalHours) setFastingGoal(localDiet.fastingGoalHours);

      const updateFasting = () => {
        const now = Date.now();
        const diffSeconds = Math.floor((now - localDiet.fastingStartTime) / 1000);
        setFastingElapsed(diffSeconds);
      };
      
      updateFasting();
      interval = setInterval(updateFasting, 1000);
    } else {
      setFastingActive(false);
      setFastingElapsed(0);
    }
    return () => clearInterval(interval);
  }, [localDiet.fastingStartTime, localDiet.fastingGoalHours]);

  const handleStartFasting = () => {
    const newDiet = { ...localDiet, fastingStartTime: Date.now(), fastingGoalHours: fastingGoal };
    setLocalDiet(newDiet);
    saveSettings({ diet: newDiet });
  };

  const handleStopFasting = () => {
    if (window.confirm(t('stop_fasting_confirm'))) {
      const newDiet = { ...localDiet, fastingStartTime: null };
      setLocalDiet(newDiet);
      saveSettings({ diet: newDiet });
    }
  };

  const getFastingProgress = () => {
    const targetSeconds = fastingGoal * 3600;
    const p = (fastingElapsed / targetSeconds) * 100;
    return Math.min(p, 100);
  };

  const formatFastingTime = () => {
    const hrs = Math.floor(fastingElapsed / 3600);
    const mins = Math.floor((fastingElapsed % 3600) / 60);
    const secs = fastingElapsed % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate recommended macros based on measurements
  const calculateRecommended = () => {
    if (!measurements.weight || !measurements.height || !measurements.age) {
      return null;
    }
    
    const weight = Number(measurements.weight);
    const height = Number(measurements.height);
    const age = Number(measurements.age);
    
    // Mifflin-St Jeor Equation
    let tmb = 10 * weight + 6.25 * height - 5 * age;
    tmb += localDiet.gender === 'M' ? 5 : -161;
    
    // Lightly active multiplier
    let tdee = tmb * 1.375;
    
    // Goal adjustment
    let targetCals = tdee;
    if (localDiet.goal === 'gain') targetCals += 500;
    else if (localDiet.goal === 'loss') targetCals -= 500;
    
    const protein = weight * 2.0;
    const fat = weight * 1.0;
    const remainingCals = targetCals - (protein * 4 + fat * 9);
    const carbs = Math.max(0, remainingCals / 4);
    
    return {
      calories: Math.round(targetCals),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    };
  };

  const recommended = calculateRecommended();

  const handleSave = () => {
    saveSettings({ diet: localDiet });
    alert(t('diet_saved'));
  };

  const handleWaterClick = (index) => {
    const newWater = index + 1 === dailyChecklist.water ? index : index + 1;
    saveSettings({ dailyChecklist: { ...dailyChecklist, water: newWater } });
  };

  const handleMealsCheck = (checked) => {
    saveSettings({ dailyChecklist: { ...dailyChecklist, meals: checked } });
  };

  const handleAddFoodToLog = (food) => {
    const kcal = food.nutriments['energy-kcal_100g'] || 0;
    const pro = food.nutriments['proteins_100g'] || 0;
    const cho = food.nutriments['carbohydrates_100g'] || 0;
    const fat = food.nutriments['fat_100g'] || 0;
    
    const newFood = {
      id: Date.now(),
      name: food.product_name,
      kcal: Math.round(kcal),
      pro: Math.round(pro),
      cho: Math.round(cho),
      fat: Math.round(fat)
    };

    const currentLog = dailyChecklist.foodLog || [];
    saveSettings({ dailyChecklist: { ...dailyChecklist, foodLog: [...currentLog, newFood] } });
  };

  const handleRemoveFoodFromLog = (id) => {
    const currentLog = dailyChecklist.foodLog || [];
    saveSettings({ dailyChecklist: { ...dailyChecklist, foodLog: currentLog.filter(f => f.id !== id) } });
  };

  // Determine what to display
  const displayCals = localDiet.useCustom ? localDiet.calories : (recommended?.calories || 0);
  const displayPro = localDiet.useCustom ? localDiet.protein : (recommended?.protein || 0);
  const displayCarbs = localDiet.useCustom ? localDiet.carbs : (recommended?.carbs || 0);
  const displayFat = localDiet.useCustom ? localDiet.fat : (recommended?.fat || 0);

  const consumed = (dailyChecklist.foodLog || []).reduce((acc, f) => {
    acc.kcal += f.kcal;
    acc.pro += f.pro;
    acc.cho += f.cho;
    acc.fat += f.fat;
    return acc;
  }, { kcal: 0, pro: 0, cho: 0, fat: 0 });

  // Food Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // AI Recipe State
  const [aiRecipe, setAiRecipe] = useState(null);
  const [aiIngredients, setAiIngredients] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRecipe = async () => {
    if (!GEMINI_API_KEY) {
      alert(t('api_key_required_recipe'));
      return;
    }
    
    setIsGenerating(true);
    setAiRecipe(null);
    const targetKcal = displayCals * 0.3;
    
    try {
      const promptPt = `Você é um nutricionista especialista. Crie uma receita deliciosa de aproximadamente ${Math.round(targetKcal)} kcal. O usuário gostaria de usar os seguintes ingredientes: "${aiIngredients || 'ingredientes saudáveis aleatórios'}". 
      A receita deve ser criativa e se adequar à caloria alvo.
      Retorne APENAS um JSON válido com o seguinte formato exato (sem formatação markdown, apenas o json):`;
      const promptEn = `You are an expert nutritionist. Create a delicious recipe of approximately ${Math.round(targetKcal)} kcal. The user would like to use the following ingredients: "${aiIngredients || 'random healthy ingredients'}". 
      The recipe must be creative and fit the target calories.
      Return ONLY a valid JSON with the exact following format (no markdown formatting, just the json):`;

      const promptHead = i18n.language === 'en' ? promptEn : promptPt;

      const prompt = `${promptHead}
      {
        "name": "Nome da Receita",
        "prepTime": "Tempo em minutos",
        "portions": "Número de porções",
        "ingredients": [
          {"name": "Nome do ingrediente", "amount": "quantidade"}
        ],
        "macros": {
          "p": 40,
          "c": 50,
          "f": 5,
          "kcal": 400
        }
      }`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não retornou um formato válido.");
      
      const recipeData = JSON.parse(jsonMatch[0]);
      
      setAiRecipe(recipeData);
    } catch (e) {
      console.error(e);
      alert(t('detailed_error') + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchFood = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=10&lc=pt&cc=br`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      if (data.products) {
        setSearchResults(data.products.filter(p => p.nutriments && p.product_name));
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      alert(t('search_error'));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '80px' }}>
      
      {/* Fasting Tracker (Only for Weight Loss) */}
      {localDiet.goal === 'loss' && (
        <div className="glass-panel" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>{t('intermittent_fasting')}</h3>
          
          {fastingActive ? (
            <div>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 15px auto',
                background: `conic-gradient(var(--primary-color) ${getFastingProgress()}%, rgba(255,255,255,0.05) ${getFastingProgress()}%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ 
                  width: '105px', height: '105px', borderRadius: '50%', background: 'var(--bg-color)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatFastingTime()}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {fastingGoal}h</span>
                </div>
              </div>
              {getFastingProgress() >= 100 && (
                <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '15px' }}>
                  {t('fasting_goal_reached')}
                </p>
              )}
              <button onClick={handleStopFasting} className="danger-btn" style={{ padding: '8px 20px', fontSize: '14px' }}>
                {t('end_fasting')}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                {t('no_active_fasting')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                <span>{t('fasting_target')}</span>
                <select value={fastingGoal} onChange={(e) => setFastingGoal(Number(e.target.value))} style={{ padding: '5px', width: 'auto' }}>
                  <option value={12}>12h</option>
                  <option value={14}>14h</option>
                  <option value={16}>16h (Popular)</option>
                  <option value={18}>18h</option>
                  <option value={20}>20h</option>
                  <option value={24}>24h</option>
                </select>
              </div>
              <button onClick={handleStartFasting} style={{ padding: '10px 25px' }}>
                {t('start_fasting')}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>{t('diet_macros')}</h2>
      </div>

      {!recommended && !localDiet.useCustom && (
        <div className="glass-panel" style={{ textAlign: 'center', border: '1px solid #ff4444' }}>
          <p style={{ color: '#ff4444' }} dangerouslySetInnerHTML={{ __html: t('fill_profile_warning').replace('Perfil', '<strong>Profile/Perfil</strong>') }}></p>
        </div>
      )}

      <div className="glass-panel">
        <h3>{t('base_settings')}</h3>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <label>{t('goal')}</label>
          <select 
            value={localDiet.goal}
            onChange={e => setLocalDiet({...localDiet, goal: e.target.value})}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            <option value="gain">{t('goal_gain')}</option>
            <option value="maintenance">{t('goal_maintenance')}</option>
            <option value="loss">{t('goal_loss')}</option>
          </select>
        </div>
        
        <div className="flex-between" style={{ marginBottom: '15px' }}>
          <label>{t('gender')}</label>
          <select 
            value={localDiet.gender}
            onChange={e => setLocalDiet({...localDiet, gender: e.target.value})}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            <option value="M">{t('male')}</option>
            <option value="F">{t('female')}</option>
          </select>
        </div>

        <div className="flex-between" style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
          <label>{t('use_custom')}</label>
          <input 
            type="checkbox" 
            checked={localDiet.useCustom}
            onChange={e => setLocalDiet({...localDiet, useCustom: e.target.checked})}
            style={{ width: '24px', height: '24px' }}
          />
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('daily_goal')}</h3>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('calories')}</div>
          {localDiet.useCustom ? (
            <input 
              type="number" 
              value={localDiet.calories}
              onChange={e => setLocalDiet({...localDiet, calories: Number(e.target.value)})}
              style={{ fontSize: '24px', textAlign: 'center', fontWeight: 'bold', width: '120px', padding: '5px' }}
            />
          ) : (
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: consumed.kcal > displayCals ? 'var(--danger-color)' : 'var(--primary-color)' }}>
                {consumed.kcal} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {displayCals} kcal</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (consumed.kcal / (displayCals || 1)) * 100)}%`, height: '100%', background: consumed.kcal > displayCals ? 'var(--danger-color)' : 'var(--primary-color)' }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-between" style={{ gap: '10px' }}>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px 10px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>{t('protein')}</div>
            {localDiet.useCustom ? (
              <input type="number" value={localDiet.protein} onChange={e => setLocalDiet({...localDiet, protein: Number(e.target.value)})} style={{ width: '100%', textAlign: 'center', padding: '5px', marginBottom: 0 }} />
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{consumed.pro} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {displayPro}g</span></div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (consumed.pro / (displayPro || 1)) * 100)}%`, height: '100%', background: '#ff4444' }} />
                </div>
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px 10px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>{t('carbs')}</div>
            {localDiet.useCustom ? (
              <input type="number" value={localDiet.carbs} onChange={e => setLocalDiet({...localDiet, carbs: Number(e.target.value)})} style={{ width: '100%', textAlign: 'center', padding: '5px', marginBottom: 0 }} />
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{consumed.cho} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {displayCarbs}g</span></div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (consumed.cho / (displayCarbs || 1)) * 100)}%`, height: '100%', background: '#ffaa00' }} />
                </div>
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px 10px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>{t('fat')}</div>
            {localDiet.useCustom ? (
              <input type="number" value={localDiet.fat} onChange={e => setLocalDiet({...localDiet, fat: Number(e.target.value)})} style={{ width: '100%', textAlign: 'center', padding: '5px', marginBottom: 0 }} />
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{consumed.fat} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {displayFat}g</span></div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (consumed.fat / (displayFat || 1)) * 100)}%`, height: '100%', background: '#ff00aa' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={handleSave} style={{ width: '100%', padding: '15px', marginTop: '10px', marginBottom: '20px' }}>
        {t('save_settings')}
      </button>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('daily_checklist')}</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <div className="flex-between" style={{ marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('water')}</span>
            <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
              {(dailyChecklist.water * 250)} ml
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div 
              style={{
                position: 'relative',
                width: '100px',
                height: '140px',
                border: '4px solid rgba(255,255,255,0.15)',
                borderTop: 'none',
                borderRadius: '0 0 20px 20px',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.3)',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: `${Math.min(100, (dailyChecklist.water / 10) * 100)}%`,
                  background: 'linear-gradient(180deg, #00d4ff 0%, #0077ff 100%)',
                  transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 -5px 15px rgba(0, 212, 255, 0.5)'
                }}
              >
                {/* Opcional: Efeito de reflexo */}
                <div style={{
                  position: 'absolute', top: 0, left: '10%', width: '20%', height: '100%',
                  background: 'rgba(255,255,255,0.1)', transform: 'skewX(-20deg)'
                }}></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => handleWaterClick(Math.max(0, dailyChecklist.water - 1))}
                style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white' }}
              >
                - Copo
              </button>
              <button 
                onClick={() => handleWaterClick(Math.min(10, dailyChecklist.water + 1))}
                style={{ padding: '8px 20px', background: 'linear-gradient(45deg, #0077ff, #00d4ff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}
              >
                + Copo
              </button>
            </div>
          </div>
        </div>

        <div className="flex-between" style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
          <label style={{ fontWeight: 'bold' }}>{t('meals_protein_hit')}</label>
          <input 
            type="checkbox" 
            checked={dailyChecklist.meals}
            onChange={e => handleMealsCheck(e.target.checked)}
            style={{ width: '28px', height: '28px' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>{t('food_search')}</h3>
        <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', marginBottom: '15px' }}>
          {t('food_search_desc')}
        </p>
        <div className="flex-row">
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            style={{ flex: 1, marginBottom: 0 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchFood()}
          />
          <button 
            onClick={handleSearchFood}
            disabled={isSearching}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            {isSearching ? '...' : '🔍'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchResults.map((p, i) => {
              const kcal = p.nutriments['energy-kcal_100g'] || 0;
              const pro = p.nutriments['proteins_100g'] || 0;
              const cho = p.nutriments['carbohydrates_100g'] || 0;
              const fat = p.nutriments['fat_100g'] || 0;
              
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{p.product_name}</div>
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '5px' }}>{t('per_100g')}</div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                      <span>🔥 {Math.round(kcal)} kcal</span>
                      <span>🥩 {Math.round(pro)}g P</span>
                      <span>🍞 {Math.round(cho)}g C</span>
                    </div>
                  </div>
                  <button onClick={() => handleAddFoodToLog(p)} style={{ width: 'auto', padding: '10px', marginLeft: '10px' }}>
                    +
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {dailyChecklist.foodLog && dailyChecklist.foodLog.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>{t('consumed_today')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dailyChecklist.foodLog.map((f) => (
                <div key={f.id} className="flex-between" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  <div>
                    <strong>{f.name}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                      🔥 {f.kcal} kcal | 🥩 {f.pro}g | 🍞 {f.cho}g | 🥑 {f.fat}g
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveFoodFromLog(f.id)} 
                    style={{ background: 'transparent', color: 'var(--danger-color)', border: 'none', padding: '5px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>{t('ai_meal_generator')}</h3>
        <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', marginBottom: '15px' }}>
          {t('ai_meal_desc')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            value={aiIngredients}
            onChange={(e) => setAiIngredients(e.target.value)}
            placeholder={t('ai_ingredients_placeholder')}
            style={{ width: '100%', marginBottom: 0 }}
            onKeyDown={(e) => e.key === 'Enter' && generateRecipe()}
          />
        </div>

        {isGenerating && (
          <div style={{ textAlign: 'center', margin: '15px 0', color: 'var(--primary-color)' }}>
            <strong>{t('ai_generating_recipe')}</strong>
          </div>
        )}
        
        {aiRecipe && !isGenerating && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid var(--primary-color)' }}>
            <h4 style={{ color: 'var(--primary-color)', margin: '0 0 5px 0' }}>{aiRecipe.name}</h4>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⏱️ {aiRecipe.prepTime}</span>
              <span>🍽️ {aiRecipe.portions}</span>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '5px' }}>{t('ingredients_title')}</strong>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-color)' }}>
                {aiRecipe.ingredients && aiRecipe.ingredients.map((ing, idx) => (
                  <li key={idx}><strong>{ing.amount}</strong> de {ing.name}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
              <span style={{ color: 'var(--primary-color)' }}>🔥 {aiRecipe.macros?.kcal || 0} kcal</span>
              <span>🥩 {aiRecipe.macros?.p || 0}g P</span>
              <span>🍞 {aiRecipe.macros?.c || 0}g C</span>
              <span>🥑 {aiRecipe.macros?.f || 0}g G</span>
            </div>
          </div>
        )}

        <button 
          onClick={generateRecipe}
          disabled={isGenerating}
          style={{ width: '100%', padding: '12px', fontSize: '14px', background: 'var(--surface-color)', border: '1px dashed var(--primary-color)', color: 'var(--primary-color)' }}
        >
          {isGenerating ? t('wait') : (aiRecipe ? t('generate_another_recipe') : t('generate_recipe_ai'))}
        </button>
      </div>

    </div>
  );
};

export default Diet;
