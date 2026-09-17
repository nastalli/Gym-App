import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const PlateCalculator = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState(20);

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];

  const calculatePlates = () => {
    let remaining = Number(targetWeight) - Number(barWeight);
    if (isNaN(remaining) || remaining <= 0) return [];

    const sideWeight = remaining / 2;
    let currentSideWeight = sideWeight;
    const platesUsed = [];

    for (const plate of availablePlates) {
      while (currentSideWeight >= plate) {
        platesUsed.push(plate);
        currentSideWeight -= plate;
        currentSideWeight = Math.round(currentSideWeight * 100) / 100; // fix float precision
      }
    }

    return platesUsed;
  };

  const plates = calculatePlates();

  return (
    <div style={{ marginBottom: '16px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'var(--surface-color)', 
          border: '1px solid var(--border-color)',
          color: 'var(--primary-color)',
          boxShadow: 'none'
        }}
      >
        {isOpen ? t('close_plate_calculator') : t('plate_calculator')}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="glass-panel" style={{ marginTop: '10px' }}>
              <div className="flex-row">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('total_weight')}</label>
                  <input 
                    type="number" 
                    value={targetWeight} 
                    onChange={e => setTargetWeight(e.target.value)} 
                    placeholder="Ex: 100"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('bar_weight')}</label>
                  <input 
                    type="number" 
                    value={barWeight} 
                    onChange={e => setBarWeight(e.target.value)} 
                  />
                </div>
              </div>

              {Number(targetWeight) > 0 && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>{t('plates_per_side')}</strong>
                  </p>
                  {plates.length > 0 ? (
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {plates.map((p, i) => (
                        <div key={i} style={{
                          background: 'var(--primary-color)',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '10px 8px',
                          borderRadius: '5px',
                          border: '2px solid rgba(0,0,0,0.2)'
                        }}>
                          {p}kg
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--danger-color)', fontSize: '14px' }}>{t('invalid_weight')}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlateCalculator;
