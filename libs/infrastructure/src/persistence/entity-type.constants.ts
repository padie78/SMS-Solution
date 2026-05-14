/** Valores de `entityType` / prefijos de SK alineados con el estándar jerárquico. */
export const SingleTableEntityType = {
  REGION: 'REGION',
  BRANCH: 'BRANCH',
  /** Edificio / instalación física (ejemplo de negocio: SITE#…). */
  SITE: 'SITE',
  COST_CENTER: 'COST_CENTER',
  ASSET: 'ASSET',
  METER: 'METER',
  USER: 'USER',
  INV: 'INV',
  ORG_CONFIG: 'ORG_CONFIG',
  ALERT_RULE: 'ALERT_RULE',
  TARIFF: 'TARIFF',
  PRODUCTION_LOG: 'PRODUCTION_LOG',
  EMISSION_FACTOR: 'EMISSION_FACTOR'
} as const;

export type SingleTableEntityTypeKey = keyof typeof SingleTableEntityType;
