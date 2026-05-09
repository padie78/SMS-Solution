/**
 * Utilidad común para enriquecer las definiciones declarativas de los
 * formularios con el texto de ayuda (`help`) que muestra el icono
 * `ui-help-tip` al lado del label.
 *
 * Convención del proyecto: cada `*-form.config.ts` define un mapa
 * `FIELD_HELP_*: Partial<Record<keyof FormValue, string>>` con la descripción
 * de dominio del campo, y se compone con sus tabs vía `withHelp`.
 *
 * El `help` definido inline en el field def TIENE PRIORIDAD sobre el del mapa,
 * de modo que casos especiales (ej. variantes por contexto) se pueden seguir
 * declarando ad-hoc.
 */

interface FieldDefWithHelp {
  readonly key: string;
  readonly help?: string;
}

interface TabDefWithFields<F extends FieldDefWithHelp> {
  readonly fields: ReadonlyArray<F>;
}

/**
 * Recorre las tabs y, para cada field sin `help`, le inyecta el texto del
 * mapa correspondiente a su `key`. Devuelve una nueva estructura inmutable
 * (no muta el input).
 */
export function withHelp<F extends FieldDefWithHelp, T extends TabDefWithFields<F>>(
  tabs: ReadonlyArray<T>,
  helpMap: Readonly<Record<string, string>>
): ReadonlyArray<T> {
  return tabs.map(
    (tab) =>
      ({
        ...tab,
        fields: tab.fields.map(
          (f) =>
            ({
              ...f,
              help: f.help ?? helpMap[f.key]
            }) as F
        )
      }) as T
  );
}
