const BOSS_WAVE = 15;

export function isLateWaveComplete(state, targetWave) {
  if (targetWave >= BOSS_WAVE) {
    return state.wave >= targetWave && state.runStatus === "victory";
  }
  return state.wave >= targetWave && state.screen === "playing" && state.runStatus === "playing";
}

export function isUnexpectedLateWaveEnd(state, targetWave) {
  return state.runStatus !== "playing" && !isLateWaveComplete(state, targetWave);
}

export function shouldPrioritizeParry(state) {
  return state.parryTiming === "tooEarly"
    || state.parryTiming === "perfect"
    || state.parryTiming === "tooLate";
}

export function shouldDodgeTelegraph(state) {
  return state.parryTiming === "tooEarly" || state.parryTiming === "tooLate";
}
