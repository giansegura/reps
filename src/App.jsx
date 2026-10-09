import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PLANS } from './data/plan.js';
import {
  loadSessions,
  saveSessions,
  saveWIP,
  clearWIP,
  loadWIP,
  loadPlans,
  savePlans,
  requestPersistence,
} from './lib/storage.js';
import { normalizeSessions, replaceSession } from './lib/session.js';
import { backupFileName, createBackup, readBackupFile } from './lib/backup.js';
import { shareOrDownload } from './lib/share.js';
import {
  createDay,
  addDay,
  removeDay,
  moveDay,
  updateDay,
  createExercise,
  addExercise,
  removeExercise,
  updateExercise,
  moveExercise,
} from './lib/plan.js';
import {
  createPlan,
  duplicatePlan,
  addPlan,
  removePlan,
  renamePlan,
  setActivePlan,
  updatePlanDays,
  getActivePlan,
  findPlanByDay,
} from './lib/plans.js';
import { Home } from './components/Home.jsx';
import { Workout } from './components/Workout.jsx';
import { Plans } from './components/Plans.jsx';
import { PlanList } from './components/PlanList.jsx';
import { PlanDay } from './components/PlanDay.jsx';
import { Toast } from './components/Toast.jsx';

const isFilled = (value) => value !== '' && value !== undefined;

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [plansState, setPlansState] = useState(DEFAULT_PLANS);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planReturnView, setPlanReturnView] = useState('home');
  const [view, setView] = useState('home');
  const [activeDay, setActiveDay] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState({});
  const [currentNotes, setCurrentNotes] = useState({});
  const [editingDayId, setEditingDayId] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState({ msg: '', visible: false });

  const toastTimer = useRef(null);
  const mountedRef = useRef(false);

  const showToast = (msg) => {
    setToast({ msg, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 2000);
  };

  const activePlan = getActivePlan(plansState);
  const plan = activePlan.days;
  const planSessions = sessions.filter(s => s.planId === activePlan.id);
  const editingPlan = plansState.plans.find(p => p.id === editingPlanId);
  const editingDays = editingPlan?.days ?? [];
  const editingDay = editingDays.find(d => d.id === editingDayId);

  const persistPlans = (state) => {
    savePlans(state).catch((e) => {
      console.error(e);
      showToast('✗ Error guardando plan');
    });
  };

  const persistSessions = (next) => {
    setSessions(next);
    saveSessions(next).catch((e) => {
      console.error(e);
      showToast('✗ Error guardando entreno');
    });
  };

  const commitPlans = (nextState) => {
    setPlansState(nextState);
    persistPlans(nextState);
  };

  const commitDays = (nextDays) =>
    commitPlans(updatePlanDays(plansState, editingPlanId, () => nextDays));

  const activatePlan = (planId) => {
    commitPlans(setActivePlan(plansState, planId));
    setView('home');
  };

  const openPlanEditor = (planId, returnView) => {
    setEditingPlanId(planId);
    setPlanReturnView(returnView);
    setView('planList');
  };

  const closePlan = () => {
    setEditingPlanId(null);
    setView(planReturnView);
  };

  const createNewPlan = () => {
    const name = prompt('Nombre del plan', `Plan ${plansState.plans.length + 1}`);
    if (name === null) return;
    const newPlan = createPlan(plansState.plans, name);
    commitPlans(setActivePlan(addPlan(plansState, newPlan), newPlan.id));
    openPlanEditor(newPlan.id, 'plans');
  };

  const duplicateExistingPlan = (planId) => {
    const source = plansState.plans.find(p => p.id === planId);
    commitPlans(addPlan(plansState, duplicatePlan(source), planId));
    showToast('Plan duplicado');
  };

  const removeExistingPlan = (planId) => {
    commitPlans(removePlan(plansState, planId));
    showToast('Plan borrado');
  };

  const addPlanDay = () => {
    const day = createDay(editingDays);
    commitDays(addDay(editingDays, day));
    setEditingDayId(day.id);
    setView('planDay');
  };

  const removePlanDay = (dayId) => {
    commitDays(removeDay(editingDays, dayId));
    showToast('Día borrado');
  };

  const closePlanDay = () => {
    setEditingDayId(null);
    setView('planList');
  };

  const exportData = async () => {
    const now = new Date();
    const json = `${JSON.stringify(createBackup(plansState, sessions, now), null, 2)}\n`;
    const file = new File([json], backupFileName(now), { type: 'application/json' });
    try {
      await shareOrDownload(file);
    } catch (e) {
      console.error(e);
      showToast('✗ Error exportando');
    }
  };

  const importData = async (file) => {
    const result = await readBackupFile(file);
    if (!result.ok) {
      showToast('✗ Archivo no válido');
      return;
    }
    const planCount = result.plans.plans.length;
    const sessionCount = result.sessions.length;
    const summary = `${planCount} ${planCount === 1 ? 'plan' : 'planes'} y ${sessionCount} ${sessionCount === 1 ? 'entreno' : 'entrenos'}`;
    if (!confirm(`Se reemplazarán tus datos por ${summary}. ¿Continuar?`)) return;
    commitPlans(result.plans);
    persistSessions(normalizeSessions(result.sessions, result.plans));
    setView('home');
    showToast('✓ Datos importados');
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    requestPersistence();
    (async () => {
      let corrupt = false;
      const onCorrupt = () => { corrupt = true; };
      const [loadedSessions, loadedPlans] = await Promise.all([loadSessions({ onCorrupt }), loadPlans({ onCorrupt })]);
      let activeState = loadedPlans ?? DEFAULT_PLANS;
      const normalized = normalizeSessions(loadedSessions, activeState);
      setSessions(normalized);
      if (normalized.length !== loadedSessions.length) {
        saveSessions(normalized).catch(console.error);
      }
      const wip = loadWIP();
      const wipPlan = wip && findPlanByDay(activeState, wip.dayId);
      const wipDay = wipPlan?.days.find(d => d.id === wip.dayId);
      if (wipDay && confirm(`Tienes un entreno sin terminar (${wipPlan.name} · ${wipDay.label}). ¿Retomar?`)) {
        if (wipPlan.id !== activeState.activePlanId) {
          activeState = setActivePlan(activeState, wipPlan.id);
          savePlans(activeState).catch(console.error);
        }
        setActiveDay(wipDay);
        setCurrentWorkout(wip.workout);
        setCurrentNotes(wip.notes || {});
        setView('workout');
      } else if (wip) {
        clearWIP();
      }
      setPlansState(activeState);
      setReady(true);
      if (corrupt) showToast('⚠ Había datos dañados: se ha guardado una copia aparte');
    })().catch(setLoadError);
  }, []);

  const startWorkout = (day) => {
    const lastSession = planSessions.find(s => s.dayId === day.id);
    const next = {};
    const notes = {};
    day.exercises.forEach(ex => {
      const prevNote = lastSession?.notes?.[ex.id];
      if (prevNote) notes[ex.id] = prevNote;
      const prev = lastSession?.exercises?.[ex.id];
      next[ex.id] = {};
      for (let i = 1; i <= ex.sets; i++) {
        next[ex.id][i] = {
          weight: prev?.[i]?.weight || '',
          reps: prev?.[i]?.reps || '',
          done: !!(prev?.[i]?.weight && prev?.[i]?.reps),
        };
      }
    });
    setActiveDay(day);
    setCurrentWorkout(next);
    setCurrentNotes(notes);
    setView('workout');
    saveWIP(activePlan.id, day.id, next, notes);
  };

  const updateSet = (exId, setNum, patch) => {
    setCurrentWorkout(prev => {
      const next = {
        ...prev,
        [exId]: { ...prev[exId], [setNum]: { ...prev[exId]?.[setNum], ...patch } },
      };
      saveWIP(activePlan.id, activeDay.id, next, currentNotes);
      return next;
    });
  };

  const saveNote = (exId, text) => {
    const trimmed = text.trim();
    const next = { ...currentNotes };
    if (trimmed) next[exId] = trimmed;
    else delete next[exId];
    setCurrentNotes(next);
    saveWIP(activePlan.id, activeDay.id, currentWorkout, next);
  };

  const saveField = (exId, setNum, field, value) => {
    const set = { ...currentWorkout[exId]?.[setNum], [field]: value };
    updateSet(exId, setNum, { [field]: value, done: isFilled(set.weight) && isFilled(set.reps) });
  };

  const togglePC = (exId, setNum) => {
    const set = currentWorkout[exId]?.[setNum] || {};
    const weight = set.weight === 'PC' ? '' : 'PC';
    updateSet(exId, setNum, { weight, done: isFilled(weight) && isFilled(set.reps) });
  };

  const toggleDone = (exId, setNum) =>
    updateSet(exId, setNum, { done: !currentWorkout[exId]?.[setNum]?.done });

  const finishWorkout = () => {
    const session = {
      planId: activePlan.id,
      dayId: activeDay.id,
      date: new Date().toISOString(),
      exercises: structuredClone(currentWorkout),
      notes: { ...currentNotes },
    };
    persistSessions(replaceSession(sessions, session));
    showToast('✓ Entreno guardado');
    exitWorkout();
  };

  const exitWorkout = () => {
    clearWIP();
    setView('home');
    setActiveDay(null);
    setCurrentWorkout({});
    setCurrentNotes({});
  };

  if (loadError) throw loadError;

  if (!ready) {
    return <div className="app" />;
  }

  return (
    <>
      <div className={`app${view === 'workout' ? ' app-wide' : ''}`}>
        {view === 'home' && (
          <Home
            plan={plan}
            planName={activePlan.name}
            sessions={planSessions}
            onStartWorkout={startWorkout}
            onOpenPlans={() => setView('plans')}
            onOpenPlan={() => openPlanEditor(activePlan.id, 'home')}
          />
        )}
        {view === 'workout' && activeDay && (
          <Workout
            activeDay={activeDay}
            currentWorkout={currentWorkout}
            currentNotes={currentNotes}
            onSaveField={saveField}
            onSaveNote={saveNote}
            onTogglePC={togglePC}
            onToggleDone={toggleDone}
            onFinish={finishWorkout}
            onExit={exitWorkout}
          />
        )}
        {view === 'plans' && (
          <Plans
            plans={plansState.plans}
            activePlanId={activePlan.id}
            sessions={sessions}
            onBack={() => setView('home')}
            onActivate={activatePlan}
            onEdit={(planId) => openPlanEditor(planId, 'plans')}
            onDuplicate={duplicateExistingPlan}
            onRemove={removeExistingPlan}
            onCreate={createNewPlan}
            onExport={exportData}
            onImport={importData}
          />
        )}
        {view === 'planList' && editingPlan && (
          <PlanList
            plan={editingDays}
            planName={editingPlan.name}
            sessions={sessions}
            onBack={closePlan}
            onRename={(name) => commitPlans(renamePlan(plansState, editingPlanId, name))}
            onOpenDay={(dayId) => { setEditingDayId(dayId); setView('planDay'); }}
            onAdd={addPlanDay}
            onRemove={removePlanDay}
            onMove={(dayId, delta) => commitDays(moveDay(editingDays, dayId, delta))}
          />
        )}
        {view === 'planDay' && editingDay && (
          <PlanDay
            day={editingDay}
            onBack={closePlanDay}
            onUpdateDay={(patch) => commitDays(updateDay(editingDays, editingDayId, patch))}
            onAddExercise={() => commitDays(addExercise(editingDays, editingDayId, createExercise()))}
            onUpdateExercise={(exId, patch) => commitDays(updateExercise(editingDays, editingDayId, exId, patch))}
            onRemoveExercise={(exId) => commitDays(removeExercise(editingDays, editingDayId, exId))}
            onMoveExercise={(exId, delta) => commitDays(moveExercise(editingDays, editingDayId, exId, delta))}
          />
        )}
      </div>
      <Toast msg={toast.msg} visible={toast.visible} />
    </>
  );
}
