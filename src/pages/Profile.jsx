import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { 
    user, muscleGroups, exercisesByGroup, dailySplits, 
    measurements, weightHistory, measurementHistory, workoutData, defaultRestTime, 
    streakData, unitSystem, accentColor, geminiApiKey, saveSettings 
  } = useAppContext();

  // Local state for forms
  const [localApiKey, setLocalApiKey] = useState(geminiApiKey || '');
  const [newGroupName, setNewGroupName] = useState('');
  const [newExGroup, setNewExGroup] = useState(muscleGroups[0] || '');
  const [newExName, setNewExName] = useState('');
  const [localSplits, setLocalSplits] = useState(dailySplits);
  const [localMeas, setLocalMeas] = useState(measurements);
  const [localRestTime, setLocalRestTime] = useState(defaultRestTime || 90);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // AI Workout Gen state
  const [workoutPrompt, setWorkoutPrompt] = useState('');
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [isMesocycle, setIsMesocycle] = useState(false);
  const [mesocyclePlan, setMesocyclePlan] = useState('');

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleMeasChange = (e) => {
    setLocalMeas({ ...localMeas, [e.target.name]: e.target.value });
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Gamification Logic
  const { streak, badges, totalVolume } = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return { streak: 0, badges: [], totalVolume: 0 };
    
    // Calculate total volume
    let vol = 0;
    workoutData.forEach(w => {
      if (w.reps && w.weight) {
        vol += Number(w.reps) * Number(w.weight);
      }
    });

    // Unique workout dates
    const dates = [...new Set(workoutData.map(w => new Date(w.timestamp).toDateString()))]
      .map(ds => new Date(ds))
      .sort((a, b) => b - a);

    let currentStreak = 0;
    let checkDate = new Date(new Date().toDateString());

    for (let i = 0; i < dates.length; i++) {
      const diffTime = Math.abs(checkDate - dates[i]);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 0 || diffDays === 1) {
        currentStreak++;
        checkDate = dates[i];
      } else {
        break;
      }
    }

    const earnedBadges = [];
    if (vol >= 1000) earnedBadges.push("🥉 1 Tonelada");
    if (vol >= 5000) earnedBadges.push("🥈 5 Toneladas");
    if (vol >= 10000) earnedBadges.push("🥇 10 Toneladas");
    if (dates.length >= 10) earnedBadges.push("🔥 10 Treinos");
    if (dates.length >= 30) earnedBadges.push("⭐ 30 Treinos");

    return { streak: currentStreak, badges: earnedBadges, totalVolume: vol };
  }, [workoutData]);

  const medal = useMemo(() => {
    if (totalVolume >= 10000) return { icon: '🥇', title: 'Monstro', color: '#ffd700' };
    if (totalVolume >= 5000) return { icon: '🥈', title: 'Avançado', color: '#c0c0c0' };
    if (totalVolume >= 1000) return { icon: '🥉', title: 'Intermediário', color: '#cd7f32' };
    return { icon: '🏅', title: 'Iniciante', color: 'var(--text-muted)' };
  }, [totalVolume]);

  const chartData = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return null;
    
    // Group volume by date
    const volumeByDate = {};
    workoutData.forEach(w => {
      const dateObj = new Date(w.timestamp);
      // Format as DD/MM
      const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}`;
      if (w.reps && w.weight) {
        if (!volumeByDate[dateStr]) volumeByDate[dateStr] = 0;
        volumeByDate[dateStr] += Number(w.reps) * Number(w.weight);
      }
    });

    const sortedDates = Object.keys(volumeByDate).sort((a, b) => {
      const [dayA, monthA] = a.split('/');
      const [dayB, monthB] = b.split('/');
      return new Date(2020, monthA-1, dayA) - new Date(2020, monthB-1, dayB);
    });
    
    const data = sortedDates.map(date => volumeByDate[date]);

    return {
      labels: sortedDates,
      datasets: [
        {
          fill: true,
          label: 'Volume Total (kg)',
          data: data,
          borderColor: accentColor || '#00d4ff',
          backgroundColor: `${accentColor || '#00d4ff'}33`,
          tension: 0.4
        }
      ]
    };
  }, [workoutData, accentColor]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
      y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.7)' } }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleSaveSplits = () => {
    saveSettings({ dailySplits: localSplits });
    alert(t('schedule_saved') || "Cronograma salvo!");
  };

  const handleAddMuscleGroup = () => {
    const name = newGroupName.trim();
    if (!name || muscleGroups.includes(name)) return;
    saveSettings({ muscleGroups: [...muscleGroups, name] });
    setNewGroupName('');
  };

  const handleRemoveMuscleGroup = (g) => {
    if (window.confirm(t('remove_muscle_group_confirm', { g }))) {
      const newGroups = muscleGroups.filter(m => m !== g);
      const newExercises = { ...exercisesByGroup };
      delete newExercises[g];
      
      const newSplits = {};
      Object.keys(dailySplits).forEach(day => {
         newSplits[day] = (dailySplits[day] || []).filter(mg => mg !== g);
      });
      
      setLocalSplits(newSplits);

      saveSettings({ 
        muscleGroups: newGroups, 
        exercisesByGroup: newExercises,
        dailySplits: newSplits
      });
    }
  };

  const handleAddExercise = () => {
    const group = newExGroup || (muscleGroups.length > 0 ? muscleGroups[0] : '');
    if (!group || !newExName.trim()) return;
    const currentList = exercisesByGroup[group] || [];
    if (!currentList.includes(newExName.trim())) {
      saveSettings({
        exercisesByGroup: {
          ...exercisesByGroup,
          [group]: [...currentList, newExName.trim()]
        }
      });
      setNewExName('');
    }
  };

  const handleRemoveExercise = (g, ex) => {
    if (window.confirm(t('remove_muscle_group_confirm', { g: ex }))) {
      saveSettings({
        exercisesByGroup: {
          ...exercisesByGroup,
          [g]: exercisesByGroup[g].filter(e => e !== ex)
        }
      });
    }
  };

  const handleSaveMeasurements = () => {
    const toSave = { measurements: localMeas };
    let historyChanged = false;
    
    if (localMeas.weight && localMeas.weight !== measurements.weight) {
      toSave.weightHistory = [
        ...weightHistory, 
        { timestamp: Date.now(), weight: Number(localMeas.weight) }
      ];
    }
    
    // Check if any specific circumference changed
    const mKeys = ['arms', 'chest', 'waist', 'thighs'];
    mKeys.forEach(k => {
      if (localMeas[k] && localMeas[k] !== measurements[k]) {
        historyChanged = true;
      }
    });

    if (historyChanged) {
      toSave.measurementHistory = [
        ...(measurementHistory || []),
        { timestamp: Date.now(), ...localMeas }
      ];
    }

    try {
      saveSettings(toSave);
      alert(t('profile_saved'));
    } catch (e) {
      console.error(e);
      alert("Error saving profile");
    }
  };

  const handleThemeChange = (color) => {
    saveSettings({ accentColor: color });
  };

  const currentStreak = streakData?.streak !== undefined ? streakData.streak : streak;

  const handleLangChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('gym_lang_chosen_val', lang);
    localStorage.setItem('gym_lang_chosen', 'true');
  };

  const handleLoadTemplate = (type) => {
    if (!window.confirm("Isso vai substituir seus exercícios e grupos musculares. Confirmar?")) return;
    
    let newGroups = [];
    let newExercises = {};
    let newSplits = {};
    
    if (type === 'PPL') {
      newGroups = ['Push', 'Pull', 'Legs', 'Core'];
      newExercises = {
        'Push': ['Supino Reto', 'Supino Inclinado', 'Desenvolvimento', 'Tríceps Polia'],
        'Pull': ['Puxada Frente', 'Remada Curvada', 'Rosca Direta', 'Encolhimento'],
        'Legs': ['Agachamento Livre', 'Leg Press', 'Cadeira Extensora', 'Mesa Flexora', 'Panturrilha'],
        'Core': ['Prancha', 'Abdominal Infra']
      };
      newSplits = {
        'Monday': ['Push'],
        'Tuesday': ['Pull'],
        'Wednesday': ['Legs'],
        'Thursday': ['Push'],
        'Friday': ['Pull'],
        'Saturday': ['Legs', 'Core'],
        'Sunday': []
      };
    } else if (type === 'FullBody') {
      newGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'];
      newExercises = {
        'Peito': ['Supino Reto'],
        'Costas': ['Puxada Alta', 'Remada'],
        'Pernas': ['Agachamento', 'Stiff'],
        'Ombros': ['Desenvolvimento'],
        'Braços': ['Rosca Direta', 'Tríceps Testa']
      };
      newSplits = {
        'Monday': ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'],
        'Tuesday': [],
        'Wednesday': ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'],
        'Thursday': [],
        'Friday': ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'],
        'Saturday': [],
        'Sunday': []
      };
    }
    
    setLocalSplits(newSplits);
    saveSettings({
      muscleGroups: newGroups,
      exercisesByGroup: newExercises,
      dailySplits: newSplits
    });
    alert(t('template_loaded'));
  };

  const handleGenerateAIWorkout = async () => {
    if (!geminiApiKey) {
      alert(t('api_key_required'));
      return;
    }
    if (!workoutPrompt) {
      alert(t('workout_prompt_required'));
      return;
    }

    if (!window.confirm(t('confirm_replace_all_routine'))) return;

    setIsGeneratingWorkout(true);
    setMesocyclePlan('');
    try {
      const prompt = isMesocycle
        ? `Atue como um Master Trainer. Crie uma planilha de treino e um Mesociclo de 4 semanas baseado em: "${workoutPrompt}". 
        Retorne APENAS um JSON válido, sem markdown, no seguinte formato exato:
        {
          "muscleGroups": ["Nome 1", "Nome 2"],
          "exercisesByGroup": {
            "Nome 1": ["Exercicio A", "Exercicio B"],
            "Nome 2": ["Exercicio C"]
          },
          "dailySplits": {
            "Monday": ["Nome 1"],
            "Tuesday": ["Nome 2"],
            "Wednesday": [],
            "Thursday": ["Nome 1", "Nome 2"],
            "Friday": [],
            "Saturday": [],
            "Sunday": []
          },
          "mesocyclePlan": "Texto formatado explicando a progressão das 4 semanas (ex: Semana 1 - RPE 7, Semana 4 - Deload, progressões de carga)..."
        }
        Lembre-se: os dias da semana em dailySplits DEVEM estar em inglês conforme o exemplo.`
        : `Atue como um Master Trainer. Crie uma planilha de treino completa baseada no seguinte pedido do usuário: "${workoutPrompt}". 
      Retorne APENAS um JSON válido, sem markdown, no seguinte formato exato:
      {
        "muscleGroups": ["Nome 1", "Nome 2"],
        "exercisesByGroup": {
          "Nome 1": ["Exercicio A", "Exercicio B"],
          "Nome 2": ["Exercicio C"]
        },
        "dailySplits": {
          "Monday": ["Nome 1"],
          "Tuesday": ["Nome 2"],
          "Wednesday": [],
          "Thursday": ["Nome 1", "Nome 2"],
          "Friday": [],
          "Saturday": [],
          "Sunday": []
        }
      }
      Lembre-se: os dias da semana em dailySplits DEVEM estar em inglês conforme o exemplo.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não retornou um formato válido.");
      
      const result = JSON.parse(jsonMatch[0]);
      
      if (result.mesocyclePlan) {
        setMesocyclePlan(result.mesocyclePlan);
      }
      
      setLocalSplits(result.dailySplits);
      saveSettings({
        muscleGroups: result.muscleGroups,
        exercisesByGroup: result.exercisesByGroup,
        dailySplits: result.dailySplits
      });
      alert(t('workout_generated_success'));
      setWorkoutPrompt('');
    } catch (e) {
      console.error(e);
      alert(t('error_generating_workout') + e.message);
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      profile: { measurements: localMeas, unitSystem, defaultRestTime },
      workoutData,
      weightHistory
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportRoutine = () => {
    const routine = { muscleGroups, exercisesByGroup, dailySplits };
    navigator.clipboard.writeText(JSON.stringify(routine));
    alert(t('routine_copied'));
  };

  const handleImportRoutine = () => {
    const text = window.prompt("Cole o código da rotina aqui:");
    if (!text) return;
    try {
      const routine = JSON.parse(text);
      if (routine.muscleGroups && routine.dailySplits) {
        if (window.confirm("Isso vai substituir sua rotina atual. Confirmar?")) {
          setLocalSplits(routine.dailySplits);
          saveSettings({
            muscleGroups: routine.muscleGroups,
            exercisesByGroup: routine.exercisesByGroup,
            dailySplits: routine.dailySplits
          });
          alert("Rotina importada com sucesso!");
        }
      } else {
        alert("Código de rotina inválido.");
      }
    } catch (e) {
      alert("Erro ao ler o código colado.");
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>{t('your_profile')}</h2>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '20px', marginBottom: '15px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>👤 Logado como:</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{user?.email}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>{t('language')}:</span>
          <button 
            onClick={() => handleLangChange('pt')}
            style={{ 
              padding: '8px 12px', 
              background: i18n.language === 'pt' ? 'var(--primary-color)' : 'transparent', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              marginBottom: 0, 
              width: 'auto',
              opacity: i18n.language === 'pt' ? 1 : 0.4,
              filter: i18n.language === 'pt' ? 'none' : 'grayscale(100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Português"
          >
            <img src="https://flagcdn.com/w40/br.png" alt="Brasil" style={{ width: '28px', borderRadius: '4px' }} />
          </button>
          <button 
            onClick={() => handleLangChange('en')}
            style={{ 
              padding: '8px 12px', 
              background: i18n.language === 'en' ? 'var(--primary-color)' : 'transparent', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              marginBottom: 0, 
              width: 'auto',
              opacity: i18n.language === 'en' ? 1 : 0.4,
              filter: i18n.language === 'en' ? 'none' : 'grayscale(100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="English"
          >
            <img src="https://flagcdn.com/w40/us.png" alt="USA" style={{ width: '28px', borderRadius: '4px' }} />
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>{t('theme_color_label')}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {[
              { id: 'neon', color: '#00ff88' },
              { id: 'cyber', color: '#b92b27' },
              { id: 'purple', color: '#a200ff' },
              { id: 'blue', color: '#00ccff' },
              { id: 'orange', color: '#ff6600' }
            ].map(theme => (
              <div 
                key={theme.id}
                onClick={() => handleThemeChange(theme.color)}
                style={{
                  width: '30px', height: '30px', borderRadius: '50%', background: theme.color,
                  cursor: 'pointer',
                  border: accentColor === theme.color ? '2px solid white' : '2px solid transparent',
                  boxShadow: accentColor === theme.color ? `0 0 10px ${theme.color}` : 'none',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🔥</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('streak')}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{currentStreak}</div>
          <div style={{ fontSize: '10px' }}>{t('days_in_row')}</div>
        </div>
        
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>{medal.icon}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rank</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: medal.color, marginTop: '5px' }}>
            {medal.title}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '15px', textAlign: 'center' }}>{t('my_achievements')}</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {badges.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('train_more_medals')}</span>
          ) : (
            badges.map(b => (
              <div key={b} style={{ 
                background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(0,0,0,0.2))', 
                padding: '8px 15px', 
                borderRadius: '25px', 
                fontSize: '14px',
                fontWeight: 'bold',
                border: `1px solid ${accentColor || 'var(--primary-color)'}`,
                boxShadow: `0 0 10px ${accentColor || 'var(--primary-color)'}33`,
                animation: 'popIn 0.5s ease'
              }}>
                {b}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '15px', textAlign: 'center' }}>{t('volume_evolution')}</h4>
        {chartData ? (
          <div style={{ height: '200px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('no_training_data_start')}
          </p>
        )}
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('workout_templates')}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          {t('load_routine_desc')}
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--primary-color)', marginBottom: '10px' }}>{t('ai_generate_btn')}</h4>
          <input 
            type="text" 
            placeholder={t('ai_prompt_placeholder')}
            value={workoutPrompt}
            onChange={(e) => setWorkoutPrompt(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <input 
              type="checkbox" 
              id="mesocycleCheck"
              checked={isMesocycle}
              onChange={(e) => setIsMesocycle(e.target.checked)}
              style={{ margin: 0, width: 'auto' }}
            />
            <label htmlFor="mesocycleCheck" style={{ margin: 0, fontSize: '12px' }}>{t('include_mesocycle')}</label>
          </div>
          <button 
            onClick={handleGenerateAIWorkout} 
            disabled={isGeneratingWorkout}
            style={{ width: '100%', fontSize: '14px', padding: '10px', background: 'var(--primary-glow-light)' }}
          >
            {isGeneratingWorkout ? t('generating_workout') : t('create_ideal_workout')}
          </button>
        </div>
        
        {mesocyclePlan && (
          <div style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid orange', padding: '15px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>
            <h4 style={{ color: 'orange', marginBottom: '10px' }}>{t('mesocycle_plan_title')}</h4>
            {mesocyclePlan}
          </div>
        )}

        <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>{t('static_templates')}</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button onClick={() => handleLoadTemplate('PPL')} style={{ flex: 1, padding: '10px', fontSize: '14px', background: 'rgba(255,255,255,0.05)' }}>Push / Pull / Legs</button>
          <button onClick={() => handleLoadTemplate('FullBody')} style={{ flex: 1, padding: '10px', fontSize: '14px', background: 'rgba(255,255,255,0.05)' }}>Full Body</button>
        </div>

        <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>{t('share_import_routine')}</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportRoutine} style={{ flex: 1, padding: '10px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--primary-color)' }}>{t('export_routine')}</button>
          <button onClick={handleImportRoutine} style={{ flex: 1, padding: '10px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--secondary-color)' }}>{t('import_routine')}</button>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('measurements')}</h3>
        
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ margin: 0 }}>{t('unit_system')}:</label>
          <select 
            value={unitSystem} 
            onChange={(e) => saveSettings({ unitSystem: e.target.value })}
            style={{ margin: 0, flex: 1 }}
          >
            <option value="metric">{t('metric_sys')}</option>
            <option value="imperial">{t('imperial_sys')}</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label>{t('age')}</label>
            <input type="number" name="age" value={localMeas.age || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('weight')} ({unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
            <input type="number" name="weight" value={localMeas.weight || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('height')} ({unitSystem === 'metric' ? 'cm' : 'in'})</label>
            <input type="number" name="height" value={localMeas.height || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('arms_cm')}</label>
            <input type="number" name="arms" value={localMeas.arms || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('chest_cm')}</label>
            <input type="number" name="chest" value={localMeas.chest || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('waist_cm')}</label>
            <input type="number" name="waist" value={localMeas.waist || ''} onChange={handleMeasChange} />
          </div>
          <div>
            <label>{t('thighs_cm')}</label>
            <input type="number" name="thighs" value={localMeas.thighs || ''} onChange={handleMeasChange} />
          </div>
        </div>
        <button onClick={handleSaveMeasurements} style={{ marginTop: '15px' }}>{t('save_measurements')}</button>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('default_split')}</h3>
        <p className="text-muted" style={{ fontSize: '14px' }}>{t('define_workout_days')}</p>
        
        {[
          { id: "Monday", label: t('monday') },
          { id: "Tuesday", label: t('tuesday') },
          { id: "Wednesday", label: t('wednesday') },
          { id: "Thursday", label: t('thursday') },
          { id: "Friday", label: t('friday') },
          { id: "Saturday", label: t('saturday') },
          { id: "Sunday", label: t('sunday') }
        ].map(day => (
          <div key={day.id} className="flex-row" style={{ marginBottom: '8px' }}>
            <span style={{ width: '100px', fontSize: '14px', fontWeight: '600' }}>{day.label}</span>
            <input 
              type="text" 
              value={(localSplits[day.id] || []).join(', ')}
              onChange={(e) => {
                const splits = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                setLocalSplits({ ...localSplits, [day.id]: splits });
              }}
              placeholder="Ex: Peito, Tríceps"
              style={{ marginBottom: 0, padding: '10px' }}
            />
          </div>
        ))}
        <button onClick={handleSaveSplits} style={{ marginTop: '16px' }}>{t('save_schedule')}</button>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('muscle_groups')}</h3>
        <div className="flex-row" style={{ marginBottom: '16px' }}>
          <input 
            type="text" 
            value={newGroupName} 
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t('new_muscle_group')} 
            style={{ marginBottom: 0 }}
          />
          <button onClick={handleAddMuscleGroup} style={{ width: 'auto', marginBottom: 0 }}>+</button>
        </div>
        <div>
          {muscleGroups.map(g => (
            <span key={g} className="chip">
              {g}
              <span className="remove" onClick={() => handleRemoveMuscleGroup(g)}>&times;</span>
            </span>
          ))}
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('exercises')}</h3>
        <div className="flex-row" style={{ marginBottom: '16px' }}>
          <select 
            value={newExGroup || (muscleGroups.length > 0 ? muscleGroups[0] : '')} 
            onChange={(e) => setNewExGroup(e.target.value)} 
            style={{ marginBottom: 0, flex: 1 }}
          >
            {muscleGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input 
            type="text" 
            value={newExName} 
            onChange={(e) => setNewExName(e.target.value)}
            placeholder={t('exercise_name')} 
            style={{ marginBottom: 0, flex: 2 }}
          />
          <button onClick={handleAddExercise} style={{ width: 'auto', marginBottom: 0 }}>+</button>
        </div>
        
        {muscleGroups.map(g => {
          const exs = exercisesByGroup[g] || [];
          if (exs.length === 0) return null;
          return (
            <div key={g} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
              <strong style={{ color: 'var(--primary-color)', fontSize: '14px' }}>{g}</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {exs.map(ex => (
                  <div key={ex} className="flex-between" style={{ fontSize: '14px' }}>
                    <span>{ex}</span>
                    <span 
                      className="remove" 
                      style={{ fontSize: '18px' }}
                      onClick={() => handleRemoveExercise(g, ex)}
                    >&times;</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('default_rest')}</h3>
        <label className="text-muted" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          {t('default_rest_desc')}
        </label>
        <div className="flex-row">
          <input 
            type="number" 
            value={localRestTime} 
            onChange={(e) => setLocalRestTime(e.target.value)}
            style={{ marginBottom: 0 }}
            min="0"
          />
          <button 
            onClick={() => { saveSettings({ defaultRestTime: Number(localRestTime) }); alert('Configurações salvas!'); }} 
            style={{ width: 'auto', marginBottom: 0 }}
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>🤖 Inteligência Artificial (Gemini)</h3>
        <label className="text-muted" style={{ fontSize: '14px', display: 'block', marginBottom: '12px' }}>
          Insira sua chave de API do Google Gemini para usar o Gerador de Receitas Inteligente. (A chave fica salva apenas no seu dispositivo).<br/>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline', marginTop: '5px', display: 'inline-block' }}>
            Clique aqui para pegar sua chave API
          </a>
        </label>
        <div className="flex-row">
          <input 
            type="password" 
            placeholder="AIzaSy..."
            value={localApiKey} 
            onChange={(e) => setLocalApiKey(e.target.value)}
            style={{ marginBottom: 0, fontFamily: 'monospace' }}
          />
          <button 
            onClick={() => { saveSettings({ geminiApiKey: localApiKey.trim() }); alert('Chave de API salva!'); }} 
            style={{ width: 'auto', marginBottom: 0 }}
          >
            Salvar
          </button>
        </div>
      </div>

        {deferredPrompt && (
          <button onClick={handleInstallClick} style={{ marginTop: '15px', background: 'var(--primary-color)', color: '#000', fontWeight: 'bold' }}>
            📲 Instalar Aplicativo (PWA)
          </button>
        )}
        
        <button onClick={handleLogout} className="danger-btn" style={{ marginTop: '30px' }}>
          {t('logout')}
        </button>
        
        <button onClick={handleExportData} style={{ marginTop: '15px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--text-color)' }}>
          Exportar Meus Dados (Backup)
        </button>
      </div>
  );
};

export default Profile;
