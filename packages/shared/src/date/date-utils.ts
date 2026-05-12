/**
 * Periodos de facturación en ISO / granularidad mensual típica SMS.
 */

const MONTH_REGEX = /^(\d{4})-(\d{2})$/;

export const DateUtils = Object.freeze({
  /**
   * Valida cadena ISO8601 parseable (instant o fecha).
   */
  isValidIsoDateTime(isoString: string): boolean {
    if (typeof isoString !== 'string' || isoString.length < 4) return false;
    const t = Date.parse(isoString);
    return Number.isFinite(t);
  },

  /**
   * Formato auxiliar YYYY-MM para etiquetas de periodo de factura (no timezone-aware billing window).
   */
  formatBillingMonth(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error('DateUtils.formatBillingMonth: invalid Date');
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  /**
   * Valida string tipo periodo mensual YYYY-MM.
   */
  isValidBillingMonthPeriod(period: string): boolean {
    if (typeof period !== 'string') return false;
    const m = MONTH_REGEX.exec(period.trim());
    if (!m) return false;
    const month = Number(m[2]);
    return month >= 1 && month <= 12;
  },

  /**
   * Primera instant UTC del mes (YYYY-MM) como ISO string.
   */
  billingMonthStartIso(this: typeof DateUtils, yyyyMm: string): string {
    if (!this.isValidBillingMonthPeriod(yyyyMm)) {
      throw new Error(`Invalid billing month period: ${yyyyMm}`);
    }
    const [y, mo] = yyyyMm.trim().split('-').map(Number) as [number, number];
    const d = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
    return d.toISOString();
  }
});
