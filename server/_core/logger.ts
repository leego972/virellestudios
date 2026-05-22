/**
   * Structured logging utility for the server.
   * Outputs JSON-formatted logs for easy parsing by log aggregators.
   */

  type LogLevel = "debug" | "info" | "warn" | "error";

  interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    [key: string]: unknown;
  }

  function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  export type ChildLogger = ReturnType<typeof createChildLogger>;

  function createChildLogger(bindings: Record<string, unknown>) {
    return {
      debug(message: string, meta?: Record<string, unknown>) {
        if (process.env.NODE_ENV === "production") return;
        console.debug(JSON.stringify(formatLog("debug", message, { ...bindings, ...meta })));
      },
      info(message: string, meta?: Record<string, unknown>) {
        console.log(JSON.stringify(formatLog("info", message, { ...bindings, ...meta })));
      },
      warn(message: string, meta?: Record<string, unknown>) {
        console.warn(JSON.stringify(formatLog("warn", message, { ...bindings, ...meta })));
      },
      error(message: string, meta?: Record<string, unknown>) {
        console.error(JSON.stringify(formatLog("error", message, { ...bindings, ...meta })));
      },
      request(method: string, path: string, userId?: number, meta?: Record<string, unknown>) {
        this.info(`${method} ${path}`, { userId, type: "request", ...meta });
      },
      aiGeneration(action: string, userId: number, meta?: Record<string, unknown>) {
        this.info(`AI generation: ${action}`, { userId, type: "ai-generation", ...meta });
      },
      errorWithStack(message: string, error: unknown, meta?: Record<string, unknown>) {
        const stack = error instanceof Error ? error.stack : String(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.error(message, { errorMessage, stack, ...meta });
      },
      child(childBindings: Record<string, unknown>) {
        return createChildLogger({ ...bindings, ...childBindings });
      },
    };
  }

  export const logger = {
    debug(message: string, meta?: Record<string, unknown>) {
      if (process.env.NODE_ENV === "production") return;
      console.debug(JSON.stringify(formatLog("debug", message, meta)));
    },

    info(message: string, meta?: Record<string, unknown>) {
      console.log(JSON.stringify(formatLog("info", message, meta)));
    },

    warn(message: string, meta?: Record<string, unknown>) {
      console.warn(JSON.stringify(formatLog("warn", message, meta)));
    },

    error(message: string, meta?: Record<string, unknown>) {
      console.error(JSON.stringify(formatLog("error", message, meta)));
    },

    /** Log an API request */
    request(method: string, path: string, userId?: number, meta?: Record<string, unknown>) {
      this.info(`${method} ${path}`, { userId, type: "request", ...meta });
    },

    /** Log an AI generation event */
    aiGeneration(action: string, userId: number, meta?: Record<string, unknown>) {
      this.info(`AI generation: ${action}`, { userId, type: "ai-generation", ...meta });
    },

    /** Log an error with stack trace */
    errorWithStack(message: string, error: unknown, meta?: Record<string, unknown>) {
      const stack = error instanceof Error ? error.stack : String(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error(message, { errorMessage, stack, ...meta });
    },

    /**
     * Create a child logger with pre-bound context fields.
     * All log calls on the child will include the provided bindings automatically.
     * Mirrors the pino .child() API so call-sites don't need to change.
     */
    child(bindings: Record<string, unknown>) {
      return createChildLogger(bindings);
    },
  };
  