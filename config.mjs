export const CRONI_PORT = Number(process.env.CRONI_PORT || 3042);
export const CRONI_FETCH_SCHEDULE =
  process.env.CRONI_FETCH_SCHEDULE || "1 * * * * *"; // every 1 minute
export const CRONI_FETCH_ENDPOINT =
  process.env.CRONI_FETCH_ENDPOINT ||
  `http://localhost:3000/api/cron/schedules`;
export const CRONI_SCHEDULE_LENGTH = Number(
  process.env.CRONI_SCHEDULE_LENGTH || 1440
); // 24 hours In minutes

export const CRONI_VERBOSE = Boolean(process.env.CRONI_SCHEDULE_LENGTH);
