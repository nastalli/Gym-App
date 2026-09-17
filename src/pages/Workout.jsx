import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase/config';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import WorkoutSummary from '../components/WorkoutSummary';
import PlateCalculator from '../components/PlateCalculator';
import ExerciseCard from '../components/Workout/ExerciseCard';
import AICoachChat from '../components/Workout/AICoachChat';
import ZenMode from '../components/Workout/ZenMode';
import { EXERCISE_LIBRARY } from '../data/exercises';

const Workout = () => {
  const { t, i18n } = useTranslation();
  const { 
    user, dailySplits, exercisesByGroup, workoutData, 
    defaultRestTime, streakData, savedWorkouts, saveSettings,
    timerSeconds, setTimerSeconds, timerActive, setTimerActive,
    geminiApiKey
  } = useAppContext();
  
  const [currentDay, setCurrentDay] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [workoutActive, setWorkoutActive] = useState(false);
  
  // What to train today
  const [todayGroups, setTodayGroups] = useState([]);
  const [todayExercises, setTodayExercises] = useState([]);
  
  const [setsData, setSetsData] = useState({});
  const [saving, setSaving] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  
  // Library Modal State
  const [infoModal, setInfoModal] = useState({ open: false, exercise: null });

  // Zen Mode State
  const [zenMode, setZenMode] = useState(false);
  const [zenExerciseIdx, setZenExerciseIdx] = useState(0);

  // AI Coach Chat State
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayIndex = now.getDay();
      
      setCurrentDay(t(dayKeys[dayIndex]));
      setCurrentDate(now.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR'));
      setCurrentTime(now.toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'pt-BR', {hour: '2-digit', minute:'2-digit'}));
      
      if (!workoutActive) {
        const daysEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayEN = daysEN[dayIndex];
        const groups = dailySplits[dayEN] || [];
        setTodayGroups(groups);
        
        let allExs = [];
        groups.forEach(g => {
          if(exercisesByGroup[g]) allExs = allExs.concat(exercisesByGroup[g]);
        });
        setTodayExercises(allExs);
      }
    };
    
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [dailySplits, exercisesByGroup, workoutActive, t, i18n.language]);

  const handleStartWorkout = () => {
    const daysEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayEN = daysEN[new Date().getDay()];
    const savedForToday = savedWorkouts && savedWorkouts[dayEN];

    let exercisesToLoad = todayExercises.map(ex => ({ name: ex, variation: '' }));

    if (savedForToday && savedForToday.length > 0) {
      if (window.confirm(t('repeat_workout_prompt'))) {
        exercisesToLoad = savedForToday;
      }
    }

    setWorkoutActive(true);
    const initialData = {};
    const loadedExs = [];
    
    exercisesToLoad.forEach((exObj, idx) => {
      loadedExs.push(exObj);
      initialData[idx] = [{ weight: '', reps: '', type: 'normal', rpe: '', completed: false }];
    });
    
    setTodayExercises(loadedExs);
    setSetsData(initialData);
  };

  const getLastWorkoutStr = (exerciseName) => {
    const history = workoutData.filter(w => w.exercise === exerciseName).sort((a,b) => b.timestamp - a.timestamp);
    if (history.length > 0) {
      const last = history[0];
      return `${last.weight}kg x ${last.reps} reps`;
    }
    return t('first_time');
  };

  const handleAddSet = (exIdx) => {
    setSetsData({
      ...setsData,
      [exIdx]: [...setsData[exIdx], { weight: '', reps: '', type: 'normal', rpe: '', completed: false }]
    });
  };

  const handleSetChange = (exIdx, setIdx, field, value) => {
    const newExSets = [...setsData[exIdx]];
    newExSets[setIdx][field] = value;
    setSetsData({ ...setsData, [exIdx]: newExSets });
  };

  const toggleCompleteSet = (exIdx, setIdx) => {
    const newExSets = [...setsData[exIdx]];
    const isCompleted = !newExSets[setIdx].completed;
    newExSets[setIdx].completed = isCompleted;
    setSetsData({ ...setsData, [exIdx]: newExSets });

    if (isCompleted) {
      if ('vibrate' in navigator) navigator.vibrate([100]);
      setTimerSeconds(defaultRestTime || 90);
      setTimerActive(true);
    }
  };

  const handleGenerateWarmup = (exIdx, exName) => {
    const history = workoutData.filter(w => w.exercise === exName).sort((a,b) => b.timestamp - a.timestamp);
    let maxWeight = 40; 
    if (history.length > 0) {
      maxWeight = Math.max(...history.map(h => Number(h.weight) || 0));
    }
    if (maxWeight === 0) maxWeight = 40;
    
    const warmups = [
      { weight: Math.round((maxWeight * 0.4) / 2.5) * 2.5, reps: 15, type: 'warmup', rpe: '', completed: false },
      { weight: Math.round((maxWeight * 0.6) / 2.5) * 2.5, reps: 8, type: 'warmup', rpe: '', completed: false },
      { weight: Math.round((maxWeight * 0.8) / 2.5) * 2.5, reps: 3, type: 'warmup', rpe: '', completed: false },
    ];
    
    setSetsData({
      ...setsData,
      [exIdx]: [...warmups, ...setsData[exIdx]]
    });
  };

  const toggleZenMode = async (exIdx = 0) => {
    if (!zenMode) {
      try {
        if ('wakeLock' in navigator) {
          window.wakeLockRef = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock denied');
      }
      setZenExerciseIdx(exIdx);
      setZenMode(true);
    } else {
      if (window.wakeLockRef) {
        window.wakeLockRef.release();
        window.wakeLockRef = null;
      }
      setZenMode(false);
    }
  };

  const handleFinishWorkout = async () => {
    if (!user) return alert(t('need_login'));
    
    let setsToSave = [];
    const daysEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayEN = daysEN[new Date().getDay()];

    let totalVolume = 0;
    let completedSetsCount = 0;

    const exercisesToSaveTemplate = [];

    todayExercises.forEach((ex, exIdx) => {
      exercisesToSaveTemplate.push({ name: ex.name, variation: ex.variation || '' });
      
      const exSets = setsData[exIdx] || [];
      exSets.forEach(s => {
        if (s.weight && s.reps && s.completed) {
          totalVolume += Number(s.weight) * Number(s.reps);
          completedSetsCount++;
          setsToSave.push({ 
            timestamp: Date.now(), 
            day: dayEN, 
            exercise: ex.name, 
            variation: ex.variation || '',
            weight: Number(s.weight), 
            reps: Number(s.reps),
            type: s.type,
            rpe: s.rpe ? Number(s.rpe) : null
          });
        }
      });
    });
    
    if (setsToSave.length === 0) {
      alert(t('finish_workout_warn'));
      return;
    }
    
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (let setObj of setsToSave) {
        const setRef = doc(collection(db, 'users', user.uid, 'sets'));
        batch.set(setRef, setObj);
      }
      await batch.commit();
      
      setWorkoutSummary({
        groups: todayGroups.join(' & '),
        volume: totalVolume,
        sets: completedSetsCount,
        date: currentDate
      });

      const todayStr = new Date().toLocaleDateString('en-CA');
      const newSettings = {
        savedWorkouts: {
          ...(savedWorkouts || {}),
          [dayEN]: exercisesToSaveTemplate
        }
      };
      
      if (streakData?.lastWorkoutDate !== todayStr) {
        newSettings.streakData = { 
          streak: (streakData?.streak || 0) + 1, 
          lastWorkoutDate: todayStr 
        };
      }
      
      saveSettings(newSettings);

      setWorkoutActive(false);
      setTimerActive(false);
    } catch (err) {
      console.error(err);
      alert(t('error_saving_workout'));
    } finally {
      setSaving(false);
    }
  };

  if (workoutSummary) {
    return <WorkoutSummary workoutSummary={workoutSummary} setWorkoutSummary={setWorkoutSummary} currentDate={currentDate} />;
  }

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '8px', textAlign: 'left', margin: 0 }}>{currentDay || t('loading')}</h2>
            <div className="flex-row text-muted" style={{ fontSize: '14px', gap: '10px', marginTop: '5px' }}>
              <span>{currentDate}</span>
              <span>{currentTime}</span>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '8px 12px', 
            borderRadius: '20px',
            opacity: streakData?.streak > 0 && (streakData?.lastWorkoutDate === new Date().toLocaleDateString('en-CA') || todayGroups.length === 0) ? 1 : 0.4
          }}>
            <span style={{ fontSize: '20px', marginRight: '5px' }}>🔥</span>
            <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'white' }}>{streakData?.streak || 0}</span>
          </div>
        </div>
      </div>

      {!workoutActive ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }} className="glass-panel">
          <p className="text-muted" style={{ fontSize: '16px', marginBottom: '10px' }}>{t('todays_workout')}</p>
          
          {todayGroups.length > 0 ? (
            <div>
              <h2 style={{ color: 'var(--primary-color)', fontSize: '24px', marginBottom: '15px' }}>
                {todayGroups.join(' & ')}
              </h2>
              {todayExercises.length > 0 ? (
                <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px', color: 'var(--text-muted)', display: 'inline-block', textAlign: 'left' }}>
                  {todayExercises.map((ex, i) => (
                    <li key={i}>{typeof ex === 'string' ? ex : ex.name}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)' }}>
                  ⚠️ {t('no_exercises_today')}
                </p>
              )}
            </div>
          ) : (
            <h2 style={{ fontSize: '24px', marginBottom: '30px' }}>{t('rest_day')}</h2>
          )}
          
          <button 
            onClick={handleStartWorkout}
            style={{ padding: '20px', fontSize: '18px', borderRadius: '30px' }}
            disabled={todayExercises.length === 0 && todayGroups.length > 0}
          >
            {t('start_workout')}
          </button>
        </div>
      ) : (
        <div>
          {todayExercises.length === 0 ? (
             <p style={{ textAlign: 'center' }} className="text-muted">{t('no_exercises_today')}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <PlateCalculator />
                <button 
                  onClick={() => toggleZenMode(0)}
                  aria-label="Ativar Modo Zen"
                  style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--primary-color)', color: '#000', fontSize: '14px', border: 'none', fontWeight: 'bold' }}
                >
                  🧘 Zen Mode
                </button>
              </div>
              {todayExercises.map((ex, exIdx) => (
                <ExerciseCard 
                  key={exIdx}
                  ex={ex}
                  exIdx={exIdx}
                  setsData={setsData}
                  todayExercises={todayExercises}
                  setTodayExercises={setTodayExercises}
                  getLastWorkoutStr={getLastWorkoutStr}
                  handleSetChange={handleSetChange}
                  toggleCompleteSet={toggleCompleteSet}
                  handleAddSet={handleAddSet}
                  handleGenerateWarmup={handleGenerateWarmup}
                  setInfoModal={setInfoModal}
                  t={t}
                />
              ))}
            </>
          )}
          
          <button 
            onClick={handleFinishWorkout} 
            disabled={saving}
            style={{ marginTop: '20px', padding: '18px', width: '100%' }}
          >
            {saving ? t('saving') : t('finish_workout_button')}
          </button>
        </div>
      )}

      {infoModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setInfoModal({ open: false, exercise: null })}
              aria-label="Fechar informações"
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '20px' }}
            >
              ×
            </button>
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '15px' }}>{infoModal.exercise}</h3>
            
            {EXERCISE_LIBRARY[infoModal.exercise] ? (
              <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
                <p><strong>{t('primary_muscle')}</strong> {EXERCISE_LIBRARY[infoModal.exercise].primary}</p>
                <p><strong>{t('secondary_muscles')}</strong> {EXERCISE_LIBRARY[infoModal.exercise].secondary}</p>
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>{t('exercise_tip')}</strong> {EXERCISE_LIBRARY[infoModal.exercise].tip}</p>
                </div>
                <a 
                  href={`https://www.youtube.com/results?search_query=how+to+do+${encodeURIComponent(infoModal.exercise)}+exercise`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'block', marginTop: '15px', padding: '10px', background: '#ff0000', color: 'white', textAlign: 'center', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  {t('watch_tutorial')}
                </a>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>{t('no_anatomical_details')}</p>
                <a 
                  href={`https://www.youtube.com/results?search_query=how+to+do+${encodeURIComponent(infoModal.exercise)}+exercise`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'block', marginTop: '15px', padding: '10px', background: '#ff0000', color: 'white', textAlign: 'center', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  {t('search_tutorial')}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <ZenMode 
        zenMode={zenMode}
        toggleZenMode={toggleZenMode}
        zenExerciseIdx={zenExerciseIdx}
        setZenExerciseIdx={setZenExerciseIdx}
        todayExercises={todayExercises}
        setsData={setsData}
        handleSetChange={handleSetChange}
        toggleCompleteSet={toggleCompleteSet}
        handleAddSet={handleAddSet}
        timerActive={timerActive}
        timerSeconds={timerSeconds}
      />

      <AICoachChat 
        chatOpen={chatOpen} 
        setChatOpen={setChatOpen} 
        todayGroups={todayGroups} 
        geminiApiKey={geminiApiKey} 
      />
    </div>
  );
};

export default Workout;
