
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SCHEDULE, BEEP_SOUND_URL, STUDENTS_SPRACHJONGLEURE, STUDENTS_ASF1, STUDENTS_ASF2 } from './constants';
import { ASFSession, StatusType, SessionStatus } from './types';

const App: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [status, setStatus] = useState<SessionStatus>({ type: StatusType.NONE, currentSessions: [] });
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'none' | 'sprachjongleure' | 'all' | 'courses' | 'done'>('none');
  const [selectedDoneSession, setSelectedDoneSession] = useState<ASFSession | null>(null);
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

  const getDayName = (day: number) => {
    const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return names[day];
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

    const activeDotColor = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      indigo: 'bg-indigo-500',
      teal: 'bg-teal-500',
      slate: 'bg-slate-400'
    }[theme];

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

  const groupedSchedule = useMemo(() => {
    const days = [1, 2, 3, 4, 5]; // Montag bis Freitag
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 overflow-x-hidden selection:bg-indigo-100">
      {/* Participant Popup (Modal) */}
      {selectedDoneSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedDoneSession(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-1.5 bg-slate-200"></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedDoneSession.label}</h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {selectedDoneSession.teacher} • Raum {selectedDoneSession.room}
                  </p>
                </div>
                <button onClick={() => setSelectedDoneSession(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-fit">
                  🕒 {selectedDoneSession.startTime} – {selectedDoneSession.endTime} Uhr
                </div>
                
                <div className="pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Teilnehmerliste</h4>
                  {renderStudentList(selectedDoneSession.students, 'slate')}
                </div>
              </div>

              <button 
                onClick={() => setSelectedDoneSession(null)}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Sprachjongleure */}
          <button 
            onClick={() => toggleTab('sprachjongleure')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-sm border transition-all ${activeTab === 'sprachjongleure' ? 'bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-100' : 'bg-white border-slate-100 text-slate-500'}`}
          >
            <span className="text-xl mb-1">🎨</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Sprachjongleure</span>
          </button>

          {/* Alle Termine */}
          <button 
            onClick={() => toggleTab('all')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-sm border transition-all ${activeTab === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100' : 'bg-white border-slate-100 text-slate-500'}`}
          >
            <span className="text-xl mb-1">📅</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Wochenplan</span>
          </button>

          {/* Kursübersicht */}
          <button 
            onClick={() => toggleTab('courses')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-sm border transition-all ${activeTab === 'courses' ? 'bg-teal-50 border-teal-200 text-teal-600 ring-2 ring-teal-100' : 'bg-white border-slate-100 text-slate-500'}`}
          >
            <span className="text-xl mb-1">👥</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Kursübersicht</span>
          </button>

          {/* Abgeschlossen */}
          <button 
            onClick={() => toggleTab('done')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-sm border transition-all ${activeTab === 'done' ? 'bg-slate-100 border-slate-300 text-slate-700 ring-2 ring-slate-200' : 'bg-white border-slate-100 text-slate-500'}`}
          >
            <span className="text-xl mb-1">✅</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Erledigt ({completedSessionsToday.length})</span>
          </button>
        </div>

        {/* --- Collapsible Contents --- */}

        {/* Sprachjongleure */}
        {activeTab === 'sprachjongleure' && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-orange-100 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3 text-center">Gruppe: Sprachjongleure</h4>
            {renderStudentList(STUDENTS_SPRACHJONGLEURE, 'orange')}
          </div>
        )}

        {/* Wochenplan */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-indigo-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 text-center">Gesamter Wochenplan</h4>
            {groupedSchedule.map(group => (
              <div key={group.day} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-slate-100"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{group.name}</span>
                  <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>
                <div className="space-y-1.5">
                  {group.sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800">{s.label} • {s.teacher}</span>
                        <span className="text-[10px] font-bold text-slate-400">Raum {s.room}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{s.startTime} – {s.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kursübersicht ASF 1 & 2 */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-teal-100 animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-3 bg-teal-50 inline-block px-3 py-1 rounded-full">Gruppe: ASF 1</h4>
              {renderStudentList(STUDENTS_ASF1, 'teal')}
            </div>
            <div className="pt-4 border-t border-slate-50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-3 bg-teal-50 inline-block px-3 py-1 rounded-full">Gruppe: ASF 2</h4>
              {renderStudentList(STUDENTS_ASF2, 'teal')}
            </div>
          </div>
        )}

        {/* Abgeschlossene Termine */}
        {activeTab === 'done' && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">Heute beendet</h4>
            {completedSessionsToday.length > 0 ? (
              <div className="space-y-2">
                {completedSessionsToday.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedDoneSession(s)}
                    className="w-full flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 opacity-90 grayscale-[0.3] hover:grayscale-0 hover:bg-slate-100 hover:border-slate-200 transition-all text-left"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">✅</span>
                        <span className="text-sm font-black text-slate-800">{s.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 ml-6">{s.teacher} • Raum {s.room}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 line-through">{s.startTime} – {s.endTime}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-center font-bold text-slate-300 py-4 uppercase">Noch keine beendeten Termine heute.</p>
            )}
          </div>
        )}

        {/* --- End Collapsible Contents --- */}

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
                <div className="flex items-center justify-between">
                   <p className="text-sm text-slate-500 font-semibold">Lehrkraft: <span className="text-slate-900 font-bold underline decoration-red-200">{session.teacher}</span></p>
                   <div className="flex items-center gap-1.5 text-slate-400 font-black text-xs">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                    {session.startTime} – {session.endTime}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="font-bold text-slate-400 mb-3 text-[10px] flex items-center gap-2 uppercase tracking-widest">
                  Teilnehmende Schüler ({session.students.length})
                </h4>
                {renderStudentList(session.students, 'red')}
              </div>
            </div>
          </section>
        ))}

        {/* UPCOMING SESSION (DER NÄCHSTE TERMIN) */}
        {status.nextSession && (
          <section className={`bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden transition-all duration-500 ${status.type === StatusType.ACTIVE ? 'mt-4 border-dashed opacity-80 scale-95 origin-top' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
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
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Alle Termine beendet</h3>
            <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
              Für heute sind keine weiteren Anschlussförderungen geplant. Gute Arbeit!
            </p>
          </section>
        )}

        <footer className="text-center py-6 text-slate-300 text-[9px] font-black uppercase tracking-widest leading-relaxed">
          ASF Dashboard v2.7<br/>
          Smart Tracking & Interactive Done History
        </footer>
      </main>
    </div>
  );
};

export default App;
