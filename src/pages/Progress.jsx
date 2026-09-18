import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { hexToRgba } from '../utils/colorUtils';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  scales: {
    y: { 
      beginAtZero: false,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#8a8d98' }
    },
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#8a8d98' }
    }
  },
  plugins: {
    legend: {
      labels: { color: '#ffffff' }
    }
  }
};


const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;


const Progress = () => {
  const { t } = useTranslation();
  const { workoutData, weightHistory, measurementHistory, accentColor, dailyChecklist, muscleGroups, exercisesByGroup } = useAppContext();
  const themeColor = accentColor || '#00ff88';
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");

  
  // Progress Chart State
  const allExercises = useMemo(() => {
    return Array.from(new Set(workoutData.map(s => s.exercise))).sort();
  }, [workoutData]);
  
  const [selectedEx, setSelectedEx] = useState(allExercises[0] || '');
  const [progressRange, setProgressRange] = useState('all');
  
  // Weight Chart State
  const [weightRange, setWeightRange] = useState('all');

  const progressChartData = useMemo(() => {
    if (!selectedEx) return null;
    
    let exData = workoutData.filter(s => s.exercise === selectedEx).sort((a, b) => a.id - b.id);
    
    if (progressRange !== 'all') {
      const days = parseInt(progressRange);
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      exData = exData.filter(s => s.id >= cutoff);
    }
    
    return {
      labels: exData.map(s => new Date(s.id).toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: t('weight_kg'),
          data: exData.map(s => s.weight),
          borderColor: themeColor,
          backgroundColor: themeColor,
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t('estimated_1rm'),
          data: exData.map(s => Math.round(Number(s.weight) * (1 + Number(s.reps) / 30))),
          borderColor: '#ff9800',
          backgroundColor: '#ff9800',
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [workoutData, selectedEx, progressRange, themeColor, t]);

  const weightChartData = useMemo(() => {
    let whData = [...weightHistory].sort((a, b) => a.timestamp - b.timestamp);
    
    if (weightRange !== 'all') {
      const days = parseInt(weightRange);
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      whData = whData.filter(s => s.timestamp >= cutoff);
    }
    
    return {
      labels: whData.map(s => new Date(s.timestamp).toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: t('body_weight'),
          data: whData.map(s => s.weight),
          borderColor: '#ff4c4c',
          backgroundColor: '#ff4c4c',
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [weightHistory, weightRange]);

  const measurementChartData = useMemo(() => {
    let mhData = [...(measurementHistory || [])].sort((a, b) => a.timestamp - b.timestamp);
    
    if (weightRange !== 'all') {
      const days = parseInt(weightRange);
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      mhData = mhData.filter(s => s.timestamp >= cutoff);
    }
    
    return {
      labels: mhData.map(s => new Date(s.timestamp).toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: t('arms_cm'),
          data: mhData.map(s => s.arms || null),
          borderColor: '#00d4ff', backgroundColor: '#00d4ff',
          tension: 0.2, pointRadius: 4, pointHoverRadius: 6,
          spanGaps: true
        },
        {
          label: t('chest_cm'),
          data: mhData.map(s => s.chest || null),
          borderColor: '#ff9800', backgroundColor: '#ff9800',
          tension: 0.2, pointRadius: 4, pointHoverRadius: 6,
          spanGaps: true
        },
        {
          label: t('waist_cm'),
          data: mhData.map(s => s.waist || null),
          borderColor: '#4caf50', backgroundColor: '#4caf50',
          tension: 0.2, pointRadius: 4, pointHoverRadius: 6,
          spanGaps: true
        },
        {
          label: t('thighs_cm'),
          data: mhData.map(s => s.thighs || null),
          borderColor: '#9c27b0', backgroundColor: '#9c27b0',
          tension: 0.2, pointRadius: 4, pointHoverRadius: 6,
          spanGaps: true
        }
      ]
    };
  }, [measurementHistory, weightRange]);

  const radarData = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return null;
    
    // Reverse map: exercise -> group
    const exToGroup = {};
    Object.keys(exercisesByGroup).forEach(group => {
      exercisesByGroup[group].forEach(ex => {
        exToGroup[ex] = group;
      });
    });

    const volumeByGroup = {};
    muscleGroups.forEach(g => volumeByGroup[g] = 0);

    // Calculate volume
    workoutData.forEach(w => {
      const group = exToGroup[w.exercise];
      if (group && volumeByGroup[group] !== undefined) {
        if (w.weight && w.reps) {
          volumeByGroup[group] += (Number(w.weight) * Number(w.reps));
        }
      }
    });

    return {
      labels: muscleGroups,
      datasets: [
        {
          label: t('volume_kg'),
          data: muscleGroups.map(g => volumeByGroup[g]),
          backgroundColor: hexToRgba(themeColor, 0.4),
          borderColor: themeColor,
          borderWidth: 2,
          pointBackgroundColor: '#ffffff',
          pointHoverBackgroundColor: themeColor,
        },
      ],
    };
  }, [workoutData, t, themeColor, muscleGroups, exercisesByGroup]);

  const monthlyVolumeChartData = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return null;

    const monthlyVolume = {};
    
    workoutData.forEach(s => {
      if (s.weight && s.reps) {
        const date = new Date(s.timestamp || s.id);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        const vol = Number(s.weight) * Number(s.reps);
        
        if (!monthlyVolume[monthYear]) {
          monthlyVolume[monthYear] = 0;
        }
        monthlyVolume[monthYear] += vol;
      }
    });

    const labels = Object.keys(monthlyVolume).sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return new Date(yA, mA - 1) - new Date(yB, mB - 1);
    });
    
    const data = labels.map(l => monthlyVolume[l]);

    if (labels.length === 0) return null;

    return {
      labels,
      datasets: [
        {
          label: t('monthly_volume'),
          data,
          backgroundColor: hexToRgba(themeColor, 0.6),
          borderColor: themeColor,
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };
  }, [workoutData, themeColor]);

  const handleAiAnalysis = async () => {
    if (!GEMINI_API_KEY) {
      alert(t('api_key_missing'));
      return;
    }
    setIsAnalyzing(true);
    try {
      const promptLanguage = i18n.language.startsWith('en') ? 'English' : 'Português';
      const prompt = `Você é um treinador de fisiculturismo de elite. Analise os seguintes dados e forneça 2 ou 3 parágrafos curtos com insights de elite (ex: o que melhorou, onde está a estagnação, se o volume de uma área está baixo, se a dieta parece alinhada com o ganho de força). Seja direto, encorajador e tático. Use emojis. RESPONDA EM: ${promptLanguage}\n\nPeso corporal histórico: ${JSON.stringify(weightHistory.slice(-10))}\nMedidas (braço, peito, cintura, coxas): ${JSON.stringify(measurementHistory?.slice(-5) || [])}\nÚltimos 20 treinos (exercício, peso, reps, rpe): ${JSON.stringify(workoutData.slice(-20).map(w => ({ex: w.exercise, w: w.weight, r: w.reps, rpe: w.rpe})))}\nRotina Atual (Checklist diário de água/calorias): ${JSON.stringify(dailyChecklist)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        setAiAnalysis(data.candidates[0].content.parts[0].text);
      } else {
        setAiAnalysis(t('analysis_failed'));
      }
    } catch (error) {
      console.error(error);
      setAiAnalysis(t('connection_error'));
    }
    setIsAnalyzing(false);
  };

  const calculateStrengthStandard = (exercise, weight, reps, bodyweight) => {
    const rm = Number(weight) * (1 + Number(reps)/30);
    let ratio = rm / bodyweight;
    let standard = t('beginner');
    
    const exLower = exercise.toLowerCase();
    if (exLower.includes("supino") || exLower.includes("bench")) {
       if (ratio >= 1.9) standard = t('elite');
       else if (ratio >= 1.5) standard = t('advanced');
       else if (ratio >= 1.1) standard = t('intermediate');
       else if (ratio >= 0.7) standard = t('beginner');
       else standard = t('beginner');
    } else if (exLower.includes("agachamento") || exLower.includes("squat")) {
       if (ratio >= 2.4) standard = t('elite');
       else if (ratio >= 1.9) standard = t('advanced');
       else if (ratio >= 1.4) standard = t('intermediate');
       else if (ratio >= 1.0) standard = t('beginner');
       else standard = t('beginner');
    } else if (exLower.includes("terra") || exLower.includes("deadlift")) {
       if (ratio >= 2.8) standard = t('elite');
       else if (ratio >= 2.3) standard = t('advanced');
       else if (ratio >= 1.8) standard = t('intermediate');
       else if (ratio >= 1.2) standard = t('beginner');
       else standard = t('beginner');
    } else {
       return null; 
    }
    return { rm: Math.round(rm), ratio: ratio.toFixed(2), standard };
  };

  const currentBW = weightHistory.length > 0 ? Number(weightHistory[weightHistory.length - 1].weight) : 70;
  const lastWorkoutEx = workoutData.filter(s => s.exercise === selectedEx).slice(-1)[0];
  const strengthData = lastWorkoutEx ? calculateStrengthStandard(selectedEx, lastWorkoutEx.weight, lastWorkoutEx.reps, currentBW) : null;

  const radarOptions = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: '#ffffff', font: { size: 12 } },
        ticks: { display: false }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  const exStats = useMemo(() => {
    if (!selectedEx) return null;
    let maxWeight = 0;
    let max1RM = 0;
    
    workoutData.filter(s => s.exercise === selectedEx).forEach(s => {
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      if (w > maxWeight) maxWeight = w;
      
      const oneRM = w * (1 + r / 30);
      if (oneRM > max1RM) max1RM = oneRM;
    });

    return { maxWeight, max1RM: Math.round(max1RM) };
  }, [workoutData, selectedEx]);

  return (
    <div className="page-container fade-in">
      <h2 className="page-title">{t('progress')}</h2>
      
      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>{t('ai_analysis')}</h3>
          <button 
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="ai-coach-btn"
            style={{ padding: '8px 15px', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isAnalyzing ? t('loading') : t('generate_analysis')}
          </button>
        </div>
        {aiAnalysis && (
          <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6', color: '#ccc', whiteSpace: 'pre-wrap' }}>
            {aiAnalysis}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('load_evolution')}</h3>
        
        <div className="flex-row" style={{ marginBottom: '16px' }}>
          <select 
            value={selectedEx} 
            onChange={e => setSelectedEx(e.target.value)}
            style={{ marginBottom: 0, flex: 1 }}
          >
            {allExercises.length === 0 && <option value="">{t('no_history')}</option>}
            {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
          
          <select 
            value={progressRange}
            onChange={e => setProgressRange(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          >
            <option value="all">{t('all_history')}</option>
            <option value="7">{t('days_7')}</option>
            <option value="30">{t('days_30')}</option>
            <option value="90">{t('months_3')}</option>
            <option value="365">{t('year_1')}</option>
          </select>
        </div>

        {exStats && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('max_weight_pr')}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{exStats.maxWeight} kg</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('estimated_1rm')}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{exStats.max1RM} kg</div>
            </div>
          </div>
        )}

        {strengthData && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('estimated_1rm')}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{strengthData.rm} kg</div>
            </div>
            <div style={{ flex: 1, minWidth: '120px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('relative_strength')}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{strengthData.ratio}x</div>
            </div>
            <div style={{ flex: 1, minWidth: '120px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', border: `1px solid ${strengthData.standard === t('elite') ? '#ff9800' : strengthData.standard === t('advanced') ? '#9c27b0' : strengthData.standard === t('intermediate') ? '#00d4ff' : '#4caf50'}` }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('strength_standard_label')}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: strengthData.standard === t('elite') ? '#ff9800' : '#fff' }}>{strengthData.standard}</div>
            </div>
          </div>
        )}
        
        {progressChartData && selectedEx ? (
          <div style={{ height: '300px' }}>
            <Line data={progressChartData} options={chartOptions} />
          </div>
        ) : (
          <p className="text-muted" style={{ textAlign: 'center' }}>{t('do_first_workout')}</p>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('progressive_overload')}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          {t('overload_desc')}
        </p>
        {monthlyVolumeChartData ? (
          <div style={{ height: '300px' }}>
            <Bar 
              data={monthlyVolumeChartData} 
              options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: { ...chartOptions.scales.y, beginAtZero: true }
                }
              }} 
            />
          </div>
        ) : (
          <p className="text-muted" style={{ textAlign: 'center' }}>{t('no_volume_data')}</p>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('body_evolution')}</h3>
        
        <div className="flex-row" style={{ marginBottom: '16px' }}>
          <select 
            value={weightRange}
            onChange={e => setWeightRange(e.target.value)}
            style={{ marginBottom: 0, width: '100%' }}
          >
            <option value="all">{t('all_history')}</option>
            <option value="30">{t('days_30')}</option>
            <option value="90">{t('months_3')}</option>
            <option value="365">{t('year_1')}</option>
          </select>
        </div>
        
        {weightChartData.labels.length > 0 ? (
          <div style={{ height: '300px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Peso (kg)</h4>
            <Line data={weightChartData} options={chartOptions} />
          </div>
        ) : (
          <p className="text-muted" style={{ textAlign: 'center' }}>{t('add_weight_profile')}</p>
        )}

        {measurementChartData && measurementChartData.labels.length > 0 && (
          <div style={{ height: '300px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Medidas (cm)</h4>
            <Line data={measurementChartData} options={chartOptions} />
          </div>
        )}
      </div>
      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>{t('volume_by_muscle')}</h3>
        {radarData ? (
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        ) : (
          <p className="text-muted" style={{ textAlign: 'center' }}>{t('do_first_workout')}</p>
        )}
      </div>

    </div>
  );
};

export default Progress;
