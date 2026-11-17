const weightFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const formatWeight = (value) => {
  if (value === 'PC') return 'PC';
  const kg = parseFloat(value);
  return Number.isNaN(kg) ? null : `${weightFormat.format(kg)} kg`;
};

const MISSING = '—';

const clean = (text) => text.replace(/[.,]/g, '');

const part = (date, options) => clean(date.toLocaleDateString('es-ES', options));

export const formatShortDate = (date) =>
  `${part(date, { weekday: 'short' })} ${date.getDate()} ${part(date, { month: 'short' })}`;

export const formatLongDate = (date) =>
  `${part(date, { weekday: 'long' })} ${date.getDate()} ${part(date, { month: 'short' })}`;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatDayAgo = (iso, now) => {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return formatShortDate(date);
};

export const formatRest = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const repsText = (reps) => String(reps ?? '').trim() || MISSING;

export const formatSet = (set) => `${formatWeight(set?.weight) ?? MISSING} × ${repsText(set?.reps)}`;

export const formatSets = (sets) => {
  if (sets.length === 0) return '';
  const weights = sets.map(set => formatWeight(set.weight) ?? MISSING);
  const sameWeight = weights.every(weight => weight === weights[0]);
  return sameWeight
    ? `${weights[0]} × ${sets.map(set => repsText(set.reps)).join(' · ')}`
    : sets.map(formatSet).join(' · ');
};
