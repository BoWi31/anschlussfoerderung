
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SCHEDULE, BEEP_SOUND_URL, STUDENTS_SPRACHJONGLEURE } from './constants';
import { ASFSession, StatusType, SessionStatus } from './types';

const App: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [status, setStatus] = useState<SessionStatus>({ type: StatusType.NONE, currentSessions: [] });
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [showSprachjongleure, setShowSprachjongleure] = useState(false);
  const beepPlayedRef = useRef<string | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateStatus = useCallback(() => {
    const currentDay = now.getDay();
    const currentTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const todaysSessions = SCHEDULE.filter(s => s.day === currentDay);
    
    // Active sessions
    const activeSessions = todaysSessions.filter(s => {
      return currentTimeStr >= s.startTime && currentTimeStr <= s.endTime;
    });

    // Upcoming session today (even if one is active)
    const upcomingToday = todaysSessions
      .filter(s => s.startTime > currentTimeStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const next = upcomingToday[0] || undefined;
    let minsToStart: number | undefined;

    if (next) {
      const [h, m] = next.startTime.split(':').map(Number);
      const nextDate = new Date(now);
      nextDate.setHours(h, m, 0, 0);
      const diffMs = nextDate.getTime() - now.getTime();
      minsToStart = Math.ceil(diffMs / 60000);

      // Play audio warning at exactly 5 minutes
      if (minsToStart === 5 && beepPlayedRef.current !== next.id) {
        const audio = new Audio(BEEP_SOUND_URL);
        audio.play().catch(e => console.error("Audio playback failed", e));
        beepPlayedRef.current = next.id;
      }
    }

    if (activeSessions.length > 0) {
      setStatus({ 
        type: StatusType.ACTIVE, 
        currentSessions: activeSessions, 
        nextSession: next,
        minutesToStart: minsToStart
      });
    } else if (next) {
      setStatus({ 
        type: StatusType.UPCOMING, 
        currentSessions: [], 
        nextSession: next,
        minutesToStart: minsToStart
      });
    } else {
      setStatus({ type: StatusType.NONE, currentSessions: [] });
      beepPlayedRef.current = null;
    }
  }, [now]);

  useEffect(() => {
    calculateStatus();
    const interval = setInterval(calculateStatus, 30000);
    return () => clearInterval(interval);
  }, [calculateStatus]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(date);
  };

  const getStatusStyles = () => {
    switch (status.type) {
      case StatusType.ACTIVE:
        return "from-rose-600 to-red-500 text-white shadow-red-200";
      case StatusType.UPCOMING:
        return "from-amber-400 to-orange-500 text-white shadow-amber-100";
      default:
        return "from-emerald-600 to-teal-500 text-white shadow-emerald-100";
    }
  };

  const statusInfo = useMemo(() => {
    switch (status.type) {
      case StatusType.ACTIVE:
        return { title: "Anschlussförderung aktiv ❌" };
      case StatusType.UPCOMING:
        return { title: "Gleich Anschlussförderung ⚠️" };
      default:
        return { title: "Keine Anschlussförderung ✅" };
    }
  }, [status.type]);

  // Helper to sort and group students by class with granular colors
  const renderStudentList = (students: string[], theme: 'red' | 'indigo' | 'orange') => {
    const classRegex = /\((.*?)\)/;
    
    const sortedStudents = [...students].sort((a, b) => {
      const classA = a.match(classRegex)?.[1] || '';
      const classB = b.match(classRegex)?.[1] || '';
      return classA.localeCompare(classB) || a.localeCompare(b);
    });

    const getClassColor = (name: string) => {
      const cls = name.match(classRegex)?.[1] || '';
      // Distinguish 5.1 and 5a
      if (cls === '5.1') return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      if (cls === '5a') return 'bg-teal-50 border-teal-100 text-teal-800';
      if (cls === '6.1') return 'bg-blue-50 border-blue-100 text-blue-800';
      if (cls === '7.1') return 'bg-indigo-50 border-indigo-100 text-indigo-800';
      if (cls === '7.2') return 'bg-violet-50 border-violet-100 text-violet-800';
      return 'bg-slate-50 border-slate-100 text-slate-800';
    };

    const activeDotColor = theme === 'red' ? 'bg-red-500' : (theme === 'orange' ? 'bg-orange-500' : 'bg-indigo-500');

    return (
      <ul className="grid grid-cols-1 gap-1.5">
        {sortedStudents.map((student, idx) => (
          <li key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border shadow-sm text-sm font-bold ${getClassColor(student)}`}>
            <span className={`w-2 h-2 rounded-full ${theme === 'red' ? 'animate-pulse' : ''} ${activeDotColor}`}></span>
            {student}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 overflow-x-hidden selection:bg-indigo-100">
      {/* Header Banner */}
      <header className={`sticky top-0 z-20 bg-gradient-to-r ${getStatusStyles()} py-3 px-4 shadow-lg transition-all duration-700`}>
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
          <h1 className="text-lg md:text-2xl font-black tracking-tight drop-shadow-sm uppercase">
            {statusInfo.title}
          </h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto mt-4 px-3 md:px-4 space-y-4">
        {/* Time & Date Display */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3">
          <div className="text-center">
            <h2 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-0.5">Wochentag & Datum</h2>
            <p className="text-base font-extrabold text-slate-700">{formatDate(now)}</p>
          </div>
          <div className="text-center w-full border-t border-slate-50 pt-3">
            <h2 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-0.5">Aktuelle Uhrzeit</h2>
            <p className="text-5xl md:text-6xl font-black text-slate-900 mono tabular-nums tracking-tighter leading-none">
              {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </section>

        {/* Sprachjongleure Button Group */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button 
            onClick={() => setShowSprachjongleure(!showSprachjongleure)}
            className={`w-full flex items-center justify-between p-4 font-black uppercase tracking-widest text-xs transition-all ${showSprachjongleure ? 'bg-orange-50 text-orange-600' : 'bg-white text-slate-500'}`}
          >
            <span className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${showSprachjongleure ? 'bg-orange-100' : 'bg-slate-100'}`}>🎨</span>
              Sprachjongleure
            </span>
            <svg className={`h-4 w-4 transform transition-transform ${showSprachjongleure ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSprachjongleure && (
            <div className="p-4 border-t border-orange-50 bg-orange-50/20 animate-in fade-in zoom-in-95 duration-200">
               {renderStudentList(STUDENTS_SPRACHJONGLEURE, 'orange')}
            </div>
          )}
        </section>

        {/* ACTIVE SESSIONS SECTION */}
        {status.type === StatusType.ACTIVE && status.currentSessions.map((session) => (
          <section key={session.id} className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-1.5 bg-red-500"></div>
            <div className="p-5 space-y-5">
              <div className="flex flex-col gap-1.5">
                <span className="w-fit px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Sitzung Läuft: {session.label}
                </span>
                <h3 className="text-3xl font-black text-slate-800 leading-tight tracking-tight">Raum {session.room}</h3>
                <p className="text-sm text-slate-500 font-semibold">Lehrkraft: <span className="text-slate-900 font-bold underline decoration-red-200">{session.teacher}</span></p>
                <div className="flex items-center gap-1.5 text-slate-400 font-black text-xs pt-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                  {session.startTime} – {session.endTime} Uhr
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="font-bold text-slate-400 mb-3 text-[10px] flex items-center gap-2 uppercase tracking-widest">
                  Anwesende Schüler ({session.students.length})
                </h4>
                {renderStudentList(session.students, 'red')}
              </div>
            </div>
          </section>
        ))}

        {/* UPCOMING SESSION (DER NÄCHSTE TERMIN) */}
        {status.nextSession && (
          <section className={`bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden transition-all duration-500 ${status.type === StatusType.ACTIVE ? 'mt-4 border-dashed' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
            <div className={`p-1 ${status.type === StatusType.ACTIVE ? 'bg-slate-300' : 'bg-amber-400'}`}></div>
            <div className="p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status.type === StatusType.ACTIVE ? 'text-slate-400' : 'text-amber-600'}`}>
                    {status.type === StatusType.ACTIVE ? 'Nächster Termin' : 'Anstehend'}
                  </h4>
                  <p className={`${status.type === StatusType.ACTIVE ? 'text-lg' : 'text-xl'} font-black text-slate-800 tracking-tight`}>
                    {status.nextSession.label} • {status.nextSession.room}
                  </p>
                  <p className="text-sm font-bold text-slate-500 mt-0.5">👤 {status.nextSession.teacher}</p>
                </div>
                <div className={`${status.type === StatusType.ACTIVE ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'} px-3 py-1.5 rounded-xl text-center min-w-[80px]`}>
                  <p className="text-[10px] font-black uppercase leading-none mb-1">In</p>
                  <p className="text-lg font-black leading-none">{status.minutesToStart} <span className="text-[10px]">Min</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-3 bg-slate-50/50 p-2 rounded-lg">
                <span>🕒 {status.nextSession.startTime} – {status.nextSession.endTime} Uhr</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Geplante Gruppe</h5>
                  {status.type === StatusType.ACTIVE && (
                    <button 
                      onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                      className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center gap-1 hover:text-indigo-700 transition-colors"
                    >
                      {isUpcomingExpanded ? 'Schließen' : 'Liste zeigen'}
                      <svg className={`h-3 w-3 transform transition-transform ${isUpcomingExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {(status.type === StatusType.UPCOMING || isUpcomingExpanded) && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    {renderStudentList(status.nextSession.students, 'indigo')}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {status.type === StatusType.NONE && (
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Alles erledigt</h3>
            <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
              Keine weiteren Anschlussförderungen für heute.
            </p>
          </section>
        )}

        <footer className="text-center py-6 text-slate-300 text-[9px] font-black uppercase tracking-widest leading-relaxed">
          ASF Dashboard v2.3<br/>
          Inkl. Sprachjongleure & Farb-Coding
        </footer>
      </main>
    </div>
  );
};

export default App;
