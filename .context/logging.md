# Logging

The server uses [Pino](https://getpino.io/) for structured logging. All application code uses the logger — `console.log/warn/error` are reserved for CLI scripts only.

## Usage

```ts
import { createLogger } from '../lib/logger.js'

const log = createLogger('myModule')

// Info with structured data
log.info({ storyCount: 12, threshold: 3 }, 'starting assessment')

// Error with automatic stack trace serialization
log.error({ err, storyId: 'abc' }, 'assessment failed')

// Warning
log.warn({ url }, 'no content extracted')

// Debug (only shown when LOG_LEVEL=debug)
log.debug({ storyId, rating }, 'pre-assessment result')
```

### Key rules

1. **First argument** is always the structured data object (`{ key: value }`)
2. **Second argument** is the message string (human-readable, lowercase)
3. **Errors** go in `{ err }` — Pino serializes stack traces automatically, no need for `err.message`
4. **Module prefix** is set once via `createLogger('name')` — don't repeat it in messages
5. **Numeric/ID values** go in the data object, not interpolated into the message

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Minimum log level |
| `LOG_DIR` | `logs/` | Directory for rotating log files |
| `LOG_RETENTION_DAYS` | `14` | Daily log files to keep |

## Output

### Development (pino-pretty)

```
14:32:05.123 INFO  (myModule): starting assessment
    storyCount: 12
    threshold: 3
```

### Production (JSON)

```json
{"level":30,"time":"2025-06-15T14:32:05.123Z","module":"myModule","storyCount":12,"threshold":3,"msg":"starting assessment"}
```

## Transports

Two transports run in parallel via Pino's worker threads:

1. **Stdout** — `pino-pretty` in dev, raw JSON in production (captured by Render's log aggregator)
2. **Rotating file** — JSON logs written to `LOG_DIR/server.log`, rotated daily, kept for `LOG_RETENTION_DAYS` days

## Log Levels

| Level | When to use |
|---|---|
| `fatal` | Process is about to crash |
| `error` | Operation failed, needs attention |
| `warn` | Unexpected but recoverable (missing content, unknown IDs) |
| `info` | Normal operations (job started/completed, request served) |
| `debug` | Detailed diagnostic info (per-story results, batch details) |
| `trace` | Extremely verbose (rarely used) |

## File Locations

- **Logger module**: `server/src/lib/logger.ts`
- **HTTP middleware**: `server/src/app.ts` (pino-http)
- **Log output**: `logs/` directory (gitignored)

## Adding Logging to a New File

```ts
import { createLogger } from '../lib/logger.js'
const log = createLogger('myNewModule')
```

Use the module name that matches the file's domain (e.g., `scheduler`, `crawler`, `auth`, `stories`).

## Scripts

CLI scripts in `server/src/scripts/` use `console.log` directly since they are standalone tools, not part of the server process.
