const PERIOD_COUNT = { week: 8, month: 6 };

const numberFormat = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 1 });

const parseWeight = (weight) => parseFloat(String(weight ?? '').replace(',', '.'));

const parseReps = (reps) => parseInt(reps, 10);

const countedSets = (sessions, planId, exerciseId) => sessions
  .filter(s => s.planId === planId && s.exercises?.[exerciseId])
  .flatMap(s => Object.values(s.exercises[exerciseId])
    .filter(set => set?.done && parseReps(set.reps) > 0)
    .map(set => ({ date: new Date(s.date), weight: parseWeight(set.weight), reps: parseReps(set.reps) })));

const unitFor = (sets, exercise) => {
  if (sets.some(s => s.weight > 0)) return 'kg';
  return /\d\s*s$/i.test(exercise.reps ?? '') ? 's' : 'reps';
};

export const exerciseUnit = (sessions, planId, exercise) =>
  unitFor(countedSets(sessions, planId, exercise.id), exercise);

const startOfWeek = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const shift = (start, period, n) => (period === 'week'
  ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * n)
  : new Date(start.getFullYear(), start.getMonth() + n, 1));

const sameStretchEnd = (now, period) => {
  if (period === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() - 7);
    return end;
  }
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  if (now.getDate() > lastDay) return new Date(startOfMonth(now).getTime() - 1);
  return new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
};

const measure = (sets, unit, metric) => {
  const values = sets
    .filter(s => unit !== 'kg' || s.weight > 0)
    .map(s => {
      if (unit !== 'kg') return s.reps;
      return metric === 'max' ? s.weight : s.weight * s.reps;
    });
  if (values.length === 0) return 0;
  return metric === 'max' ? Math.max(...values) : values.reduce((sum, v) => sum + v, 0);
};

export const progressSeries = (sessions, planId, exercise, { period, metric, now }) => {
  const sets = countedSets(sessions, planId, exercise.id);
  const unit = unitFor(sets, exercise);
  const between = (from, to) => sets.filter(s => s.date >= from && s.date < to);
  const currentStart = period === 'week' ? startOfWeek(now) : startOfMonth(now);
  const count = PERIOD_COUNT[period];
  const periods = Array.from({ length: count }, (_, i) => {
    const start = shift(currentStart, period, i - (count - 1));
    return { start, value: measure(between(start, shift(start, period, 1)), unit, metric) };
  });
  const previousStart = shift(currentStart, period, -1);
  const stretchEnd = sameStretchEnd(now, period);
  const current = periods.at(-1).value;
  const previous = measure(sets.filter(s => s.date >= previousStart && s.date <= stretchEnd), unit, metric);
  const change = current === 0 || previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { unit, empty: sets.length === 0, periods, current, previous, change };
};

export const formatProgressValue = (value, unit) => `${numberFormat.format(value)} ${unit}`;

export const formatChange = (change) => {
  if (change > 0) return `▲ ${change} %`;
  if (change < 0) return `▼ ${Math.abs(change)} %`;
  return '= 0 %';
};

const sameMonth = (a, b) => !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const shortDay = (date) => date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export const periodLabel = (start, previousStart, period) => {
  if (period === 'month') return start.toLocaleDateString('es-ES', { month: 'short' });
  return sameMonth(start, previousStart) ? String(start.getDate()) : shortDay(start);
};

export const periodAriaLabel = (start, period) => (period === 'month'
  ? start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  : `Semana del ${shortDay(start)}`);
