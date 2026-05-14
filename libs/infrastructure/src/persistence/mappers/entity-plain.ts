/**
 * Copia enumerable de propiedades de datos de una instancia de entidad (excluye funciones).
 */
export function entityPlainRecord(entity: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(entity)) {
    const v = (entity as Record<string, unknown>)[key];
    if (typeof v !== 'function') {
      out[key] = v;
    }
  }
  return out;
}

export function omitKeys<T extends Record<string, unknown>>(source: T, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...source };
  for (const k of keys) {
    delete out[k];
  }
  return out;
}
