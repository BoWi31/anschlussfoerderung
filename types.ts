
export interface ASFSession {
  id: string;
  label: string;
  teacher: string;
  room: string;
  day: number; // 0-6 (Sun-Sat)
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  students: string[];
}

export enum StatusType {
  NONE = 'NONE',
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING'
}

export interface SessionStatus {
  type: StatusType;
  currentSessions: ASFSession[];
  nextSession?: ASFSession;
  minutesToStart?: number;
}
