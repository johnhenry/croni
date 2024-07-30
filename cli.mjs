#!/usr/bin/env node
import {
  CRONMOWER_FETCH_SCHEDULE,
  CRONMOWER_FETCH_ENDPOINT,
  CRONMOWER_SCHEDULE_LENGTH,
  CRONMOWER_VERBOSE,
  CRONMOWER_PORT,
} from "./config.mjs";
import { program } from "commander";
import CronMowerServer from "./index.mjs";

const options = program
  .option(
    "-p, --port <number>",
    "The port on which the server runs",
    CRONMOWER_PORT
  )
  .option(
    "-f, --fetch-schedule <string>",
    "The cron schedule for fetching schedules",
    CRONMOWER_FETCH_SCHEDULE
  )
  .option(
    "-e, --fetch-endpoint <string>",
    "The endpoint from which to fetch the schedules",
    CRONMOWER_FETCH_ENDPOINT
  )
  .option(
    "-l, --schedule-length <number>",
    "The time period in minutes for which each schedule runs",
    CRONMOWER_SCHEDULE_LENGTH
  )
  .option("-v, --verbose [boolean]", "Verbose mode", CRONMOWER_VERBOSE)
  .parse(process.argv)
  .opts();
const server = new CronMowerServer({
  ...options,
  scheduleLength: parseInt(options.scheduleLength),
  port: parseInt(options.port),
});

await server.startFetchingSchedules();
server.start();
