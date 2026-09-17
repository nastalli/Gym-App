import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [measurements, setMeasurements] = useState({ age: '', weight: '', height: '', arms: '', chest: '', waist: '', thighs: '' });
  const [weightHistory, setWeightHistory] = useState([]);
  const [measurementHistory, setMeasurementHistory] = useState([]);
  const [defaultRestTime, setDefaultRestTime] = useState(90);
  const [muscleGroups, setMuscleGroups] = useState(["Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps"]);
  const [exercisesByGroup, setExercisesByGroup] = useState({
    "Peito": ["Supino Reto", "Crucifixo"],
    "Costas": ["Puxada Frente", "Remada Curvada"],
    "Pernas": ["Agachamento Livre", "Leg Press"],
    "Ombros": ["Desenvolvimento", "Elevação Lateral"],
    "Bíceps": ["Rosca Direta"],
    "Tríceps": ["Tríceps Polia"]
  });
  const [dailySplits, setDailySplits] = useState({
    "Monday": ["Peito", "Tríceps"],
    "Tuesday": ["Costas", "Bíceps"],
    "Wednesday": ["Pernas"],
    "Thursday": ["Ombros"],
    "Friday": ["Peito", "Costas"],
    "Saturday": [],
    "Sunday": []
  });
  
  const [diet, setDiet] = useState({
    goal: 'gain',
    gender: 'M',
    useCustom: false,
    calories: 2500,
    protein: 150,
    carbs: 250,
    fat: 80
  });

  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'
  const [savedWorkouts, setSavedWorkouts] = useState({}); // e.g. { "Monday": [{name: "Supino", variation: ""}] }

  const [streakData, setStreakData] = useState({
    streak: 0,
    lastWorkoutDate: null
  });
  
  const [dailyChecklist, setDailyChecklist] = useState({
    date: null,
    water: 0,
    meals: false
  });

  const [accentColor, setAccentColor] = useState('#00ff88');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  
  const [workoutData, setWorkoutData] = useState([]);

  // Global Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {
      console.log('Audio Context error:', e);
    }
  };

  useEffect(() => {
    let interval;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerActive && timerSeconds === 0) {
      setTimerActive(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      playBeep();
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    let unsubSets = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (unsubSets) {
        unsubSets();
        unsubSets = null;
      }
      if (currentUser) {
        // Load Settings
        const settingsSnap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'profile'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.muscleGroups) setMuscleGroups(data.muscleGroups);
          if (data.exercisesByGroup) setExercisesByGroup(data.exercisesByGroup);
          if (data.dailySplits) setDailySplits(data.dailySplits);
          if (data.measurements) setMeasurements({ 
            age: data.measurements.age || '', 
            weight: data.measurements.weight || '', 
            height: data.measurements.height || '',
            arms: data.measurements.arms || '',
            chest: data.measurements.chest || '',
            waist: data.measurements.waist || '',
            thighs: data.measurements.thighs || ''
          });
          if (data.weightHistory) setWeightHistory(data.weightHistory);
          if (data.measurementHistory) setMeasurementHistory(data.measurementHistory);
          if (data.defaultRestTime !== undefined) setDefaultRestTime(data.defaultRestTime);
          if (data.diet) setDiet(data.diet);
          if (data.unitSystem) setUnitSystem(data.unitSystem);
          if (data.savedWorkouts) setSavedWorkouts(data.savedWorkouts);
          if (data.accentColor) setAccentColor(data.accentColor);
          if (data.geminiApiKey) setGeminiApiKey(data.geminiApiKey);
          
          if (data.dailyChecklist) {
            const todayStr = new Date().toLocaleDateString('en-CA');
            if (data.dailyChecklist.date !== todayStr) {
               // Reset checklist for new day
               setDailyChecklist({ date: todayStr, water: 0, meals: false });
            } else {
               setDailyChecklist(data.dailyChecklist);
            }
          } else {
            setDailyChecklist({ date: new Date().toLocaleDateString('en-CA'), water: 0, meals: false });
          }
          
          if (data.streakData) {
             const checkedStreak = checkStreak(data.streakData.streak, data.streakData.lastWorkoutDate, data.dailySplits || dailySplits);
             setStreakData(checkedStreak);
             if (checkedStreak.streak !== data.streakData.streak) {
                 // Update firebase if streak was broken
                 setDoc(doc(db, 'users', currentUser.uid, 'settings', 'profile'), { streakData: checkedStreak }, { merge: true });
             }
          }
        }
        
        // Listen to Sets (limited for performance)
        const q = query(collection(db, 'users', currentUser.uid, 'sets'), orderBy('timestamp', 'desc'), limit(500));
        unsubSets = onSnapshot(q, (snapshot) => {
            let dataArr = [];
            snapshot.forEach(docSnap => {
                let data = docSnap.data();
                dataArr.push({ dbId: docSnap.id, id: data.timestamp, ...data });
            });
            setWorkoutData(dataArr);
        });
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSets) unsubSets();
    };
  }, []);

  const checkStreak = (currentStreak, lastDateStr, splits) => {
    if (!lastDateStr || currentStreak === 0) return { streak: 0, lastWorkoutDate: null };
    
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (lastDateStr === todayStr) return { streak: currentStreak, lastWorkoutDate: lastDateStr };

    const daysEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    let lastDate = new Date(lastDateStr + 'T00:00:00');
    let todayDate = new Date(todayStr + 'T00:00:00');
    
    let isBroken = false;
    let currentDate = new Date(lastDate);
    currentDate.setDate(currentDate.getDate() + 1);
    
    while (currentDate < todayDate) {
      const dayName = daysEN[currentDate.getDay()];
      const daySplit = splits[dayName] || [];
      if (daySplit.length > 0) {
        // Was a workout day and didn't workout
        isBroken = true;
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (isBroken) {
      return { streak: 0, lastWorkoutDate: null };
    }
    
    return { streak: currentStreak, lastWorkoutDate: lastDateStr };
  };

  const saveSettings = async (newState) => {
    if (!user) return;
    
    // Merge new state with current state for saving
    const toSave = {
      muscleGroups: newState.muscleGroups || muscleGroups,
      exercisesByGroup: newState.exercisesByGroup || exercisesByGroup,
      dailySplits: newState.dailySplits || dailySplits,
      measurements: newState.measurements || measurements,
      weightHistory: newState.weightHistory || weightHistory,
      defaultRestTime: newState.defaultRestTime !== undefined ? newState.defaultRestTime : defaultRestTime,
      diet: newState.diet || diet,
      unitSystem: newState.unitSystem || unitSystem,
      savedWorkouts: newState.savedWorkouts || savedWorkouts,
      streakData: newState.streakData || streakData,
      dailyChecklist: newState.dailyChecklist || dailyChecklist,
      accentColor: newState.accentColor || accentColor,
      geminiApiKey: newState.geminiApiKey !== undefined ? newState.geminiApiKey : geminiApiKey
    };
    
    // Update local state proactively
    if (newState.muscleGroups) setMuscleGroups(newState.muscleGroups);
    if (newState.exercisesByGroup) setExercisesByGroup(newState.exercisesByGroup);
    if (newState.dailySplits) setDailySplits(newState.dailySplits);
    if (newState.measurements) setMeasurements(newState.measurements);
    if (newState.weightHistory) setWeightHistory(newState.weightHistory);
    if (newState.defaultRestTime !== undefined) setDefaultRestTime(newState.defaultRestTime);
    if (newState.diet) setDiet(newState.diet);
    if (newState.unitSystem) setUnitSystem(newState.unitSystem);
    if (newState.savedWorkouts) setSavedWorkouts(newState.savedWorkouts);
    if (newState.streakData) setStreakData(newState.streakData);
    if (newState.dailyChecklist) setDailyChecklist(newState.dailyChecklist);
    if (newState.accentColor) setAccentColor(newState.accentColor);
    if (newState.geminiApiKey !== undefined) setGeminiApiKey(newState.geminiApiKey);

    await setDoc(doc(db, 'users', user.uid, 'settings', 'profile'), toSave, { merge: true });
  };

  const value = {
    user,
    loading,
    measurements,
    weightHistory,
    measurementHistory,
    muscleGroups, exercisesByGroup, dailySplits, 
    diet,
    unitSystem, savedWorkouts,
    workoutData, defaultRestTime,
    streakData, dailyChecklist,
    accentColor, geminiApiKey,
    timerSeconds, setTimerSeconds,
    timerActive, setTimerActive,
    saveSettings
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
