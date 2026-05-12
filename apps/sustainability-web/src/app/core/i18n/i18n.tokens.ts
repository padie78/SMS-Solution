/**
 * Idiomas soportados por la app. Mantener en sync con `assets/i18n/*.json`.
 * Centralizado aquí para evitar strings mágicos en componentes.
 */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';
