import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ExerciseCard = ({
  ex,
  exIdx,
  setsData,
  todayExercises,
  setTodayExercises,
  getLastWorkoutStr,
  handleSetChange,
  toggleCompleteSet,
  handleAddSet,
  handleGenerateWarmup,
  setInfoModal,
  t
}) => {
  const { i18n } = useTranslation();
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapOptions, setSwapOptions] = useState([]);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [targetWeight, setTargetWeight] = useState(20);
  
  const barWeight = 20;
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  
  const calculatePlates = () => {
    let weightPerSide = (targetWeight - barWeight) / 2;
    if (weightPerSide <= 0) return t('bar_only');
    
    let result = [];
    plates.forEach(p => {
      let count = Math.floor(weightPerSide / p);
      if (count > 0) {
        result.push(`${count}x ${p}kg`);
        weightPerSide -= count * p;
      }
    });
    
    return result.length > 0 ? result.join(' | ') : t('bar_only_short');
  };

  const handleAiSwap = async () => {
    if (!GEMINI_API_KEY) {
      alert(t('api_key_required_swap'));
      return;
    }
    setIsSwapping(true);
    setSwapOptions([]);
    try {
      const promptPt = `Estou na academia e o equipamento para o exercício "${ex.name}" está ocupado. Sugira 2 exercícios substitutos práticos que trabalhem os mesmos grupos musculares. Responda apenas com o nome dos exercícios, um por linha, sem numeração ou texto adicional.`;
      const promptEn = `I'm at the gym and the equipment for "${ex.name}" is taken. Suggest 2 practical substitute exercises that work the same muscle groups. Reply only with the exercise names, one per line, no numbering or extra text.`;
      const prompt = i18n.language === 'en' ? promptEn : promptPt;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      const lines = textResponse.split('\n').map(l => l.replace(/^[-*•\d.]\s*/, '').trim()).filter(l => l.length > 0);
      setSwapOptions(lines.slice(0, 2));
    } catch (e) {
      console.error(e);
      alert(t('error_fetching_substitutes'));
    } finally {
      setIsSwapping(false);
    }
  };

  const applySwap = (newExName) => {
    const newExs = [...todayExercises];
    newExs[exIdx].name = newExName;
    setTodayExercises(newExs);
    setSwapOptions([]);
  };

  const exSets = setsData[exIdx] || [];

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      <div className="flex-between" style={{ marginBottom: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0 }}>{ex.name}</h4>
            <button 
              onClick={() => setInfoModal({ open: true, exercise: ex.name })}
              style={{ 
                background: 'transparent', border: 'none', padding: 0, 
                color: 'var(--primary-color)', fontSize: '18px', cursor: 'pointer', lineHeight: 1
              }}
              aria-label="Informações sobre o exercício"
            >
              ℹ️
            </button>
            <button 
              onClick={handleAiSwap}
              disabled={isSwapping}
              style={{ 
                background: 'transparent', border: 'none', padding: 0, 
                color: 'orange', fontSize: '18px', cursor: 'pointer', lineHeight: 1
              }}
              title="Máquina ocupada? Sugerir substituto (IA)"
              aria-label="Substituir exercício com IA"
            >
              {isSwapping ? '⏳' : '🔄'}
            </button>
            <button 
              onClick={() => setShowPlateCalc(!showPlateCalc)}
              style={{ 
                background: 'transparent', border: 'none', padding: 0, 
                color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', lineHeight: 1
              }}
              title="Calculadora de Anilhas"
            >
              ⚖️
            </button>
          </div>
          <input 
            type="text" 
            placeholder={t('variation_placeholder')}
            value={ex.variation || ''}
            onChange={(e) => {
              const newExs = [...todayExercises];
              newExs[exIdx].variation = e.target.value;
              setTodayExercises(newExs);
            }}
            style={{ fontSize: '12px', padding: '6px 10px', marginTop: '6px', marginBottom: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '90%' }}
          />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {t('last_time')} {getLastWorkoutStr(ex.name)}
      </div>

      {swapOptions.length > 0 && (
        <div style={{ background: 'rgba(255,165,0,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px dashed orange' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'orange', fontWeight: 'bold' }}>{t('suggested_alternatives')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {swapOptions.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => applySwap(opt)}
                style={{ padding: '8px', fontSize: '14px', background: 'var(--surface-color)', border: '1px solid orange', color: 'var(--text-color)' }}
              >
                {t('change_to')} {opt}
              </button>
            ))}
            <button onClick={() => setSwapOptions([])} style={{ padding: '5px', fontSize: '12px', background: 'transparent', color: 'var(--text-muted)', border: 'none' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {showPlateCalc && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>{t('plate_calculator_title')}</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px' }}>{t('total_weight_kg')}</span>
            <input 
              type="number" 
              value={targetWeight} 
              onChange={e => setTargetWeight(Number(e.target.value))} 
              style={{ padding: '5px', width: '80px', marginBottom: 0 }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-color)' }}>
            <strong>{t('per_side_bar')}</strong> <br/> {calculatePlates()}
          </div>
        </div>
      )}
    
    {exSets.map((s, setIdx) => (
      <div key={setIdx} className="flex-row" style={{ marginBottom: '10px', opacity: s.completed ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', width: '20px' }}>{setIdx + 1}</span>
        <select 
          value={s.type} 
          onChange={(e) => handleSetChange(exIdx, setIdx, 'type', e.target.value)}
          disabled={s.completed}
          className="set-select"
        >
          <option value="normal">{t('set_normal')}</option>
          <option value="warmup">{t('set_warmup')}</option>
          <option value="failure">{t('set_failure')}</option>
          <option value="drop">{t('set_drop')}</option>
        </select>
        <input 
          type="number" placeholder="kg" value={s.weight}
          onChange={(e) => handleSetChange(exIdx, setIdx, 'weight', e.target.value)}
          disabled={s.completed}
          min="0" step="0.5"
          className="set-input"
        />
        <input 
          type="number" placeholder="reps" value={s.reps}
          onChange={(e) => handleSetChange(exIdx, setIdx, 'reps', e.target.value)}
          disabled={s.completed}
          min="0" step="1"
          className="set-input"
        />
        <input 
          type="number" placeholder="RIR" value={s.rpe}
          onChange={(e) => handleSetChange(exIdx, setIdx, 'rpe', e.target.value)}
          disabled={s.completed}
          min="0" max="5" step="0.5"
          title="Reps in Reserve (0-5)"
          className="set-input-small"
        />
        <button 
          onClick={() => toggleCompleteSet(exIdx, setIdx)}
          className="set-check-btn"
          aria-label={s.completed ? "Desmarcar série" : "Concluir série"}
          style={{ 
            background: s.completed ? 'var(--primary-color)' : 'var(--surface-color)',
            color: s.completed ? '#000' : 'var(--text-muted)',
            border: `1px solid ${s.completed ? 'var(--primary-color)' : 'var(--border-color)'}`,
            transition: 'all 0.3s ease'
          }}
        >
          ✓
        </button>
      </div>
    ))}
    
    <div style={{ display: 'flex', gap: '10px' }}>
      <button 
        onClick={() => handleAddSet(exIdx)}
        style={{ flex: 1, background: 'transparent', color: 'var(--primary-color)', border: '1px dashed var(--primary-color)', padding: '10px', marginTop: '10px', boxShadow: 'none' }}
      >
        {t('add_set')}
      </button>
      <button 
        onClick={() => handleGenerateWarmup(exIdx, ex.name)}
        style={{ flex: 1, background: 'rgba(255,165,0,0.1)', color: 'orange', border: '1px dashed orange', padding: '10px', marginTop: '10px', boxShadow: 'none' }}
      >
        🔥 Smart Warm-up
      </button>
    </div>
  </div>
  );
};

export default ExerciseCard;
