import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const Home = ({ setActiveTab }) => {
  const { t } = useTranslation();
  const { 
    user, dailySplits, workoutData, streakData, 
    dailyChecklist, saveSettings, accentColor,
    measurements, weightHistory 
  } = useAppContext();

  const [sleepHours, setSleepHours] = useState(7);
  const [fatigueLevel, setFatigueLevel] = useState(5);

  const calculateReadiness = () => {
    let score = 100;
    if (sleepHours < 7) score -= (7 - sleepHours) * 12;
    if (sleepHours > 9) score -= (sleepHours - 9) * 5;
    score -= (fatigueLevel - 1) * 6; 
    return Math.max(0, Math.min(100, Math.round(score)));
  };
  
  const readiness = calculateReadiness();

  const todayStr = new Date().toLocaleString('en-US', { weekday: 'long' });
  const todaysSplit = dailySplits[todayStr] || [];

  const waterProgress = Math.min(100, (dailyChecklist.water / 10) * 100);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '80px', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--primary-color)', marginBottom: '5px' }}>
        {t('hello', { defaultValue: 'Olá' })}, {user?.displayName || user?.email?.split('@')[0]}!
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
        {t('ready_to_train')}
      </p>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>{t('todays_training')}</h3>
        {todaysSplit.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            {todaysSplit.map(mg => (
              <span key={mg} className="chip" style={{ background: 'var(--primary-glow-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}>
                {mg}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{t('rest_day_msg')}</p>
        )}
        
        <button onClick={() => setActiveTab('workout')} style={{ width: '100%', padding: '15px', fontSize: '16px' }}>
          {t('start_workout_btn')}
        </button>
      </div>

      {/* Readiness Score */}
      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>{t('daily_readiness')}</h3>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>{t('sleep_hours')} {sleepHours}h</label>
            <input 
              type="range" min="3" max="12" step="0.5" 
              value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))}
              className="custom-slider"
              style={{ '--slider-color': 'var(--primary-color)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>{t('muscle_fatigue')} {fatigueLevel}</label>
            <input 
              type="range" min="1" max="10" step="1" 
              value={fatigueLevel} onChange={e => setFatigueLevel(Number(e.target.value))}
              className="custom-slider"
              style={{ '--slider-color': 'var(--danger-color)' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('readiness_score')}</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: readiness > 75 ? '#4caf50' : readiness > 50 ? '#ff9800' : '#f44336' }}>
            {readiness}%
          </div>
          <div style={{ fontSize: '13px', marginTop: '5px' }}>
            {readiness > 75 ? t('readiness_great') : readiness > 50 ? t('readiness_good') : t('readiness_bad')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '15px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>{t('hydration')}</h4>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${waterProgress}%`, height: '100%', background: '#00d4ff', transition: 'width 0.3s' }} />
          </div>
          <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {dailyChecklist.water} {t('glasses_of_10')}
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, padding: '15px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>{t('streak_fire')}</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {streakData?.streak || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('days_in_a_row')}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Home;
