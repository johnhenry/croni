// cronServer.js
import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";
import axios from "axios";

const { log, error } = console;
const Log = (on) => (on ? log : () => {});
const Error = (on) => (on ? error : () => {});
import {
  CRONI_FETCH_SCHEDULE,
  CRONI_FETCH_ENDPOINT,
  CRONI_SCHEDULE_LENGTH,
  CRONI_VERBOSE,
  CRONI_PORT,
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
    this.port = options.port || CRONI_PORT;
    this.fetchSchedule = options.fetchSchedule || CRONI_FETCH_SCHEDULE;
    this.fetchEndpoint = options.fetchEndpoint || CRONI_FETCH_ENDPOINT;
    this.scheduleLength = options.scheduleLength || CRONI_SCHEDULE_LENGTH;
    this.verbose = options.verbose || CRONI_VERBOSE;
    this.app = express();
    this.app.use(bodyParser.json());
    this.schedules = {};
    this.cronJobs = {};
    this.log = Log(options.verbose);
    this.error = Error(options.verbose);

    this.initRoutes();
    this.startFetchingSchedules();
  }

  /**
   * Initializes the routes for the application.
   */
  initRoutes() {
    this.app.patch("/", this.updateSchedules.bind(this));
    this.app.get("/", this.getRoot.bind(this));
    this.app.get("/schedules", this.getSchedules.bind(this));
  }

  /**
   * Starts fetching schedules.
   */
  startFetchingSchedules() {
    cron.schedule(this.fetchSchedule, this.fetchSchedules.bind(this));
  }

  /**
   * Fetches schedules from the specified endpoint.
   * @returns {Promise<void>} A promise that resolves when the schedules are fetched.
   */
  async fetchSchedules() {
    try {
      const response = await axios.get(this.fetchEndpoint);
      this.log("Fetched schedules:", response.data);
      this.update(response.data);
      this.log("Updated schedules:", this.schedules);
    } catch (error) {
      this.error("Error fetching schedules:", error.message);
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
        this.log(`Sending POST request to ${endpoint}`);
        await axios.post(endpoint);
        this.log(`Sent POST request to ${endpoint}`);
      } catch (error) {
        this.error(`Error sending POST request to ${endpoint}:`, error.message);
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
  start() {
    this.app.listen(this.port, () => {
      this.log(`Server is running on port ${this.port}`);
    });
  }
}

export default CronServer;
