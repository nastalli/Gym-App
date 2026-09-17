import React, { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Login from './components/Login';
import Navigation from './components/Navigation';
import TimerWidget from './components/TimerWidget';
import LangPopup from './components/LangPopup';
import Profile from './pages/Profile';
import Workout from './pages/Workout';
import Progress from './pages/Progress';
import History from './pages/History';
import Diet from './pages/Diet';
import Home from './pages/Home';

function App() {
  const { user, loading, timerActive, timerSeconds, setTimerActive, setTimerSeconds, accentColor } = useAppContext();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const themeColor = accentColor || '#00ff88';
    
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 255;
      const b = parseInt(hex.slice(5, 7), 16) || 136;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    document.documentElement.style.setProperty('--primary-color', themeColor);
    document.documentElement.style.setProperty('--primary-glow', hexToRgba(themeColor, 0.5));
    document.documentElement.style.setProperty('--primary-glow-light', hexToRgba(themeColor, 0.15));
    document.documentElement.style.setProperty('--primary-bg-light', hexToRgba(themeColor, 0.04));
    document.documentElement.style.setProperty('--primary-bg-lighter', hexToRgba(themeColor, 0.03));
  }, [accentColor]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>{t('loading')}</h2>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <LangPopup />
      <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
        <h2 style={{ margin: 0, letterSpacing: '1px' }}>GYM TRACKER</h2>
        {!isOnline && (
          <div style={{ 
            position: 'absolute', top: 5, right: 0, 
            background: 'var(--danger-color)', color: 'white', 
            fontSize: '10px', padding: '4px 8px', borderRadius: '10px',
            fontWeight: 'bold'
          }}>
            {t('offline').toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ paddingBottom: '20px', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <Home setActiveTab={setActiveTab} />}
            {activeTab === 'workout' && <Workout />}
            {activeTab === 'diet' && <Diet />}
            {activeTab === 'progress' && <Progress />}
            {activeTab === 'history' && <History />}
            {activeTab === 'profile' && <Profile />}
          </motion.div>
        </AnimatePresence>
      </div>

      <TimerWidget />

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
