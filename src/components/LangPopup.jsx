import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const LangPopup = () => {
  const { t, i18n } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const [detectedLang, setDetectedLang] = useState('pt');

  useEffect(() => {
    const hasChosenLang = localStorage.getItem('gym_lang_chosen');
    if (!hasChosenLang) {
      const browserLang = navigator.language || navigator.userLanguage;
      const isPt = browserLang.toLowerCase().startsWith('pt');
      
      const targetLang = isPt ? 'pt' : 'en';
      setDetectedLang(targetLang);
      
      // Muda a linguagem temporariamente para mostrar o modal no idioma correto
      i18n.changeLanguage(targetLang);
      setShowPopup(true);
    }
  }, [i18n]);

  const handleKeep = () => {
    localStorage.setItem('gym_lang_chosen_val', detectedLang);
    localStorage.setItem('gym_lang_chosen', 'true');
    setShowPopup(false);
  };

  const handleChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('gym_lang_chosen_val', lang);
    localStorage.setItem('gym_lang_chosen', 'true');
    setShowPopup(false);
  };

  return (
    <AnimatePresence>
      {showPopup && (
        <div style={overlayStyle}>
          <motion.div 
            style={modalStyle}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h3>{t('lang_detected_title')}</h3>
            <p>{t('lang_detected_msg')}</p>
            <div style={btnContainer}>
              <button className="btn-primary" onClick={handleKeep} style={btnStyle}>
                {t('keep_lang')}
              </button>
            </div>
            
            <p style={{ marginTop: '15px', fontSize: '14px' }}>{t('change_lang')}:</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => handleChange('pt')} 
                style={{...langBtnStyle, background: detectedLang === 'pt' ? 'var(--primary-color)' : 'transparent'}}
              >
                PT
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleChange('en')} 
                style={{...langBtnStyle, background: detectedLang === 'en' ? 'var(--primary-color)' : 'transparent'}}
              >
                EN
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(5px)'
};

const modalStyle = {
  background: 'var(--glass-bg)',
  border: 'var(--glass-border)',
  padding: '20px',
  borderRadius: '15px',
  textAlign: 'center',
  maxWidth: '90%',
  width: '320px',
  color: 'white',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

const btnContainer = {
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'center'
};

const btnStyle = {
  width: '100%',
  padding: '12px'
};

const langBtnStyle = {
  padding: '8px 20px',
  borderRadius: '8px',
  color: 'white',
  border: '1px solid var(--primary-color)',
  cursor: 'pointer'
};

export default LangPopup;
