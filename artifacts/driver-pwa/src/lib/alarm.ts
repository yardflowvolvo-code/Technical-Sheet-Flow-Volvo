// Loud, repeating alarm used when the driver is called to a dock.
// Uses the Web Audio API directly (no audio file needed) so it works
// offline and loads instantly.
//
// Browsers only allow audio playback after a real user gesture (tap/click).
// Call `unlockAudio()` from inside a click handler as early as possible
// (e.g. the first button the driver taps) so the alarm is guaranteed to be
// able to play later, even when triggered by a background poll/push with
// no gesture of its own.

let audioCtx: AudioContext | null = null;
let intervalId: number | null = null;
let playing = false;

export function unlockAudio() {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function playBeepPair() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [0, 0.18].forEach((offset, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "square";
    osc.frequency.value = i === 0 ? 880 : 1046;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.17);
  });
}

export function startAlarm() {
  if (playing) return;
  unlockAudio();
  playing = true;
  playBeepPair();
  intervalId = window.setInterval(playBeepPair, 900);
  if (navigator.vibrate) {
    navigator.vibrate([400, 150, 400, 150, 400]);
  }
}

export function stopAlarm() {
  playing = false;
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}

export function isAlarmPlaying() {
  return playing;
}
