// cronServer.js
import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";
import axios from "axios";
import parser from "cron-parser";
import { TEXT_CRONMOWER } from "./ascii-art.mjs";
// import PACKAGE from "./package.json"  with { type: 'json' }
// (node:3838) ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time
// (Use `node --trace-warnings ...` to show where the warning was created)
const PACKAGE = {
  name: "cronmower",
};

const { log } = console;
const Log = (on) => (on ? log : () => {});

import {
  CRONMOWER_FETCH_SCHEDULE,
  CRONMOWER_FETCH_ENDPOINT,
  CRONMOWER_SCHEDULE_LENGTH,
  CRONMOWER_VERBOSE,
  CRONMOWER_PORT,
} from "./config.mjs";
/**
 * Represents a Cron Server that sends POST requests to configured endpoints on a cron schedule.
 */
class CronServer {
  /**
   * Creates an instance of CronServer.
   * @param {Object} options - The options for configuring the CronServer.
   * @param {number} options.port - The port on which the server should listen. If not provided, a default port will be used.
   * @param {string} options.fetchSchedule - The cron schedule for fetching schedules from the specified endpoint. If not provided, a default schedule will be used.
   * @param {string} options.fetchEndpoint - The endpoint from which to fetch schedules. If not provided, a default endpoint will be used.
   * @param {number} options.scheduleLength - The length of time (in minutes) for which a schedule is valid. If not provided, a default length will be used.
   */
  constructor(options = {}) {
    this.port = options.port || CRONMOWER_PORT;
    this.fetchEndpoint = options.fetchEndpoint || CRONMOWER_FETCH_ENDPOINT;
    this.fetchSchedule = options.fetchSchedule || CRONMOWER_FETCH_SCHEDULE;
    this.scheduleLength = options.scheduleLength || CRONMOWER_SCHEDULE_LENGTH;
    this.verbose = options.verbose || CRONMOWER_VERBOSE;
    this.app = express();
    // this.app.use(bodyParser.json());
    this.schedules = {};
    this.cronJobs = {};
    this.log = Log(options.verbose);
    this.log = (message, type = undefined) => {
      if (type) {
        return console.log(`${PACKAGE.name} [${type}] ${message}`, `\n`);
      }
      return console.log(message, `\n`);
    };

    this.initRoutes();
  }

  /**
   * Initializes the routes for the application.
   */
  initRoutes() {
    this.app.patch(
      "/schedules",
      bodyParser.text(),
      this.restartFetchSchedule.bind(this)
    );
    this.app.get("/schedules", this.getSchedules.bind(this));
    this.app.delete("/schedules", this.resetSchedules.bind(this));
    this.app.patch("/", bodyParser.json(), this.updateSchedules.bind(this));
    this.app.get("/", this.getRoot.bind(this));
  }
  /**
   * Restarts fetch schedule with optional new schdeule from body
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async restartFetchSchedule(req, res) {
    const fetchSchedule = await req.body;
    this.stopFetchingSchedules();
    this.fetchSchedule = fetchSchedule;
    this.startFetchingSchedules();
    this.log(`fetch schedule updated ${fetchSchedule}`, "info");
    res.sendStatus(200);
  }
  /**
   * Deletes schedules and forces refetch
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async resetSchedules(req, res) {
    Object.entries(this.schedules).forEach(([endpoint]) => {
      this.stopCronJob(endpoint);
      delete this.schedules[endpoint];
    });
    await this.fetchSchedules();
    res.sendStatus(200);
  }
  /**
   * Starts fetching schedules.
   */
  startFetchingSchedules() {
    this.cron = cron.schedule(
      this.fetchSchedule,
      this.fetchSchedules.bind(this)
    );
  }
  /**
   * Stopss fetching schedules.
   */
  stopFetchingSchedules() {
    this.cron.stop();
  }
  /**
   * Fetches schedules from the specified endpoint.
   * @returns {Promise<void>} A promise that resolves when the schedules are fetched.
   */
  async fetchSchedules() {
    try {
      this.status();
      const response = await axios.get(this.fetchEndpoint);
      this.update(response.data);
    } catch (error) {
      this.log(`Error fetching schedules: ${error.message}`, "error");
    }
  }

  /**
   * Starts a cron job for the specified endpoint and cron schedule.
   * @param {string} endpoint - The endpoint to send the POST request to.
   * @param {string} cronSchedule - The cron schedule for the cron job.
   */
  startCronJob(endpoint, cronSchedule) {
    this.cronJobs[endpoint] = cron.schedule(cronSchedule, async () => {
      try {
        this.log(endpoint, "ping");
        await axios.post(endpoint);
      } catch (error) {
        this.log(`error pinging ${endpoint}: ${error.message}`, "error");
      }
    });
  }

  /**
   * Stops the cron job for the specified endpoint.
   * @param {string} endpoint - The endpoint for which to stop the cron job.
   */
  stopCronJob(endpoint) {
    if (this.cronJobs[endpoint]) {
      this.cronJobs[endpoint].stop();
      delete this.cronJobs[endpoint];
    }
  }
  update(updatedSchedules) {
    Object.entries(updatedSchedules).forEach(([endpoint, cronSchedule]) => {
      const previous = this.schedules[endpoint];
      if (previous !== cronSchedule) {
        this.stopCronJob(endpoint);
        if (!cronSchedule) {
          delete this.schedules[endpoint];
        } else {
          this.schedules[endpoint] = cronSchedule;
          this.startCronJob(endpoint, cronSchedule);
        }
      }
    });
  }
  /**
   * Updates the schedules based on the provided request body.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async updateSchedules(req, res) {
    const updatedSchedules = await req.body;
    await this.update(updatedSchedules);
    res.sendStatus(200);
  }

  /**
   * Handles the root route request.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  getRoot(req, res) {
    res.send(`
      <html>
        <head>
          <title>Cron Ping Server</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <h1>Cron Ping Server</h1>
          <p>This server sends POST requests to configured endpoints on a cron schedule.</p>
          <p>The default fetch schedule is set to run every 6 hours (0 */6 * * *).</p>
        </body>
      </html>
    `);
  }

  /**
   * Handles the schedules route request.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  getSchedules(req, res) {
    const schedulesResponse = {};

    Object.entries(this.schedules).forEach(([endpoint, schedule]) => {
      schedulesResponse[endpoint] = {
        ...schedule,
      };
    });

    res.json(schedulesResponse);
  }

  /**
   * Starts the CronServer by listening on the specified port.
   */

  status() {
    const parsedSchedules = parser.parseExpression(this.fetchSchedule);
    const times = [];
    times.push(`last: ${parsedSchedules.next().toString()}`);
    this.log(`${this.fetchEndpoint}\n${times.join("\n")}`, "stat");
  }

  start() {
    this.startFetchingSchedules();
    this.app.listen(this.port, () => {
      this.log(TEXT_CRONMOWER, null);
      this.log(
        `server listening on port ${this.port} with fetchSchedule ${this.fetchSchedule}`,
        "init"
      );
    });
  }
}

export default CronServer;
