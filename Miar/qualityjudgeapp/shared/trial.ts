export const FREE_TRIAL_ATTEMPT_LIMIT = 5;

export function getTrialStatus(usedAttempts: number, limit = FREE_TRIAL_ATTEMPT_LIMIT) {
  const used = Math.max(0, Math.floor(usedAttempts));
  const normalizedLimit = Math.max(1, Math.floor(limit));
  return {
    used,
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - used),
    exhausted: used >= normalizedLimit,
  };
}

export function canStartTrialAttempt(usedAttempts: number, limit = FREE_TRIAL_ATTEMPT_LIMIT) {
  return getTrialStatus(usedAttempts, limit).exhausted === false;
}
