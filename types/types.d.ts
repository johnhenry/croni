declare module "croni" {
  interface CroniServerOptions {
    port?: number;
    fetchSchedule?: string;
    fetchEndpoint?: string;
    scheduleLength?: number;
    verbose?: boolean;
  }

  class CroniServer {
    constructor(options: CroniServerOptions);
    start(): void;
  }
  export const CroniServer = CroniServer;

  export default CroniServer;
}
