# CronMower

<img src="./logo.webp" style="width:256px; height:256px">

CronMower is a server for triggering endpoints remotely.

## Installation

```bash
npm install -g cronmower
```

## Usage

To start the server, run the following command:

```bash
cronmower [options]
```

### Options

- `-p, --port <number>`: The port on which the server runs (default: 3042).
- `-f, --fetch-schedule <string>`: The cron schedule for fetching schedules from the `fetchEndpoint` (default: '0 _/6 _ \* \*' - every 6 hours).
- `-e, --fetch-endpoint <string>`: The endpoint from which to fetch the schedules (default: 'http://localhost:3000/api/cron/schedules').
- `-v, --verbose`: Turn on verbose logging.

- `-l, --schedule-length <number>`: The time period in minutes for which each schedule runs (default: 1440 - 24 hours). \*Does not work

### Endpoints

- `PATCH /`: Update the server's schedules. Accepts an object where each key is an endpoint and the value is the corresponding cron schedule. If the schedule is an empty string, the endpoint is removed from the schedules.
- `GET /`: Displays a simple HTML page explaining the server's purpose.
- `GET /schedules`: Returns a JSON object containing the list of schedules.

## License

This project is licensed under the MIT License.
