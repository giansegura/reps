import { CURRENT_VERSION } from './migrate.js';
import { DELETED_DAY, deletedExercise, doneSets, localDate, localTime, noteText, setText } from './history.js';
import { nextColor } from './plan.js';
import { isObject, isValidPlan } from './schema.js';

export const PLAN_FILE_KIND = 'plan';

export const PLAN_INSTRUCTIONS = [
  'Este archivo es un plan de entrenamiento de la app Reps. El usuario te pedirá cambios. Devuélvele el archivo completo como archivo .json descargable, con la misma estructura.',
  '1. Cambia solo «plan». No hace falta que devuelvas «history»: está solo para que veas cómo entrena el usuario.',
  '2. Cada día y cada ejercicio tiene un «id». El historial del usuario va unido a ese id.',
  '   - Si mantienes un ejercicio, aunque le cambies el nombre, las series, las reps o las notas, conserva su «id».',
  '   - Si añades un ejercicio nuevo, o sustituyes uno por otro distinto, no le pongas «id».',
  '   - No uses el «id» de un ejercicio para otro ejercicio diferente.',
  '   - Lo mismo con los días.',
  '3. «sets»: número entero de 1 a 100. «reps»: texto, por ejemplo "8", "8-10", "30-45s" o "10/pierna". «allowBW»: true si el ejercicio se puede hacer con peso corporal. «notes»: texto.',
  '4. No cambies «app», «kind», «version» ni el «id» del plan.',
].join('\n');

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

const historyExercise = (ex, session) => {
  const sets = doneSets(session.exercises[ex.id]).map(setText);
  if (sets.length === 0) return [];
  const note = noteText(session.notes?.[ex.id]);
  return [{ id: ex.id, name: ex.name, sets, ...(note ? { note } : {}) }];
};

const sessionExercises = (day, session, known) => {
  const inDay = new Set(day.exercises.map(ex => ex.id));
  const others = Object.keys(session.exercises)
    .filter(id => !inDay.has(id))
    .map(id => known.get(id) ?? deletedExercise(id));
  return [...day.exercises, ...others];
};

const historyEntry = (plan, session, known) => {
  const day = plan.days.find(d => d.id === session.dayId) ?? DELETED_DAY;
  const date = new Date(session.date);
  return {
    date: `${localDate(date)} ${localTime(date)}`,
    day: day.label,
    dayId: session.dayId,
    exercises: sessionExercises(day, session, known).flatMap(ex => historyExercise(ex, session)),
  };
};

export const planHistory = (plan, sessions) => {
  const known = new Map(plan.days.flatMap(d => d.exercises.map(ex => [ex.id, ex])));
  return sessions
    .filter(s => s.planId === plan.id)
    .sort(byDate)
    .map(s => historyEntry(plan, s, known));
};

export const createPlanFile = (plan, sessions, now) => ({
  app: 'reps',
  kind: PLAN_FILE_KIND,
  version: CURRENT_VERSION,
  exportedAt: now.toISOString(),
  instructions: PLAN_INSTRUCTIONS,
  plan,
  history: planHistory(plan, sessions),
});

const slug = (name) => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'plan';

export const planFileName = (plan, now) => `reps-plan-${slug(plan.name)}-${localDate(now)}.json`;

const INVALID = { ok: false, reason: 'invalid' };
const NEWER = { ok: false, reason: 'newer' };
const BACKUP = { ok: false, reason: 'backup' };

const isVersion = (value) => Number.isInteger(value) && value >= 1;

const unwrap = (text) => {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const lines = trimmed.split('\n');
  const end = lines.length > 1 && lines.at(-1).trim().startsWith('```') ? -1 : undefined;
  return lines.slice(1, end).join('\n');
};

const idOf = (value) => (typeof value === 'string' ? value : crypto.randomUUID());

const setsOf = (value) => (typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : value);

const repsOf = (value) => (typeof value === 'number' ? String(value) : value);

const normalizeExercise = (ex) => {
  if (!isObject(ex)) return ex;
  return {
    id: idOf(ex.id),
    name: ex.name,
    sets: setsOf(ex.sets),
    reps: repsOf(ex.reps),
    allowBW: ex.allowBW === undefined ? false : !!ex.allowBW,
    notes: ex.notes ?? '',
  };
};

const normalizeDay = (day, previous) => {
  if (!isObject(day)) return day;
  const exercises = day.exercises === undefined ? [] : day.exercises;
  return {
    id: idOf(day.id),
    label: day.label,
    color: typeof day.color === 'string' ? day.color : nextColor(previous),
    exercises: Array.isArray(exercises) ? exercises.map(normalizeExercise) : exercises,
  };
};

const normalizeDays = (days) => {
  if (days === undefined) return [];
  if (!Array.isArray(days)) return days;
  return days.reduce((list, day) => [...list, normalizeDay(day, list.filter(isObject))], []);
};

const normalizePlan = (plan) => ({
  id: idOf(plan.id),
  name: plan.name,
  days: normalizeDays(plan.days),
});

export const parsePlanFile = (text) => {
  let data;
  try {
    data = JSON.parse(unwrap(text));
  } catch {
    return INVALID;
  }
  if (!isObject(data) || data.app !== 'reps') return INVALID;
  if (data.kind !== PLAN_FILE_KIND) return isObject(data.plans) && Array.isArray(data.sessions) ? BACKUP : INVALID;
  if (!isVersion(data.version)) return INVALID;
  if (data.version > CURRENT_VERSION) return NEWER;
  if (!isObject(data.plan)) return INVALID;
  const plan = normalizePlan(data.plan);
  return isValidPlan(plan) ? { ok: true, plan } : INVALID;
};

export const readPlanFile = async (file) => {
  try {
    return parsePlanFile(await file.text());
  } catch {
    return INVALID;
  }
};
