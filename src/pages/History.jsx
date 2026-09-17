import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase/config';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const History = () => {
  const { t, i18n } = useTranslation();
  const { workoutData, user } = useAppContext();
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ weight: '', reps: '' });

  // Group workoutData by date string (YYYY-MM-DD)
  const workoutsByDate = useMemo(() => {
    const grouped = {};
    workoutData.forEach(item => {
      const d = new Date(item.timestamp);
      const dateStr = d.toLocaleDateString('en-CA'); 
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(item);
    });
    return grouped;
  }, [workoutData]);

  const handleDelete = async (id) => {
    if (window.confirm(t('remove_set_confirm'))) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'sets', id));
      } catch(e) {
        alert(t('error_deleting'));
      }
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.dbId);
    setEditForm({ weight: item.weight, reps: item.reps });
  };

  const handleSaveEdit = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'sets', editingId), {
        weight: Number(editForm.weight),
        reps: Number(editForm.reps)
      });
      setEditingId(null);
    } catch(e) {
      alert(t('error_updating'));
    }
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay();

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const selectedWorkouts = workoutsByDate[selectedDate] || [];
  
  const byExercise = {};
  selectedWorkouts.forEach(item => {
    if (!byExercise[item.exercise]) byExercise[item.exercise] = [];
    byExercise[item.exercise].push(item);
  });

  const monthName = currentMonthDate.toLocaleString(i18n.language === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '60px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('history')}</h2>
      
      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <div className="flex-between" style={{ marginBottom: '15px' }}>
          <button onClick={prevMonth} style={{ padding: '5px 15px', width: 'auto', background: 'rgba(255,255,255,0.1)' }}>&lt;</button>
          <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{monthName}</span>
          <button onClick={nextMonth} style={{ padding: '5px 15px', width: 'auto', background: 'rgba(255,255,255,0.1)' }}>&gt;</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
          {t('days_of_week', { returnObjects: true }).map(d => <div key={d} style={{fontSize: '12px', color: 'var(--text-muted)'}}>{d}</div>)}
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(d => {
             const dateObj = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), d);
             const dateStr = dateObj.toLocaleDateString('en-CA');
             const hasWorkout = workoutsByDate[dateStr] && workoutsByDate[dateStr].length > 0;
             const isSelected = selectedDate === dateStr;
             return (
               <div 
                 key={d} 
                 onClick={() => setSelectedDate(dateStr)}
                 style={{
                   padding: '10px 0',
                   borderRadius: '8px',
                   cursor: 'pointer',
                   background: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                   color: isSelected ? '#000' : 'white',
                   fontWeight: isSelected ? 'bold' : 'normal',
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   transition: 'background 0.2s'
                 }}
               >
                 <span>{d}</span>
                 <div style={{ 
                   width: '6px', 
                   height: '6px', 
                   background: isSelected ? '#000' : (hasWorkout ? 'var(--primary-color)' : 'transparent'), 
                   borderRadius: '50%', 
                   marginTop: '2px' 
                 }} />
               </div>
             )
          })}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR')}
        </h3>
        
        {selectedWorkouts.length === 0 ? (
          <p className="text-muted">{t('no_workout_history')}</p>
        ) : (
          Object.keys(byExercise).map(exercise => (
            <div key={exercise} className="glass-panel" style={{ padding: '12px', marginBottom: '10px', background: 'rgba(255,255,255,0.02)' }}>
              <strong style={{ fontSize: '16px', display: 'block', marginBottom: '10px' }}>{exercise}</strong>
              
              {byExercise[exercise].sort((a,b) => a.timestamp - b.timestamp).map((item, idx) => (
                <div key={item.dbId} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {editingId === item.dbId ? (
                    <div className="flex-row">
                      <input 
                        type="number" 
                        value={editForm.weight} 
                        onChange={e => setEditForm({...editForm, weight: e.target.value})}
                        style={{ width: '60px', marginBottom: 0, padding: '5px' }}
                        min="0" step="0.5"
                      /> <span style={{fontSize: '12px'}}>kg</span>
                      <input 
                        type="number" 
                        value={editForm.reps} 
                        onChange={e => setEditForm({...editForm, reps: e.target.value})}
                        style={{ width: '60px', marginBottom: 0, padding: '5px' }}
                        min="0" step="1"
                      /> <span style={{fontSize: '12px'}}>reps</span>
                      <button onClick={handleSaveEdit} style={{ padding: '5px 10px', marginBottom: 0, width: 'auto' }}>✓</button>
                      <button onClick={() => setEditingId(null)} className="danger-btn" style={{ padding: '5px 10px', marginBottom: 0, width: 'auto' }}>X</button>
                    </div>
                  ) : (
                    <div className="flex-between">
                      <span style={{ fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>{t('set_number')}{idx + 1}</span>
                        {item.weight} kg x {item.reps} reps {item.rpe ? `(RIR: ${item.rpe})` : ''}
                      </span>
                      <div>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          style={{ background: 'transparent', padding: '4px 8px', fontSize: '12px', width: 'auto', display: 'inline', marginRight: '8px', border: '1px solid var(--border-color)' }}
                        >
                          {t('edit')}
                        </button>
                        <button 
                          onClick={() => handleDelete(item.dbId)} 
                          className="danger-btn"
                          style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', display: 'inline' }}
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
