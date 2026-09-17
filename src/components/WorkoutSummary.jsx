import React, { useRef } from 'react';

import { useTranslation } from 'react-i18next';

const WorkoutSummary = ({ workoutSummary, setWorkoutSummary, currentDate }) => {
  const { t } = useTranslation();

  if (!workoutSummary) return null;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease', textAlign: 'center', paddingTop: '40px' }}>
      <h2 style={{ marginBottom: '20px' }}>{t('workout_finished')}</h2>
      
      <div 
        className="glass-panel" 
        style={{ 
          width: '300px', 
          height: '400px', 
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,255,136,0.05))',
          border: '1px solid rgba(0,255,136,0.3)',
          borderRadius: '24px',
          position: 'relative'
        }}
      >
        <h3 style={{ fontSize: '28px', color: 'var(--primary-color)', marginBottom: '10px' }}>{workoutSummary.groups}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>{workoutSummary.date}</p>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('sets_caps')}</p>
            <h4 style={{ fontSize: '24px' }}>{workoutSummary.sets}</h4>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('volume_caps')}</p>
            <h4 style={{ fontSize: '24px' }}>{workoutSummary.volume} kg</h4>
          </div>
        </div>
        
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', position: 'absolute', bottom: '20px' }}>
          Gym App Pro 🔥
        </div>
      </div>

      <button 
        onClick={() => setWorkoutSummary(null)}
        style={{ marginTop: '30px', padding: '16px', width: '300px', background: 'var(--primary-color)', color: '#000', border: 'none' }}
      >
        {t('back_home')}
      </button>
    </div>
  );
};

export default WorkoutSummary;
