export const DEFAULT_PLAN = [
  {
    id: 'day1', label: 'Día 1', color: '#22c55e',
    exercises: [
      { id: 'squat', name: 'Sentadilla', sets: 3, reps: '8', allowBW: false },
      { id: 'bench', name: 'Press de banca', sets: 3, reps: '8', allowBW: false },
      { id: 'pullup', name: 'Dominadas / Jalón', sets: 3, reps: '8', allowBW: true },
      { id: 'row', name: 'Remo con barra', sets: 3, reps: '10', allowBW: false },
      { id: 'ohp', name: 'Press militar', sets: 3, reps: '10', allowBW: false },
    ],
  },
  {
    id: 'day2', label: 'Día 2', color: '#eab308',
    exercises: [
      { id: 'rdl', name: 'Peso muerto rumano', sets: 3, reps: '8', allowBW: false },
      { id: 'lunge', name: 'Zancadas', sets: 3, reps: '10/pierna', allowBW: false },
      { id: 'dips', name: 'Fondos / Press inclinado', sets: 3, reps: '10', allowBW: true },
      { id: 'hipthrust', name: 'Hip thrust', sets: 3, reps: '12', allowBW: false },
      { id: 'curl', name: 'Curl de bíceps', sets: 3, reps: '12', allowBW: false },
      { id: 'plank', name: 'Plancha / Dead bug', sets: 3, reps: '30-45s', allowBW: true },
    ],
  },
  {
    id: 'day3', label: 'Día 3', color: '#f97316',
    exercises: [
      { id: 'bulgarian', name: 'Búlgara / Prensa', sets: 3, reps: '10', allowBW: false },
      { id: 'lateral', name: 'Elevaciones laterales', sets: 3, reps: '15', allowBW: false },
      { id: 'facepull', name: 'Face pulls', sets: 3, reps: '15', allowBW: false },
      { id: 'hammer', name: 'Curl martillo', sets: 3, reps: '12', allowBW: false },
      { id: 'tricep', name: 'Extensión tríceps', sets: 3, reps: '12', allowBW: false },
      { id: 'hyper', name: 'Hiperextensiones / Ab wheel', sets: 3, reps: '12', allowBW: true },
    ],
  },
];

export const DEFAULT_PLANS = {
  activePlanId: 'plan1',
  plans: [{ id: 'plan1', name: 'Full Body', days: DEFAULT_PLAN }],
};
