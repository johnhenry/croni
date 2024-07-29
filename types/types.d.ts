declare module "cronmower" {
  interface CronMowerServerOptions {
    port?: number;
    fetchSchedule?: string;
    fetchEndpoint?: string;
    scheduleLength?: number;
    verbose?: boolean;
  }

  class CronMowerServer {
    constructor(options: CronMowerServerOptions);
    start(): void;
  }
  export const CronMowerServer = CronMowerServer;

  export default CronMowerServer;
}
