/**
 * Soft hospitality blip for a new in-thread message.
 * No asset file — Web Audio oscillator. Skips when reduced-motion or autoplay blocked.
 */

let sharedContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioCtx();
  }
  return sharedContext;
}

/** Call from a user gesture so later alerts can play without blocking. */
export async function unlockChatAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Autoplay policy — stay silent until a later gesture.
    }
  }
}

export function prefersChatAlertSound(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function playChatAlertSound() {
  if (!prefersChatAlertSound()) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    return;
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(390, now + 0.22);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);
}
