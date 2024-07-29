#!/usr/bin/env node
import {
  CRONI_FETCH_SCHEDULE,
  CRONI_FETCH_ENDPOINT,
  CRONI_SCHEDULE_LENGTH,
  CRONI_VERBOSE,
  CRONI_PORT,
} from "./config.mjs";
import { program } from "commander";
import CroniServer from "./index.mjs";

const options = program
  .option(
    "-p, --port <number>",
    "The port on which the server runs",
    CRONI_PORT
  )
  .option(
    "-f, --fetch-schedule <string>",
    "The cron schedule for fetching schedules",
    CRONI_FETCH_SCHEDULE
  )
  .option(
    "-e, --fetch-endpoint <string>",
    "The endpoint from which to fetch the schedules",
    CRONI_FETCH_ENDPOINT
  )
  .option(
    "-l, --schedule-length <number>",
    "The time period in minutes for which each schedule runs",
    CRONI_SCHEDULE_LENGTH
  )
  .option("-v, --verbose [boolean]", "Verbose mode", CRONI_VERBOSE)
  .parse(process.argv)
  .opts();
const server = new CroniServer({
  ...options,
  scheduleLength: parseInt(options.scheduleLength),
  port: parseInt(options.port),
});
server.start();
