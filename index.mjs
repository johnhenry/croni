// cronServer.js
import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";
import parser from "cron-parser";
import { TEXT_CRONMOWER } from "./ascii-art.mjs";
// import PACKAGE from "./package.json"  with { type: 'json' }
// (node:3838) ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time
// (Use `node --trace-warnings ...` to show where the warning was created)
const PACKAGE = {
  name: "cronmower",
};

const { log, table } = console;
const Log = (on) => (on ? log : () => {});
const Table = (on) => (on ? table : () => {});
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
class CronmowerServer {
  /**
   * Creates an instance of CronmowerServer.
   * @param {Object} options - The options for configuring the CronmowerServer.
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
    this.table = Table(options.vebose);

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
    this.app.delete("/[id]", this.deleteJob.bind(this));
    this.app.put("/[id]", this.startJob.bind(this));
  }
  /**
   * delete job
   * @param {Object} req - The request object. has "id" as route params
   * @param {Object} res - The response object.
   */
  async deleteJob(req, res) {
    const { id } = req.params;
    if (this.removeCronJob(id)) {
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  }
  /**
   * Starts a cron job for the specified endpoint.
   * @param {Object} req - The request object. has "id" as route params
   * @param {Object} res - The response object.
   */
  async startJob(req) {
    const { id } = req.params;
    const fetchSchedule = await req.body;
    this.startCronJob(id, fetchSchedule);
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
    this.log(`starting schedule fetch: ${this.fetchSchedule}`, "info");
    this.cron = cron.schedule(
      this.fetchSchedule,
      this.fetchSchedules.bind(this)
    );
  }
  /**
   * Stopss fetching schedules.
   */
  stopFetchingSchedules() {
    this.log("stopping schedule fetch", "info");
    this.cron.stop();
  }
  /**
   * Fetches schedules from the specified endpoint.
   * @returns {Promise<void>} A promise that resolves when the schedules are fetched.
   */
  async fetchSchedules() {
    try {
      this.status();
      this.log(`starting schedule fetch: ${this.fetchSchedule}`, "info");
      const response = await fetch(this.fetchEndpoint);
      this.update(await response.json());
      this.table(this.schedules);
    } catch (error) {
      this.log(`Error fetching schedules: ${error.message}`, "error");
    }
  }
  removeCronJob(endpoint) {
    if (this.schedules[endpoint]) {
      this.stopCronJob(endpoint);
      delete this.schedules[endpoint];
      return true;
    }
    return false;
  }

  /**
   * Starts a cron job for the specified endpoint and cron schedule.
   * @param {string} endpoint - The endpoint to send the POST request to.
   * @param {string} cronSchedule - The cron schedule for the cron job.
   */
  startCronJob(endpoint, cronSchedule = "") {
    if (this.cronJobs[endpoint]) {
      this.stopCronJob(endpoint);
    }
    if (!cronSchedule) {
      this.removeCronJob(endpoint);
      return;
    }
    this.log(`cronjob ${endpoint} started`, "info");
    this.cronJobs[endpoint] = cron.schedule(cronSchedule, async () => {
      try {
        this.log(endpoint, "ping");
        const { status } = await fetch(endpoint, { method: "POST" });
        if (status === 410) {
          this.removeCronJob(endpoint);
        }
      } catch (error) {
        this.log(`error pinging ${endpoint}: ${error.message}`, "error");
      }
    });
    s;
  }
  /**
   * Stops the cron job for the specified endpoint.
   * @param {string} endpoint - The endpoint for which to stop the cron job.
   */
  stopCronJob(endpoint) {
    if (this.cronJobs[endpoint]) {
      this.cronJobs[endpoint].stop();
      delete this.cronJobs[endpoint];
      this.log(`cronjob ${endpoint} stopped`, "info");
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
    this.update(updatedSchedules);
    res.sendStatus(200);
  }

  /**
   * Handles the root route request.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  getRoot(req, res) {
    const parsedSchedules = parser.parseExpression(this.fetchSchedule);

    res.send(`
      <html>
        <head>
          <title>Cronmower Server</title>
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
          <p>Previous fetch: ${parsedSchedules.prev().toString()}</p>
          <p>Upcoming fetch: ${parsedSchedules.next().toString()}</p>
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
   * Starts the CronmowerServer by listening on the specified port.
   */

  status() {
    const parsedSchedules = parser.parseExpression(this.fetchSchedule);
    const times = [];
    times.push(`prev: ${parsedSchedules.prev().toString()}`);
    times.push(`next: ${parsedSchedules.next().toString()}`);
    this.log(`${this.fetchEndpoint}\n${times.join("\n")}`, "stat");
  }

  start() {
    return new Promise((resolve, reject) => {
      this.app.listen(this.port, (error) => {
        if (error) {
          this.log(`error starting server: ${error.message}`, "error");
          reject(error);
          return;
        }
        this.log(TEXT_CRONMOWER, null);
        this.log(
          `server listening on port ${this.port} with fetchSchedule ${this.fetchSchedule}`,
          "init"
        );
        resolve();
      });
    });
  }
}

export default CronmowerServer;
