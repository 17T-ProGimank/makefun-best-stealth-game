// Midnight Archive — generated sound, no audio files.
// One job: short WebAudio bleeps for footsteps, seals, alarms and endings.

export function makeAudio() {
  return { ctx: null, enabled: true, muted: false };
}

export function resumeAudio(audio) {
  if (!audio.ctx) {
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio.ctx = null;
    }
  }
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
}

function blip(audio, freq, dur, type, vol, when = 0) {
  if (!audio.ctx || audio.muted || !audio.enabled) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playFootstep(audio, sprinting) {
  blip(audio, sprinting ? 140 : 95, 0.07, 'triangle', sprinting ? 0.09 : 0.045);
}

export function playSeal(audio) {
  blip(audio, 660, 0.12, 'sine', 0.12);
  blip(audio, 990, 0.18, 'sine', 0.10, 0.09);
}

export function playSuspicious(audio) {
  blip(audio, 440, 0.15, 'square', 0.05);
  blip(audio, 415, 0.15, 'square', 0.05, 0.12);
}

export function playAlarm(audio) {
  blip(audio, 520, 0.22, 'sawtooth', 0.08);
  blip(audio, 392, 0.22, 'sawtooth', 0.08, 0.2);
  blip(audio, 520, 0.22, 'sawtooth', 0.08, 0.4);
}

export function playCaught(audio) {
  blip(audio, 220, 0.4, 'sawtooth', 0.1);
  blip(audio, 110, 0.6, 'sawtooth', 0.1, 0.15);
}

export function playLevelClear(audio) {
  [523, 659, 784, 1047].forEach((f, i) => blip(audio, f, 0.16, 'sine', 0.11, i * 0.11));
}

export function playVictory(audio) {
  [523, 659, 784, 1047, 1319].forEach((f, i) => blip(audio, f, 0.22, 'sine', 0.11, i * 0.13));
}
