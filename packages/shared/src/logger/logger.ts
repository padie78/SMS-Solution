/**
 * Logs JSON línea única → friendly para CloudWatch Logs Insights.
 * Sin niveles dinámicos de librerías pesadas (Lambdas cold-start friendly).
 */

const serialize = (meta: unknown): string => {
  try {
    return JSON.stringify(meta ?? {});
  } catch {
    return '{"serialization":"failed"}';
  }
};

export const Logger = Object.freeze({
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(
      serialize({
        level: 'INFO',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(
      serialize({
        level: 'WARN',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(
      serialize({
        level: 'ERROR',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG_SMS === '1' || process.env.DEBUG === '1') {
      console.debug(
        serialize({
          level: 'DEBUG',
          msg: message,
          ts: new Date().toISOString(),
          ...(meta ?? {})
        })
      );
    }
  }
});
