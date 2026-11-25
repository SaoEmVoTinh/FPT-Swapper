"use client";

export type SoundKind = "message" | "notification";

const SOUND_PREF_KEY = "fpt_classswap_sound_enabled_v1";

let sharedCtx: AudioContext | null = null;
let lastPlayedAt = 0;
let unlockRegistered = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  sharedCtx = new Ctor();
  return sharedCtx;
}

/**
 * Unlock Web Audio on the first user gesture so later WebSocket/polling chimes play reliably.
 */
export function initSoundUnlock(): void {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(SOUND_PREF_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabledPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
  } catch {
    // ignore storage errors
  }
}

/**
 * Synthesize a crisp bell chime via Web Audio API (no external audio assets required).
 */
export function playNotificationBell(
  kind: SoundKind = "notification",
  force = false
): void {
  if (typeof window === "undefined") return;
  if (!force && !isSoundEnabled()) return;

  const nowMs = Date.now();
  if (!force && nowMs - lastPlayedAt < 700) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const playTones = () => {
    lastPlayedAt = Date.now();
    const start = ctx.currentTime + 0.01;
    const tones =
      kind === "message"
        ? [
            { freq: 1046.5, offset: 0, dur: 0.22, gain: 0.14 }, // C6
            { freq: 1318.5, offset: 0.11, dur: 0.34, gain: 0.16 }, // E6
          ]
        : [
            { freq: 880.0, offset: 0, dur: 0.24, gain: 0.14 }, // A5
            { freq: 1174.66, offset: 0.12, dur: 0.3, gain: 0.14 }, // D6
            { freq: 1567.98, offset: 0.24, dur: 0.45, gain: 0.12 }, // G6
          ];

    for (const t of tones) {
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const harmonicGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(t.freq, start + t.offset);

      harmonic.type = "triangle";
      harmonic.frequency.setValueAtTime(t.freq * 2, start + t.offset);

      gainNode.gain.setValueAtTime(0.0001, start + t.offset);
      gainNode.gain.exponentialRampToValueAtTime(t.gain, start + t.offset + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        start + t.offset + t.dur
      );

      harmonicGain.gain.setValueAtTime(0.0001, start + t.offset);
      harmonicGain.gain.exponentialRampToValueAtTime(
        t.gain * 0.22,
        start + t.offset + 0.012
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + t.offset + t.dur * 0.65
      );

      osc.connect(gainNode);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(start + t.offset);
      harmonic.start(start + t.offset);
      osc.stop(start + t.offset + t.dur + 0.02);
      harmonic.stop(start + t.offset + t.dur + 0.02);
    }
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(playTones)
      .catch(() => {
        // Browser blocked audio before user gesture
      });
  } else {
    playTones();
  }
}
