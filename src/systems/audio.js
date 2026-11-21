import { SOUNDTRACK } from '../data/catalog.js';

let audio = null;
let currentTrack = null;
let volume = 0.32;

export function setupAudio(settings = {}) {
  volume = Number(settings.volume ?? 0.32);
  if (!settings.soundEnabled || !settings.ambientAutoplay) return;
  playTrack(settings.selectedTrack || 'wind');
}

export function playTrack(trackId) {
  const track = SOUNDTRACK.find(entry => entry.id === trackId);
  if (!track) return false;
  try {
    if (!audio) audio = new Audio();
    audio.pause();
    audio.src = `./assets/audio/${track.file}`;
    audio.loop = true;
    audio.volume = volume;
    currentTrack = trackId;
    const promise = audio.play();
    if (promise?.catch) promise.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function setVolume(value) {
  volume = Math.max(0, Math.min(1, Number(value)));
  if (audio) audio.volume = volume;
}

export function toggleAudio(enabled) {
  if (!enabled) { if (audio) audio.pause(); return; }
  if (!audio || !audio.src) { playTrack(currentTrack || 'wind'); return; }
  audio.play().catch(() => {});
}

export function stopAudio() {
  if (audio) audio.pause();
}

export function getCurrentTrack() { return currentTrack; }
