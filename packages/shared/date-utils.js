/**
 * Periodos de facturación en ISO / granularidad mensual típica SMS.
 */

const MONTH_REGEX = /^(\d{4})-(\d{2})$/;

export const DateUtils = Object.freeze({
  /**
   * Valida cadena ISO8601 parseable (instant o fecha).
   * @param {string} isoString
   * @returns {boolean}
   */
  isValidIsoDateTime(isoString) {
    if (typeof isoString !== 'string' || isoString.length < 4) return false;
    const t = Date.parse(isoString);
    return Number.isFinite(t);
  },

  /**
   * Formato auxiliar YYYY-MM para etiquetas de periodo de factura (no timezone-aware billing window).
   * @param {Date} date
   * @returns {string}
   */
  formatBillingMonth(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error('DateUtils.formatBillingMonth: invalid Date');
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  /**
   * Valida string tipo periodo mensual YYYY-MM.
   * @param {string} period
   * @returns {boolean}
   */
  isValidBillingMonthPeriod(period) {
    if (typeof period !== 'string') return false;
    const m = MONTH_REGEX.exec(period.trim());
    if (!m) return false;
    const month = Number(m[2]);
    return month >= 1 && month <= 12;
  },

  /**
   * Primera instant UTC del mes (YYYY-MM) como ISO string.
   * @param {string} yyyyMm
   * @returns {string}
   */
  billingMonthStartIso(yyyyMm) {
    if (!this.isValidBillingMonthPeriod(yyyyMm)) {
      throw new Error(`Invalid billing month period: ${yyyyMm}`);
    }
    const [y, mo] = yyyyMm.trim().split('-').map(Number);
    const d = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
    return d.toISOString();
  }
});
