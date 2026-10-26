const MISSING = '—';
const DELETED_PLAN = { name: 'Plan eliminado' };
const DELETED_DAY = { label: 'Día eliminado', exercises: [] };

const pad = (n) => String(n).padStart(2, '0');

const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const localTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const weekday = (date) => date.toLocaleDateString('es-ES', { weekday: 'long' });

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export const historyFileName = (now) => `reps-historial-${localDate(now)}.md`;

const countLine = (sessions) => {
  if (sessions.length === 0) return 'Entrenos: 0';
  const first = localDate(new Date(sessions[0].date));
  const last = localDate(new Date(sessions.at(-1).date));
  return `Entrenos: ${sessions.length} (del ${first} al ${last})`;
};

const header = (sessions, now) => [
  '# Historial de entrenamientos · Reps',
  '',
  `Exportado: ${localDate(now)} ${localTime(now)}`,
  countLine(sessions),
  'Pesos en kg. «PC» = peso corporal, sin carga añadida.',
  'Solo se incluyen las series marcadas como hechas. Formato: peso × repeticiones.',
];

const exerciseSummary = (ex) => `${ex.name} (${ex.sets}×${ex.reps})`;

const dayLine = (day) => `- ${day.label}: ${day.exercises.map(exerciseSummary).join(', ')}`;

const plansSection = (plansState) => [
  '## Planes',
  ...plansState.plans.flatMap(plan => ['', `### ${plan.name}`, ...plan.days.map(dayLine)]),
];

const weightText = (weight) => {
  const raw = String(weight ?? '').trim();
  if (raw === '') return MISSING;
  if (raw === 'PC') return 'PC';
  return `${raw.replace(',', '.')} kg`;
};

const repsText = (reps) => {
  const raw = String(reps ?? '').trim();
  return raw === '' ? MISSING : raw;
};

const setText = (set) => `${weightText(set.weight)} × ${repsText(set.reps)}`;

const doneSets = (exData = {}) => Object.keys(exData)
  .map(Number)
  .sort((a, b) => a - b)
  .map(n => exData[n])
  .filter(set => set?.done);

const noteText = (note) => (note ?? '').split(/\s*\n+\s*/).map(part => part.trim()).filter(Boolean).join(' / ');

const exerciseLines = (ex, exData, note) => {
  const sets = doneSets(exData);
  if (sets.length === 0) return [];
  const lines = [`- ${ex.name}: ${sets.map(setText).join(', ')}`];
  const text = noteText(note);
  if (text) lines.push(`  Nota: "${text}"`);
  return lines;
};

const deletedExercise = (id) => ({ id, name: `Ejercicio eliminado (${id.slice(0, 8)})` });

const findDay = (plansState, session) => {
  const plan = plansState.plans.find(p => p.id === session.planId) ?? DELETED_PLAN;
  const day = plan.days?.find(d => d.id === session.dayId) ?? DELETED_DAY;
  return { plan, day };
};

const sessionExercises = (day, session) => {
  const known = new Set(day.exercises.map(ex => ex.id));
  const orphans = Object.keys(session.exercises).filter(id => !known.has(id)).map(deletedExercise);
  return [...day.exercises, ...orphans];
};

const sessionBlock = (plansState, session) => {
  const { plan, day } = findDay(plansState, session);
  const date = new Date(session.date);
  return [
    '',
    `### ${localDate(date)} · ${weekday(date)} ${localTime(date)} · ${plan.name} › ${day.label}`,
    ...sessionExercises(day, session)
      .flatMap(ex => exerciseLines(ex, session.exercises[ex.id], session.notes?.[ex.id])),
  ];
};

const sessionsSection = (plansState, sessions) => [
  '## Entrenos',
  ...sessions.flatMap(s => sessionBlock(plansState, s)),
];

export const renderHistory = (plansState, sessions, now) => {
  const ordered = [...sessions].sort(byDate);
  const parts = [...header(ordered, now), '', ...plansSection(plansState), '', ...sessionsSection(plansState, ordered)];
  return `${parts.join('\n')}\n`;
};
