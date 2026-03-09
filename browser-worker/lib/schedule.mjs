const SINGAPORE_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseIntervalMinutes(scheduleValue) {
  if (typeof scheduleValue === "number") {
    return scheduleValue;
  }

  if (typeof scheduleValue !== "string" || scheduleValue.trim().length === 0) {
    return 60;
  }

  const parsed = Number.parseInt(scheduleValue, 10);
  return Number.isNaN(parsed) ? 60 : parsed;
}

function parseDailyTime(scheduleValue) {
  if (typeof scheduleValue !== "string") {
    return null;
  }

  const match = scheduleValue.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function isJobDue(job, now = new Date()) {
  if (!job.enabled) {
    return false;
  }

  if (!job.nextRunAt) {
    return true;
  }

  return job.nextRunAt.getTime() <= now.getTime();
}

export function computeNextRunAt(job, now = new Date()) {
  if (job.scheduleKind === "manual") {
    return null;
  }

  if (job.scheduleKind === "interval_minutes") {
    const intervalMinutes = parseIntervalMinutes(job.scheduleValue);
    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }

  if (job.scheduleKind === "daily_time") {
    const target = parseDailyTime(job.scheduleValue);

    if (!target) {
      return null;
    }

    const singaporeNowMs = now.getTime() + SINGAPORE_UTC_OFFSET_MS;
    const singaporeNow = new Date(singaporeNowMs);

    let targetSingaporeMs = Date.UTC(
      singaporeNow.getUTCFullYear(),
      singaporeNow.getUTCMonth(),
      singaporeNow.getUTCDate(),
      target.hours,
      target.minutes,
      0,
      0
    );

    if (targetSingaporeMs <= singaporeNowMs) {
      targetSingaporeMs += 24 * 60 * 60 * 1000;
    }

    return new Date(targetSingaporeMs - SINGAPORE_UTC_OFFSET_MS);
  }

  return null;
}
