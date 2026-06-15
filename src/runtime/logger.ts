/**
 * Structured logger for over-review.
 * @packageDocumentation
 */

export interface RunLogFields {
  eventName: string;
  repo?: string;
  prNumber?: number;
  reviewMode?: 'full' | 'incremental';
  commitCount?: number;
  fileCount?: number;
  provider?: string;
  model?: string;
  summarySuccess?: boolean;
  submittedCommentCount?: number;
  skippedCommentCount?: number;
  dryRun?: boolean;
  outcome?: string;
  reason?: string;
  title?: string;
  error?: string;
  needsAttention?: boolean;
  findingsCount?: number;
  total?: number;
  filtered?: number;
  inline?: number;
  count?: number;
  summaryLength?: number;
  hasExisting?: boolean;
  filePath?: string;
  line?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  child(fields: Partial<RunLogFields>): Logger;
  debug(message: string, fields?: Partial<RunLogFields>): void;
  info(message: string, fields?: Partial<RunLogFields>): void;
  warn(message: string, fields?: Partial<RunLogFields>): void;
  error(message: string, fields?: Partial<RunLogFields>): void;
}

export function createLogger(
  baseFields: Partial<RunLogFields> = {},
  level: LogLevel = 'info'
): Logger {
  return new ConsoleLogger(baseFields, level);
}

class ConsoleLogger implements Logger {
  constructor(
    private readonly baseFields: Partial<RunLogFields>,
    private readonly level: LogLevel
  ) {}

  child(fields: Partial<RunLogFields>): Logger {
    return new ConsoleLogger({ ...this.baseFields, ...fields }, this.level);
  }

  debug(message: string, fields: Partial<RunLogFields> = {}): void {
    this.write('debug', console.debug, message, fields);
  }

  info(message: string, fields: Partial<RunLogFields> = {}): void {
    this.write('info', console.info, message, fields);
  }

  warn(message: string, fields: Partial<RunLogFields> = {}): void {
    this.write('warn', console.warn, message, fields);
  }

  error(message: string, fields: Partial<RunLogFields> = {}): void {
    this.write('error', console.error, message, fields);
  }

  private write(
    level: LogLevel,
    sink: (message?: unknown, ...optionalParams: unknown[]) => void,
    message: string,
    fields: Partial<RunLogFields>
  ): void {
    if (!shouldLog(this.level, level)) {
      return;
    }

    sink(
      JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...this.baseFields,
        ...fields,
      })
    );
  }
}

function shouldLog(configuredLevel: LogLevel, messageLevel: LogLevel): boolean {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return order.indexOf(messageLevel) >= order.indexOf(configuredLevel);
}
