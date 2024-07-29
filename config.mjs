export const CRONMOWER_PORT = Number(process.env.CRONMOWER_PORT || 3042);
export const CRONMOWER_FETCH_SCHEDULE =
  process.env.CRONMOWER_FETCH_SCHEDULE || "1 * * * * *"; // every 1 minute
export const CRONMOWER_FETCH_ENDPOINT =
  process.env.CRONMOWER_FETCH_ENDPOINT ||
  `http://localhost:3000/api/cron/schedules`;
export const CRONMOWER_SCHEDULE_LENGTH = Number(
  process.env.CRONMOWER_SCHEDULE_LENGTH || 1440
); // 24 hours In minutes

export const CRONMOWER_VERBOSE = Boolean(process.env.CRONMOWER_SCHEDULE_LENGTH);
