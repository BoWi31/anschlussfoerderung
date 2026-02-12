
import { ASFSession } from './types';

export const STUDENTS_ASF1 = [
  'Richard (6.1)',
  'Imran (6.1)',
  'Albion (7.2)',
  'Daniil (7.2)'
];

export const STUDENTS_ASF2 = [
  'Mohamed (7.1)',
  'Artem (7.1)',
  'Niiazkuly (5a)',
  'Violetta (5.1)',
  'Krisztian (7.1)',
  'Neijla (7.2)'
];

export const STUDENTS_SPRACHJONGLEURE = [
  'Danilo (5.1)',
  'Artur (5.1)',
  'Samir (5.1)',
  'Hristina (5.1)',
  'Yevhen (5.1)',
  'Alina (6.1)',
  'Agnessa (7.2)',
  'Mohammad (7.2)'
];

export const SCHEDULE: ASFSession[] = [
  // ASF 1 (Tun/Can), Room: W204
  { id: 'asf1-tue-1', label: 'ASF 1', teacher: 'Tun/Can', room: 'W204', day: 2, startTime: '09:50', endTime: '11:20', students: STUDENTS_ASF1 },
  { id: 'asf1-thu-2', label: 'ASF 1', teacher: 'Tun', room: 'W204', day: 4, startTime: '11:40', endTime: '13:10', students: STUDENTS_ASF1 },
  { id: 'asf1-tue-3', label: 'ASF 1', teacher: 'Tun/Can', room: 'W204', day: 2, startTime: '11:40', endTime: '13:10', students: STUDENTS_ASF1 },

  // ASF 2 (Woi), Room: W204
  { id: 'asf2-thu-1', label: 'ASF 2', teacher: 'Woi', room: 'W204', day: 4, startTime: '09:50', endTime: '11:20', students: STUDENTS_ASF2 },
  { id: 'asf2-wed-1', label: 'ASF 2', teacher: 'Woi', room: 'W204', day: 3, startTime: '09:50', endTime: '11:20', students: STUDENTS_ASF2 },
  { id: 'asf2-tue-1', label: 'ASF 2', teacher: 'Woi', room: 'W204', day: 2, startTime: '11:40', endTime: '13:10', students: STUDENTS_ASF2 }
];

export const BEEP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
