/**
 * Paleta de colores para los tipos de sesión de conferencia.
 *
 * Debe coincidir exactamente con el CHECK de la migración 030 y con
 * VALID_COLORS en conferenceSessionTypesController.js — es una lista
 * cerrada a propósito: si se dejara un color libre a elección del usuario,
 * cualquier combinación de tono/tema podría terminar sin el contraste
 * mínimo AA. Con nombres fijos, cada uno ya tiene sus clases verificadas.
 *
 * Las clases están escritas literalmente (no `bg-${color}-500`): Tailwind
 * solo incluye en el CSS final las clases que puede ver tal cual escritas en
 * el código fuente, así que una plantilla armada en tiempo de ejecución a
 * partir del nombre del color simplemente no aparecería en el build.
 */
export const SESSION_TYPE_COLORS = [
  'blue', 'violet', 'amber', 'emerald', 'rose', 'cyan', 'orange', 'slate',
];

// Insignia sobre fondo claro/oscuro normal (tokens del tema): la usa el
// selector de tipo en ConferenceDetailPage. Mismo patrón que AREA_COLORS en
// LeadersPage — tinte de fondo + texto 700/300 con contraste ya probado.
const BADGE = {
  blue:    'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
  violet:  'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40',
  amber:   'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  rose:    'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
  cyan:    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
  orange:  'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40',
  slate:   'bg-muted text-muted-foreground border-border',
};

// Barra de acento sólida para la pantalla del salón (fondo oscuro fijo, no
// los tokens del tema — ver DisplayPage). Sin texto encima, así que no
// necesita el mismo cuidado de contraste que el badge.
const ACCENT = {
  blue: 'bg-blue-400', violet: 'bg-violet-400', amber: 'bg-amber-400',
  emerald: 'bg-emerald-400', rose: 'bg-rose-400', cyan: 'bg-cyan-400',
  orange: 'bg-orange-400', slate: 'bg-slate-400',
};

// Pastilla sólida para el selector de color al crear/editar un tipo.
const SWATCH = {
  blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500',
  orange: 'bg-orange-500', slate: 'bg-slate-500',
};

const FALLBACK = 'slate';

export const badgeClasses = (color) => BADGE[color] || BADGE[FALLBACK];
export const accentClasses = (color) => ACCENT[color] || ACCENT[FALLBACK];
export const swatchClasses = (color) => SWATCH[color] || SWATCH[FALLBACK];

export const COLOR_LABELS = {
  blue: 'Azul', violet: 'Violeta', amber: 'Ámbar', emerald: 'Esmeralda',
  rose: 'Rosa', cyan: 'Cian', orange: 'Naranja', slate: 'Gris',
};
