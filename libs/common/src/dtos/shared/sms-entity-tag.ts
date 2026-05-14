/** Discriminante single-table (`sms_et`) para todos los aggregates SMS. */
export type SmsEntityTag =
  | 'REG'
  | 'BR'
  | 'BLD'
  | 'CC'
  | 'AST'
  | 'MET'
  | 'USR'
  | 'INV'
  /** Config organización (saveOrgConfig / AppSync setup). */
  | 'ORG_CFG'
  /** Regla de alerta (saveAlertRule). */
  | 'ALR'
  /** Tarifa energía (saveTariff). */
  | 'TRF'
  /** Log de producción (saveProductionLog). */
  | 'PLOG'
  /** Factor de emisión (saveEmissionFactor). */
  | 'EMF';
