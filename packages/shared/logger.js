/**
 * Logs JSON línea única → friendly para CloudWatch Logs Insights.
 * Sin niveles dinámicos de librerías pesadas (Lambdas cold-start friendly).
 */

const serialize = (meta) => {
  try {
    return JSON.stringify(meta ?? {});
  } catch {
    return '{"serialization":"failed"}';
  }
};

export const Logger = Object.freeze({
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [meta]
   */
  info(message, meta) {
    console.log(
      serialize({
        level: 'INFO',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  warn(message, meta) {
    console.warn(
      serialize({
        level: 'WARN',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  error(message, meta) {
    console.error(
      serialize({
        level: 'ERROR',
        msg: message,
        ts: new Date().toISOString(),
        ...(meta ?? {})
      })
    );
  },

  debug(message, meta) {
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
