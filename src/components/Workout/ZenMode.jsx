import React from 'react';
import { useTranslation } from 'react-i18next';

const ZenMode = ({
  zenMode,
  toggleZenMode,
  zenExerciseIdx,
  setZenExerciseIdx,
  todayExercises,
  setsData,
  handleSetChange,
  toggleCompleteSet,
  handleAddSet,
  timerActive,
  timerSeconds
}) => {
  const { t } = useTranslation();

  if (!zenMode) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#000', zIndex: 99999, overflowY: 'auto',
      display: 'flex', justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '600px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button 
            onClick={() => toggleZenMode()} 
            aria-label={t('exit_zen')}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '16px', padding: 0 }}
          >
            {t('exit_zen')}
          </button>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {timerActive ? `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}` : '00:00'}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              disabled={zenExerciseIdx === 0}
              onClick={() => setZenExerciseIdx(prev => prev - 1)}
              aria-label="Exercício anterior"
              style={{ background: 'transparent', border: 'none', color: zenExerciseIdx === 0 ? '#333' : 'var(--primary-color)', fontSize: '24px' }}
            >◀</button>
            <h2 style={{ color: 'white', textAlign: 'center', margin: 0, flex: 1 }}>{todayExercises[zenExerciseIdx]?.name}</h2>
            <button 
              disabled={zenExerciseIdx === todayExercises.length - 1}
              onClick={() => setZenExerciseIdx(prev => prev + 1)}
              aria-label="Próximo exercício"
              style={{ background: 'transparent', border: 'none', color: zenExerciseIdx === todayExercises.length - 1 ? '#333' : 'var(--primary-color)', fontSize: '24px' }}
            >▶</button>
          </div>

          <div style={{ background: '#111', borderRadius: '15px', padding: '15px', marginBottom: '20px' }}>
            {setsData[zenExerciseIdx]?.map((s, setIdx) => (
              <div key={setIdx} className="flex-row" style={{ marginBottom: '15px', opacity: s.completed ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', width: '30px', color: 'white' }}>{setIdx + 1}</span>
                <input 
                  type="number" placeholder="kg" value={s.weight}
                  onChange={(e) => handleSetChange(zenExerciseIdx, setIdx, 'weight', e.target.value)}
                  disabled={s.completed}
                  className="set-input"
                  style={{ fontSize: '18px', padding: '10px' }}
                />
                <input 
                  type="number" placeholder="reps" value={s.reps}
                  onChange={(e) => handleSetChange(zenExerciseIdx, setIdx, 'reps', e.target.value)}
                  disabled={s.completed}
                  className="set-input"
                  style={{ fontSize: '18px', padding: '10px' }}
                />
                <button 
                  onClick={() => toggleCompleteSet(zenExerciseIdx, setIdx)}
                  aria-label={s.completed ? t('done') : t('complete')}
                  style={{ 
                    background: s.completed ? 'var(--primary-color)' : '#222',
                    color: s.completed ? '#000' : 'white',
                    border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {s.completed ? t('done') : t('complete')}
                </button>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => handleAddSet(zenExerciseIdx)}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px dashed #333', padding: '15px', fontSize: '16px' }}
          >
            {t('add_set')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZenMode;
