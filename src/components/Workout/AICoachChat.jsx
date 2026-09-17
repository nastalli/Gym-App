import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const AICoachChat = ({ chatOpen, setChatOpen, todayGroups }) => {
  const { t, i18n } = useTranslation();
  const [chatMessages, setChatMessages] = useState([{ role: 'model', text: t('coach_hello') }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    if (!GEMINI_API_KEY) {
      alert(t('coach_api_key'));
      return;
    }
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    
    try {
      const promptPt = `Você é um personal trainer amigável e direto de um app. O usuário está no meio de um treino focado em: ${todayGroups.join(', ')}.
O usuário perguntou: "${userMsg}".
Responda de forma rápida e motivadora (1 ou 2 parágrafos curtos).`;
      const promptEn = `You are a friendly and direct personal trainer from an app. The user is in the middle of a workout focused on: ${todayGroups.join(', ')}.
The user asked: "${userMsg}".
Reply quickly and motivatingly (1 or 2 short paragraphs).`;

      const prompt = i18n.language === 'en' ? promptEn : promptPt;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      setChatMessages(prev => [...prev, { role: 'model', text: textResponse }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', text: t('coach_conn_error') + e.message }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!chatOpen) {
    return (
      <button 
        onClick={() => setChatOpen(true)}
        aria-label="Abrir assistente virtual"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          background: 'var(--primary-color)',
          color: '#000',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          zIndex: 999,
          border: 'none',
          padding: 0
        }}
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000, 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'var(--surface-color)', borderRadius: '20px', display: 'flex', flexDirection: 'column', 
        width: '100%', maxWidth: '450px', height: '100%', maxHeight: '700px', overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '15px', background: 'var(--primary-color)', color: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <span>🤖 Coach IA</span>
          <button 
            onClick={() => setChatOpen(false)} 
            aria-label="Fechar assistente virtual"
            style={{ background: 'transparent', border: 'none', color: '#000', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
              color: msg.role === 'user' ? '#000' : 'var(--text-color)',
              padding: '10px 15px', borderRadius: '15px', maxWidth: '80%', fontSize: '14px'
            }}>
              {msg.text}
            </div>
          ))}
          {isChatLoading && <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)' }}>{t('coach_typing')}</div>}
        </div>
        
        <div style={{ padding: '10px', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)' }}>
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder={t('ask_coach')}
            style={{ flex: 1, marginBottom: 0, borderRadius: '20px' }}
          />
          <button 
            onClick={handleSendChat} 
            aria-label="Enviar mensagem"
            style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICoachChat;
