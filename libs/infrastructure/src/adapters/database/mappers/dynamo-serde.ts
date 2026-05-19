/** Convierte `camelCase` a `snake_case` (solo ASCII). */
export function camelToSnakeKey(key: string): string {
  if (key === 'PK' || key === 'SK') {
    return key;
  }
  if (key === '_version') {
    return '_version';
  }
  return key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`).replace(/^_/, '');
}

export function deepKeysToSnakeCase(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepKeysToSnakeCase);
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      out[camelToSnakeKey(k)] = deepKeysToSnakeCase(v);
    }
    return out;
  }
  return value;
}

const TOP_LEVEL_KEY_MAP: Record<string, string> = {
  entityType: 'entity_type',
  recordCreatedAt: 'created_at',
  recordUpdatedAt: 'updated_at',
  iaExtractedData: 'ia_extracted_data',
  userValidatedData: 'user_validated_data'
};

/**
 * Serializa un modelo de persistencia (camelCase TS) a atributos DynamoDB (snake_case),
 * manteniendo `PK` y `SK` sin transformación. Los objetos anidados se convierten recursivamente.
 */
export function persistenceModelToDynamoAttributes(model: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(model)) {
    if (key === 'PK' || key === 'SK') {
      out[key] = raw;
      continue;
    }
    const dynamoKey = TOP_LEVEL_KEY_MAP[key] ?? camelToSnakeKey(key);
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && Object.getPrototypeOf(raw) === Object.prototype) {
      out[dynamoKey] = deepKeysToSnakeCase(raw);
      continue;
    }
    out[dynamoKey] = raw;
  }
  return out;
}

const DYNAMO_TOP_TO_MODEL: Record<string, string> = {
  entity_type: 'entityType',
  created_at: 'recordCreatedAt',
  updated_at: 'recordUpdatedAt',
  ia_extracted_data: 'iaExtractedData',
  user_validated_data: 'userValidatedData'
};

export function snakeToCamelKey(key: string): string {
  if (key === 'PK' || key === 'SK' || key === '_version') {
    return key;
  }
  return key.replace(/_([a-z0-9])/gi, (_, ch: string) => ch.toUpperCase());
}

export function deepKeysToCamelCase(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((el) =>
      el !== null && typeof el === 'object' && !Array.isArray(el) && Object.getPrototypeOf(el) === Object.prototype
        ? deepKeysToCamelCase(el)
        : el
    );
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      out[snakeToCamelKey(k)] = deepKeysToCamelCase(v);
    }
    return out;
  }
  return value;
}

/**
 * Convierte un ítem unmarshalled de DynamoDB (claves snake_case) al shape camelCase
 * esperado por los `*SingleTableMapper.toDomainEntity`.
 */
export function dynamoItemToPersistenceRecord(item: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    if (k === 'PK' || k === 'SK') {
      out[k] = v;
      continue;
    }
    if (k === '_version') {
      out._version = v;
      continue;
    }
    const modelKey = DYNAMO_TOP_TO_MODEL[k] ?? snakeToCamelKey(k);
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
      out[modelKey] = deepKeysToCamelCase(v);
      continue;
    }
    if (Array.isArray(v)) {
      out[modelKey] = deepKeysToCamelCase(v);
      continue;
    }
    out[modelKey] = v;
  }
  return out;
}
