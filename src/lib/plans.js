const nextPlanName = (plans) => `Plan ${plans.length + 1}`;

export const createPlan = (plans, name) => ({
  id: crypto.randomUUID(),
  name: name.trim() || nextPlanName(plans),
  days: [],
});

const cloneExercise = (exercise) => ({ ...exercise, id: crypto.randomUUID() });

const cloneDay = (day) => ({
  ...day,
  id: crypto.randomUUID(),
  exercises: day.exercises.map(cloneExercise),
});

export const duplicatePlan = (plan) => ({
  id: crypto.randomUUID(),
  name: `${plan.name} (copia)`,
  days: plan.days.map(cloneDay),
});

export const addPlan = (state, plan, afterId) => {
  const index = state.plans.findIndex(p => p.id === afterId);
  const plans = index === -1
    ? [...state.plans, plan]
    : [...state.plans.slice(0, index + 1), plan, ...state.plans.slice(index + 1)];
  return { ...state, plans };
};

export const removePlan = (state, planId) => {
  const plans = state.plans.filter(p => p.id !== planId);
  const activePlanId = state.activePlanId === planId ? plans[0].id : state.activePlanId;
  return { activePlanId, plans };
};

export const renamePlan = (state, planId, name) => ({
  ...state,
  plans: state.plans.map(p => (p.id === planId ? { ...p, name } : p)),
});

export const setActivePlan = (state, planId) => ({ ...state, activePlanId: planId });

export const updatePlanDays = (state, planId, fn) => ({
  ...state,
  plans: state.plans.map(p => (p.id === planId ? { ...p, days: fn(p.days) } : p)),
});

export const getActivePlan = (state) =>
  state.plans.find(p => p.id === state.activePlanId) || state.plans[0];

export const findPlanByDay = (state, dayId) =>
  state.plans.find(p => p.days.some(d => d.id === dayId));

export const isValidPlansState = (data) =>
  !!data
  && typeof data === 'object'
  && typeof data.activePlanId === 'string'
  && Array.isArray(data.plans)
  && data.plans.length > 0;
