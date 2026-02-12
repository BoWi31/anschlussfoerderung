
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SCHEDULE, BEEP_SOUND_URL, STUDENTS_SPRACHJONGLEURE, STUDENTS_ASF1, STUDENTS_ASF2 } from './constants';
import { ASFSession, StatusType, SessionStatus } from './types';

interface AbsoluteNextSession extends ASFSession {
  nextOccurrence: Date;
}

const App: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [status, setStatus] = useState<SessionStatus>({ type: StatusType.NONE, currentSessions: [] });
  const [absoluteNext, setAbsoluteNext] = useState<AbsoluteNextSession | null>(null);
  const [activeTab, setActiveTab] = useState<'none' | 'sprachjongleure' | 'all' | 'courses' | 'done'>('none');
  const [detailSession, setDetailSession] = useState<ASFSession | null>(null);
  const beepPlayedRef = useRef<string | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateStatus = useCallback(() => {
    const currentDay = now.getDay();
    const currentTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // 1. Current Status (Today)
    const todaysSessions = SCHEDULE.filter(s => s.day === currentDay);
    const activeSessions = todaysSessions.filter(s => currentTimeStr >= s.startTime && currentTimeStr <= s.endTime);
    const upcomingToday = todaysSessions
      .filter(s => s.startTime > currentTimeStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const nextToday = upcomingToday[0] || undefined;
    let minsToStart: number | undefined;

    if (nextToday) {
      const [h, m] = nextToday.startTime.split(':').map(Number);
      const nextDate = new Date(now);
      nextDate.setHours(h, m, 0, 0);
      const diffMs = nextDate.getTime() - now.getTime();
      minsToStart = Math.ceil(diffMs / 60000);

      if (minsToStart === 5 && beepPlayedRef.current !== nextToday.id) {
        const audio = new Audio(BEEP_SOUND_URL);
        audio.play().catch(e => console.error("Audio playback failed", e));
        beepPlayedRef.current = nextToday.id;
      }
    }

    if (activeSessions.length > 0) {
      setStatus({ type: StatusType.ACTIVE, currentSessions: activeSessions, nextSession: nextToday, minutesToStart: minsToStart });
    } else if (nextToday) {
      setStatus({ type: StatusType.UPCOMING, currentSessions: [], nextSession: nextToday, minutesToStart: minsToStart });
    } else {
      setStatus({ type: StatusType.NONE, currentSessions: [] });
      beepPlayedRef.current = null;
    }

    // 2. Absolute Next Session (Overall)
    const allNextOccurrences = SCHEDULE.map(session => {
      const [h, m] = session.startTime.split(':').map(Number);
      let occurrence = new Date(now);
      occurrence.setHours(h, m, 0, 0);
      
      let daysUntil = (session.day - currentDay + 7) % 7;
      if (daysUntil === 0 && (occurrence.getTime() <= now.getTime())) {
        daysUntil = 7;
      }
      occurrence.setDate(occurrence.getDate() + daysUntil);
      
      return { ...session, nextOccurrence: occurrence };
    });

    const sortedOccurrences = allNextOccurrences.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
    setAbsoluteNext(sortedOccurrences[0] || null);
  }, [now]);

  useEffect(() => {
    calculateStatus();
  }, [calculateStatus]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(date);
  };

  const getDayName = (day: number) => {
    const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return names[day];
  };

  const getLessonSlot = (startTime: string) => {
    if (startTime === '08:00') return '1./2. Std.';
    if (startTime === '09:50') return '3./4. Std.';
    if (startTime === '11:40') return '5./6. Std.';
    return '';
  };

  const getStatusStyles = () => {
    switch (status.type) {
      case StatusType.ACTIVE: return "from-rose-600 to-red-500 text-white shadow-red-200";
      case StatusType.UPCOMING: return "from-amber-400 to-orange-500 text-white shadow-amber-100";
      default: return "from-emerald-600 to-teal-500 text-white shadow-emerald-100";
    }
  };

  const statusInfo = useMemo(() => {
    switch (status.type) {
      case StatusType.ACTIVE: return { title: "Anschlussförderung aktiv ❌" };
      case StatusType.UPCOMING: return { title: "Gleich Anschlussförderung ⚠️" };
      default: return { title: "Keine Anschlussförderung ✅" };
    }
  }, [status.type]);

  const renderStudentList = (students: string[], theme: 'red' | 'indigo' | 'orange' | 'teal' | 'slate') => {
    const classRegex = /\((.*?)\)/;
    const sortedStudents = [...students].sort((a, b) => {
      const classA = a.match(classRegex)?.[1] || '';
      const classB = b.match(classRegex)?.[1] || '';
      return classA.localeCompare(classB) || a.localeCompare(b);
    });

    const getClassColor = (name: string) => {
      const cls = name.match(classRegex)?.[1] || '';
      if (cls === '5.1') return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      if (cls === '5a') return 'bg-teal-50 border-teal-100 text-teal-800';
      if (cls === '6.1') return 'bg-blue-50 border-blue-100 text-blue-800';
      if (cls === '7.1') return 'bg-indigo-50 border-indigo-100 text-indigo-800';
      if (cls === '7.2') return 'bg-violet-50 border-violet-100 text-violet-800';
      return 'bg-slate-50 border-slate-100 text-slate-800';
    };

    const activeDotColor = { red: 'bg-red-500', orange: 'bg-orange-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500', slate: 'bg-slate-400' }[theme];

    return (
      <ul className={`grid grid-cols-1 ${students.length > 5 ? 'sm:grid-cols-2' : ''} gap-1.5`}>
        {sortedStudents.map((student, idx) => (
          <li key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border shadow-sm text-sm font-bold ${getClassColor(student)} transition-transform active:scale-95`}>
            <span className={`w-2 h-2 rounded-full ${theme === 'red' ? 'animate-pulse' : ''} ${activeDotColor}`}></span>
            {student}
          </li>
        ))}
      </ul>
    );
  };

  const getCountdownParts = (targetDate: Date) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    
    return {
      d: Math.floor(diff / (1000 * 60 * 60 * 24)),
      h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      s: Math.floor((diff % (1000 * 60)) / 1000)
    };
  };

  const groupedSchedule = useMemo(() => {
    const days = [1, 2, 3, 4, 5];
    return days.map(day => ({
      day,
      name: getDayName(day),
      sessions: SCHEDULE.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
    })).filter(group => group.sessions.length > 0);
  }, []);

  const completedSessionsToday = useMemo(() => {
    const currentDay = now.getDay();
    const currentTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return SCHEDULE.filter(s => s.day === currentDay && s.endTime < currentTimeStr)
      .sort((a, b) => b.endTime.localeCompare(a.endTime));
  }, [now]);

  const toggleTab = (tab: 'sprachjongleure' | 'all' | 'courses' | 'done') => {
    setActiveTab(activeTab === tab ? 'none' : tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 overflow-x-hidden selection:bg-indigo-100 flex flex-col">
      {/* Universal Detail Modal (Students List) */}
      {detailSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDetailSession(null)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-1.5 bg-slate-200 shrink-0"></div>
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{detailSession.label}</h3>
                  <p className="text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest mt-1">{detailSession.teacher} • Raum {detailSession.room}</p>
                </div>
                <button onClick={() => setDetailSession(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs md:text-sm font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
                  🕒 {detailSession.startTime} – {detailSession.endTime} Uhr
                </div>
                
                <div className="pt-2">
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Teilnehmerliste ({detailSession.students.length})</h4>
                  {renderStudentList(detailSession.students, 'slate')}
                </div>
              </div>
              <button 
                onClick={() => setDetailSession(null)} 
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <header className={`sticky top-0 z-20 bg-gradient-to-r ${getStatusStyles()} py-4 px-4 shadow-lg transition-all duration-700`}>
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm uppercase">
            {statusInfo.title}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full mt-4 px-4 sm:px-6 lg:px-8 space-y-6 flex-grow">
        
        {/* Time & Date Display - Adapts to Row on Tablet/Desktop */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left flex-1 border-b md:border-b-0 md:border-r border-slate-50 pb-4 md:pb-0 md:pr-8">
            <h2 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-1">Wochentag & Datum</h2>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-700">{formatDate(now)}</p>
          </div>
          <div className="text-center flex-1 md:text-right">
            <h2 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-1">Aktuelle Uhrzeit</h2>
            <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 mono tabular-nums tracking-tighter leading-none">
              {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </section>

        {/* Action Buttons Grid - Flexible Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => toggleTab('sprachjongleure')} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm border transition-all ${activeTab === 'sprachjongleure' ? 'bg-orange-50 border-orange-200 text-orange-600 ring-4 ring-orange-50' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95'}`}>
            <span className="text-2xl mb-1">🎨</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Sprachjongleure</span>
          </button>
          <button onClick={() => toggleTab('all')} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm border transition-all ${activeTab === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-50' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95'}`}>
            <span className="text-2xl mb-1">📅</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Wochenplan</span>
          </button>
          <button onClick={() => toggleTab('courses')} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm border transition-all ${activeTab === 'courses' ? 'bg-teal-50 border-teal-200 text-teal-600 ring-4 ring-teal-50' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95'}`}>
            <span className="text-2xl mb-1">👥</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Kurse</span>
          </button>
          <button onClick={() => toggleTab('done')} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm border transition-all ${activeTab === 'done' ? 'bg-slate-100 border-slate-300 text-slate-700 ring-4 ring-slate-100' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95'}`}>
            <span className="text-2xl mb-1">✅</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Erledigt ({completedSessionsToday.length})</span>
          </button>
        </div>

        {/* --- Collapsible Contents --- */}

        {activeTab === 'sprachjongleure' && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-100 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-400 mb-4 text-center">Gruppe: Sprachjongleure</h4>
            {renderStudentList(STUDENTS_SPRACHJONGLEURE, 'orange')}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-indigo-100 animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 text-center">Wochenplan Übersicht</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groupedSchedule.map(group => {
                const isToday = now.getDay() === group.day;
                return (
                  <div key={group.day} className={`rounded-xl overflow-hidden border transition-all h-fit ${isToday ? 'border-indigo-300 ring-4 ring-indigo-50 shadow-md' : 'border-slate-100'}`}>
                    <div className={`px-4 py-2 flex items-center justify-between ${isToday ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-600'}`}>
                      <span className="text-xs font-black uppercase tracking-wider">{group.name}</span>
                      {isToday && <span className="bg-white text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Heute</span>}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.sessions.map(s => (
                        <div key={s.id} className="p-3 bg-white flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setDetailSession(s)}>
                          <div className="flex flex-col items-center min-w-[55px] border-r border-slate-50 pr-4">
                            <span className="text-[9px] font-black text-indigo-400 uppercase leading-none mb-1">{getLessonSlot(s.startTime)}</span>
                            <span className="text-[10px] font-bold text-slate-800 leading-none">{s.startTime}</span>
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${s.label.includes('1') ? 'bg-rose-400' : 'bg-teal-400'}`}></span>
                              <span className="text-xs font-black text-slate-800">{s.label}</span>
                              <span className="text-[10px] font-bold text-slate-400">• {s.teacher}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-300 ml-4 mt-0.5 uppercase tracking-tighter"><span>Raum {s.room}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-teal-100 animate-in fade-in zoom-in-95 duration-200 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-teal-600 mb-4 bg-teal-50 inline-block px-3 py-1 rounded-full">Gruppe: ASF 1</h4>
                {renderStudentList(STUDENTS_ASF1, 'teal')}
              </div>
              <div className="pt-8 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-teal-600 mb-4 bg-teal-50 inline-block px-3 py-1 rounded-full">Gruppe: ASF 2</h4>
                {renderStudentList(STUDENTS_ASF2, 'teal')}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'done' && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-2 text-center">Heute beendet</h4>
            {completedSessionsToday.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {completedSessionsToday.map(s => (
                  <button key={s.id} onClick={() => setDetailSession(s)} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 opacity-90 grayscale-[0.3] hover:grayscale-0 hover:bg-slate-100 hover:border-slate-200 transition-all text-left">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2"><span>✅</span><span className="text-sm font-black text-slate-800">{s.label}</span></div>
                      <span className="text-[10px] font-bold text-slate-400 ml-6">{s.teacher} • R {s.room}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4"><span className="text-[10px] font-black text-slate-400 line-through whitespace-nowrap">{s.startTime} – {s.endTime}</span></div>
                  </button>
                ))}
              </div>
            ) : <p className="text-[10px] md:text-xs text-center font-bold text-slate-300 py-6 uppercase">Noch keine beendeten Termine heute.</p>}
          </div>
        )}

        {/* --- Dynamic Status Cards --- */}

        {status.type === StatusType.ACTIVE && status.currentSessions.map((session) => (
          <section key={session.id} className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-1.5 bg-red-500"></div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider">Sitzung Läuft: {session.label}</span>
                  <h3 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight tracking-tight pt-2">Raum {session.room}</h3>
                  <p className="text-base md:text-lg text-slate-500 font-semibold">Lehrkraft: <span className="text-slate-900 font-bold underline decoration-red-200">{session.teacher}</span></p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex flex-col items-center md:items-end">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zeitraum</p>
                   <p className="text-lg md:text-xl font-black text-slate-700">{session.startTime} – {session.endTime}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h4 className="font-bold text-slate-400 mb-4 text-[10px] md:text-xs flex items-center gap-2 uppercase tracking-widest">Teilnehmende Schüler ({session.students.length})</h4>
                {renderStudentList(session.students, 'red')}
              </div>
            </div>
          </section>
        ))}

        {status.nextSession && (
          <section className={`bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden transition-all duration-500 ${status.type === StatusType.ACTIVE ? 'mt-4 border-dashed opacity-80 scale-95 origin-top' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
            <div className={`p-1 ${status.type === StatusType.ACTIVE ? 'bg-slate-300' : 'bg-amber-400'}`}></div>
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h4 className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-1 ${status.type === StatusType.ACTIVE ? 'text-slate-400' : 'text-amber-600'}`}>
                    {status.type === StatusType.ACTIVE ? 'Nächster Termin Heute' : 'In Kürze'}
                  </h4>
                  <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{status.nextSession.label} • Raum {status.nextSession.room}</p>
                  <p className="text-sm md:text-base font-bold text-slate-500 mt-1">👤 {status.nextSession.teacher} • 🕒 {status.nextSession.startTime} – {status.nextSession.endTime} Uhr</p>
                </div>
                <div className={`${status.type === StatusType.ACTIVE ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'} px-6 py-3 rounded-2xl text-center min-w-[120px] shadow-sm`}>
                  <p className="text-[10px] md:text-xs font-black uppercase leading-none mb-2">Start in</p>
                  <p className="text-2xl md:text-3xl font-black leading-none">{status.minutesToStart} <span className="text-sm md:text-base">Min</span></p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">👥</span>
                  <h5 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">Geplante Gruppe</h5>
                </div>
                <button 
                  onClick={() => setDetailSession(status.nextSession!)}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
                >
                  Schüler anzeigen
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ABSOLUTE NEXT (FUTURE) SECTION - Overhauled Countdown Aesthetic */}
        {status.type === StatusType.NONE && absoluteNext && (
          <section className="bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500"></div>
            <div className="p-8 md:p-12 space-y-10">
              <div className="text-center space-y-3">
                <span className="inline-block px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">Nächster Termin Gesamt</span>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none pt-2">
                  {getDayName(absoluteNext.day)}, {absoluteNext.startTime} Uhr
                </h3>
                <p className="text-slate-400 font-bold text-sm md:text-lg tracking-wide">{absoluteNext.label} bei {absoluteNext.teacher} (Raum {absoluteNext.room})</p>
              </div>

              {/* Enhanced Countdown UI */}
              <div className="flex flex-col items-center gap-8">
                <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-6 w-full max-w-2xl">
                  {Object.entries(getCountdownParts(absoluteNext.nextOccurrence)).map(([unit, value]) => (
                    <div key={unit} className="flex flex-col items-center group">
                      <div className="bg-slate-900 w-full aspect-square sm:aspect-auto sm:h-24 md:h-28 rounded-xl sm:rounded-2xl shadow-xl border-b-4 border-slate-950 flex items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                        <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white mono tabular-nums tracking-tighter">
                          {String(value).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-[8px] sm:text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-2 sm:mt-3">
                        {{d:'Tage', h:'Std', m:'Min', s:'Sek'}[unit as 'd'|'h'|'m'|'s']}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
                  <button 
                    onClick={() => setDetailSession(absoluteNext)}
                    className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center group hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
                  >
                    <p className="text-[9px] md:text-xs font-black text-indigo-300 uppercase mb-1">Gruppe</p>
                    <p className="text-lg md:text-xl font-black text-indigo-700 group-hover:scale-105 transition-transform">{absoluteNext.label} ℹ️</p>
                  </button>
                  <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[9px] md:text-xs font-black text-teal-300 uppercase mb-1">Raum</p>
                    <p className="text-lg md:text-xl font-black text-teal-700">{absoluteNext.room}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FINAL EMPTY STATE */}
        {status.type === StatusType.NONE && !absoluteNext && (
          <section className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center space-y-4">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Keine anstehenden Termine</h3>
            <p className="text-slate-400 font-medium">Genießen Sie die unterrichtsfreie Zeit!</p>
          </section>
        )}

        <footer className="text-center py-12 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
          ASF Dashboard v3.2<br/>
          Advanced Countdown Experience & Visual Refinement
        </footer>
      </main>
    </div>
  );
};

export default App;
