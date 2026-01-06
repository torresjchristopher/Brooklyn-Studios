
import { KeyMapping } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const getFrequency = (noteStr: string): number => {
  const note = noteStr.slice(0, -1);
  const octave = parseInt(noteStr.slice(-1));
  const semitones = NOTES.indexOf(note) + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
};

// Core Synth Row (A-L)
export const PIANO_MAPPINGS: KeyMapping[] = [
  { key: 'a', note: 'C3', frequency: getFrequency('C3'), label: 'C3' },
  { key: 'w', note: 'C#3', frequency: getFrequency('C#3'), label: 'C#3' },
  { key: 's', note: 'D3', frequency: getFrequency('D3'), label: 'D3' },
  { key: 'e', note: 'D#3', frequency: getFrequency('D#3'), label: 'D#3' },
  { key: 'd', note: 'E3', frequency: getFrequency('E3'), label: 'E3' },
  { key: 'f', note: 'F3', frequency: getFrequency('F3'), label: 'F3' },
  { key: 't', note: 'F#3', frequency: getFrequency('F#3'), label: 'F#3' },
  { key: 'g', note: 'G3', frequency: getFrequency('G3'), label: 'G3' },
  { key: 'y', note: 'G#3', frequency: getFrequency('G#3'), label: 'G#3' },
  { key: 'h', note: 'A3', frequency: getFrequency('A3'), label: 'A3' },
  { key: 'u', note: 'A#3', frequency: getFrequency('A#3'), label: 'A#3' },
  { key: 'j', note: 'B3', frequency: getFrequency('B3'), label: 'B3' },
  { key: 'k', note: 'C4', frequency: getFrequency('C4'), label: 'C4' },
  { key: 'o', note: 'C#4', frequency: getFrequency('C#4'), label: 'C#4' },
  { key: 'l', note: 'D4', frequency: getFrequency('D4'), label: 'D4' },
  { key: 'p', note: 'D#4', frequency: getFrequency('D#4'), label: 'D#4' },
  { key: ';', note: 'E4', frequency: getFrequency('E4'), label: 'E4' },
];

// mixing/param row (Q-P handled via switch in App)
export const PARAM_CONTROLS = [
  { key: 'q', action: 'attack_up', label: 'Attack +' },
  { key: 'w', action: 'attack_down', label: 'Attack -' },
  { key: 'e', action: 'cutoff_up', label: 'Filter +' },
  { key: 'r', action: 'cutoff_down', label: 'Filter -' },
  { key: 't', action: 'noise_up', label: 'Noise +' },
  { key: 'y', action: 'noise_down', label: 'Noise -' },
  { key: 'u', action: 'release_up', label: 'Rel +' },
  { key: 'i', action: 'release_down', label: 'Rel -' },
];

export const PERFORMANCE_CONTROLS = [
  { key: 'z', action: 'octave_down', label: 'Octave -' },
  { key: 'x', action: 'octave_up', label: 'Octave +' },
  { key: 'c', action: 'detune_down', label: 'Detune -' },
  { key: 'v', action: 'detune_up', label: 'Detune +' },
  { key: 'm', action: 'publish', label: 'Instant Publish' },
];

export const SOUNDBOARD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const INITIAL_SOUNDBOARD_SLOTS = SOUNDBOARD_KEYS.map((key, idx) => ({
  id: parseInt(key),
  name: `Sample ${key}`,
  color: `hsla(${idx * 36}, 70%, 50%, 0.8)`,
}));

export const COMMUNITY_DEFAULTS = [
  { id: '1', name: 'Grand Piano 1920', author: 'KeySynth AI', themeColor: '#d1d5db', description: 'Deep wooden resonance with felt-tip attack.' },
  { id: '2', name: 'Acid Rain Forest', author: 'KeySynth AI', themeColor: '#22c55e', description: 'Liquid squelches over a bed of white noise rain.' },
  { id: '3', name: 'Cyberpunk Trumpet', author: 'KeySynth AI', themeColor: '#f43f5e', description: 'Metallic brass with saw-tooth distortion.' },
];
