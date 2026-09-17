import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

const TimerWidget = () => {
  const { t } = useTranslation();
  const { timerSeconds, setTimerSeconds, timerActive, setTimerActive } = useAppContext();

  if (!timerActive) return null;

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--primary-glow-light, rgba(0, 255, 136, 0.15))',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid var(--primary-color)',
      borderRadius: '30px',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
        {formatTimer(timerSeconds)}
      </span>
      <button 
        onClick={() => setTimerActive(false)}
        style={{ 
          background: 'transparent', 
          color: 'var(--text-muted)', 
          border: 'none',
          padding: '5px',
          fontSize: '12px',
          boxShadow: 'none',
          marginTop: '5px'
        }}
      >
        {t('skip')}
      </button>
    </div>
  );
};

export default TimerWidget;
