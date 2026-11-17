import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PLANS } from './data/plan.js';
import {
  ReadOnlyError,
  loadData,
  saveAllData,
  saveSessions,
  saveWIP,
  clearWIP,
  loadWIP,
  savePlans,
  requestPersistence,
} from './lib/storage.js';
import { appendSession, latestExerciseEntry } from './lib/session.js';
import { backupFileName, createBackup, readBackupFile } from './lib/backup.js';
import { historyFileName, renderHistory } from './lib/history.js';
import { createPlanFile, planFileName, readPlanFile } from './lib/planFile.js';
import { diffPlans, reconcilePlan, resolveImportTarget } from './lib/planImport.js';
import { shareOrDownload } from './lib/share.js';
import { linkSuperset, moveExercise, unlinkSuperset } from './lib/superset.js';
import {
  createDay,
  addDay,
  removeDay,
  moveDay,
  updateDay,
  createExercise,
  addExercise,
  updateExercise,
} from './lib/plan.js';
import {
  createPlan,
  duplicatePlan,
  addPlan,
  removePlan,
  renamePlan,
  replacePlan,
  withFreshIds,
  setActivePlan,
  updatePlanDays,
  getActivePlan,
  findPlanByDay,
} from './lib/plans.js';
import { ConfirmSheet } from './components/ConfirmSheet.jsx';
import { Home } from './components/Home.jsx';
import { Workout } from './components/Workout.jsx';
import { Plans } from './components/Plans.jsx';
import { Progress } from './components/Progress.jsx';
import { PlanList } from './components/PlanList.jsx';
import { PlanDay } from './components/PlanDay.jsx';
import { PlanExercise } from './components/PlanExercise.jsx';
import { PlanImport } from './components/PlanImport.jsx';
import { TabBar } from './components/TabBar.jsx';
import { Toast } from './components/Toast.jsx';
import { UpdateRequired } from './components/UpdateRequired.jsx';

const NEWER_DATA_TOAST = '✗ Tus datos son de una versión más nueva de Reps. Recarga la app';

const saveErrorToast = (e, fallback) => (e instanceof ReadOnlyError ? NEWER_DATA_TOAST : fallback);

const PLAN_FILE_ERRORS = {
  invalid: '✗ Archivo no válido',
  backup: '✗ Este archivo es una copia completa. Restáurala con «Importar copia» en Planes',
  newer: '✗ Este archivo es de una versión más nueva de Reps. Actualiza la app e inténtalo de nuevo',
};

const TABS = ['home', 'progress', 'plans'];

const NO_REST = { startedAt: null, alertSeconds: null };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const newPlanSummary = (plan) => {
  const exercises = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);
  return `«${plan.name}»: ${plural(plan.days.length, 'día', 'días')} y ${plural(exercises, 'ejercicio', 'ejercicios')}.`;
};

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [plansState, setPlansState] = useState(DEFAULT_PLANS);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [view, setView] = useState('home');
  const [activeDay, setActiveDay] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState({});
  const [currentNotes, setCurrentNotes] = useState({});
  const [workoutStartedAt, setWorkoutStartedAt] = useState(null);
  const [rest, setRest] = useState(NO_REST);
  const [progressPeriod, setProgressPeriod] = useState('week');
  const [progressMetric, setProgressMetric] = useState('volume');
  const [editingDayId, setEditingDayId] = useState(null);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [planImport, setPlanImport] = useState(null);
  const [question, setQuestion] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [newerData, setNewerData] = useState(false);
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

  const ask = (options) => new Promise((resolve) => setQuestion({ options, resolve }));

  const answer = (value) => {
    question.resolve(value);
    setQuestion(null);
  };

  const activePlan = getActivePlan(plansState);
  const plan = activePlan.days;
  const editingPlan = plansState.plans.find(p => p.id === editingPlanId);
  const editingDays = editingPlan?.days ?? [];
  const editingDay = editingDays.find(d => d.id === editingDayId);
  const editingExercise = editingDay?.exercises.find(e => e.id === editingExerciseId);

  const persistPlans = (state) => {
    savePlans(state).catch((e) => {
      console.error(e);
      showToast(saveErrorToast(e, '✗ Error guardando plan'));
    });
  };

  const commitPlans = (nextState) => {
    setPlansState(nextState);
    persistPlans(nextState);
  };

  const commitDays = (nextDays) =>
    commitPlans(updatePlanDays(plansState, editingPlanId, () => nextDays));

  const commitExercises = (fn) =>
    commitDays(editingDays.map(d => (d.id === editingDayId ? { ...d, exercises: fn(d.exercises) } : d)));

  const activatePlan = (planId) => {
    commitPlans(setActivePlan(plansState, planId));
    setView('home');
  };

  const openPlanEditor = (planId) => {
    setEditingPlanId(planId);
    setView('planList');
  };

  const closePlan = () => {
    setEditingPlanId(null);
    setView('plans');
  };

  const createNewPlan = () => {
    const newPlan = createPlan(plansState.plans, '');
    commitPlans(setActivePlan(addPlan(plansState, newPlan), newPlan.id));
    openPlanEditor(newPlan.id);
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

  const openPlanDay = (dayId) => {
    setEditingDayId(dayId);
    setView('planDay');
  };

  const addPlanDay = () => {
    const day = createDay(editingDays);
    commitDays(addDay(editingDays, day));
    openPlanDay(day.id);
  };

  const closePlanDay = () => {
    setEditingDayId(null);
    setView('planList');
  };

  const removePlanDay = () => {
    commitDays(removeDay(editingDays, editingDayId));
    closePlanDay();
    showToast('Día borrado');
  };

  const openPlanExercise = (exerciseId) => {
    setEditingExerciseId(exerciseId);
    setView('planExercise');
  };

  const closePlanExercise = () => {
    setEditingExerciseId(null);
    setView('planDay');
  };

  const addPlanExercise = () => {
    const exercise = createExercise();
    commitDays(addExercise(editingDays, editingDayId, exercise));
    openPlanExercise(exercise.id);
  };

  const removePlanExercise = () => {
    commitExercises(exercises => unlinkSuperset(exercises, editingExerciseId).filter(e => e.id !== editingExerciseId));
    closePlanExercise();
    showToast('Ejercicio borrado');
  };

  const linkPlanExercise = (partnerId) =>
    commitExercises(exercises => (partnerId
      ? linkSuperset(exercises, editingExerciseId, partnerId)
      : unlinkSuperset(exercises, editingExerciseId)));

  const shareFile = async (file) => {
    try {
      await shareOrDownload(file);
    } catch (e) {
      console.error(e);
      showToast('✗ Error exportando');
    }
  };

  const exportData = () => {
    const now = new Date();
    const json = `${JSON.stringify(createBackup(plansState, sessions, now), null, 2)}\n`;
    return shareFile(new File([json], backupFileName(now), { type: 'application/json' }));
  };

  const exportHistory = () => {
    if (sessions.length === 0) {
      showToast('Aún no hay entrenos que exportar');
      return;
    }
    const now = new Date();
    const text = renderHistory(plansState, sessions, now);
    return shareFile(new File([text], historyFileName(now), { type: 'text/markdown' }));
  };

  const exportPlan = () => {
    const now = new Date();
    const json = `${JSON.stringify(createPlanFile(editingPlan, sessions, now), null, 2)}\n`;
    return shareFile(new File([json], planFileName(editingPlan, now), { type: 'application/json' }));
  };

  const savePlansNow = async (state) => {
    try {
      await savePlans(state);
      return true;
    } catch (e) {
      console.error(e);
      showToast(saveErrorToast(e, '✗ Error guardando plan'));
      return false;
    }
  };

  const addImportedPlan = async (imported) => {
    const accepted = await ask({
      title: 'Este plan no está en la app',
      text: `¿Añadirlo como plan nuevo? ${newPlanSummary(imported)}`,
      confirmLabel: 'Añadir plan',
    });
    if (!accepted) return;
    const fresh = withFreshIds(imported);
    const state = addPlan(plansState, fresh);
    if (!(await savePlansNow(state))) return;
    setPlansState(state);
    openPlanEditor(fresh.id);
    showToast('✓ Plan añadido');
  };

  const importPlan = async (file) => {
    const result = await readPlanFile(file);
    if (!result.ok) {
      showToast(PLAN_FILE_ERRORS[result.reason]);
      return;
    }
    const target = resolveImportTarget(plansState, editingPlanId, result.plan);
    if (target.kind === 'other') {
      showToast(`Este archivo es del plan «${target.name}». Ábrelo desde ese plan para importarlo`);
      return;
    }
    if (target.kind === 'new') {
      await addImportedPlan(result.plan);
      return;
    }
    const next = reconcilePlan(editingPlan, result.plan);
    setPlanImport({ plan: next, diff: diffPlans(editingPlan, next) });
    setView('planImport');
  };

  const closePlanImport = () => {
    setPlanImport(null);
    setView('planList');
  };

  const applyPlanImport = async () => {
    const state = replacePlan(plansState, planImport.plan);
    if (!(await savePlansNow(state))) return;
    setPlansState(state);
    closePlanImport();
    showToast('✓ Plan actualizado');
  };

  const importData = async (file) => {
    const result = await readBackupFile(file);
    if (!result.ok) {
      const messages = {
        newer: '✗ Esta copia es de una versión más nueva de Reps. Actualiza la app e inténtalo de nuevo',
        plan: '✗ Este archivo es de un solo plan. Impórtalo desde el plan con «Importar cambios»',
      };
      showToast(messages[result.reason] ?? '✗ Archivo no válido');
      return;
    }
    const summary = `${plural(result.plans.plans.length, 'plan', 'planes')} y ${plural(result.sessions.length, 'entreno', 'entrenos')}`;
    const accepted = await ask({
      title: '¿Reemplazar tus datos?',
      text: `Se reemplazarán tus datos por ${summary}.`,
      confirmLabel: 'Reemplazar',
      danger: true,
    });
    if (!accepted) return;
    try {
      await saveAllData({ plans: result.plans, sessions: result.sessions });
    } catch (e) {
      console.error(e);
      showToast(saveErrorToast(e, '✗ No hay espacio para importar'));
      return;
    }
    setPlansState(result.plans);
    setSessions(result.sessions);
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
      const data = await loadData({ onCorrupt });
      if (data.status === 'newer') {
        setNewerData(true);
        return;
      }
      setSessions(data.sessions);
      let activeState = data.plans ?? DEFAULT_PLANS;
      const wip = loadWIP();
      const wipPlan = wip && findPlanByDay(activeState, wip.dayId);
      const wipDay = wipPlan?.days.find(d => d.id === wip.dayId && d.exercises.length > 0);
      const resume = !!wipDay && await ask({
        title: 'Tienes un entreno sin terminar',
        text: `${wipPlan.name} · ${wipDay.label}`,
        confirmLabel: 'Retomar',
        cancelLabel: 'Descartar',
        dismissible: false,
      });
      if (resume) {
        if (wipPlan.id !== activeState.activePlanId) {
          activeState = setActivePlan(activeState, wipPlan.id);
          savePlans(activeState).catch(console.error);
        }
        setActiveDay(wipDay);
        setCurrentWorkout(wip.workout);
        setCurrentNotes(wip.notes || {});
        setWorkoutStartedAt(wip.startedAt ?? Date.now());
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
    const next = {};
    const notes = {};
    day.exercises.forEach(ex => {
      const last = latestExerciseEntry(sessions, activePlan.id, ex.id);
      if (last?.note) notes[ex.id] = last.note;
      next[ex.id] = {};
      for (let i = 1; i <= ex.sets; i++) {
        next[ex.id][i] = {
          weight: last?.sets?.[i]?.weight || '',
          reps: last?.sets?.[i]?.reps || '',
          done: false,
        };
      }
    });
    setActiveDay(day);
    setCurrentWorkout(next);
    const startedAt = Date.now();
    setCurrentNotes(notes);
    setWorkoutStartedAt(startedAt);
    setRest(NO_REST);
    setView('workout');
    saveWIP(activePlan.id, day.id, next, notes, startedAt);
  };

  const restartRest = (alertSeconds) => setRest({ startedAt: Date.now(), alertSeconds });

  const updateSet = (exId, setNum, patch) => {
    setCurrentWorkout(prev => {
      const next = {
        ...prev,
        [exId]: { ...prev[exId], [setNum]: { ...prev[exId]?.[setNum], ...patch } },
      };
      saveWIP(activePlan.id, activeDay.id, next, currentNotes, workoutStartedAt);
      return next;
    });
  };

  const saveNote = (exId, text) => {
    const trimmed = text.trim();
    const next = { ...currentNotes };
    if (trimmed) next[exId] = trimmed;
    else delete next[exId];
    setCurrentNotes(next);
    saveWIP(activePlan.id, activeDay.id, currentWorkout, next, workoutStartedAt);
  };

  const saveField = (exId, setNum, field, value) => updateSet(exId, setNum, { [field]: value });

  const togglePC = (exId, setNum) =>
    updateSet(exId, setNum, { weight: currentWorkout[exId]?.[setNum]?.weight === 'PC' ? '' : 'PC' });

  const toggleDone = (exId, setNum, alertSeconds) => {
    const done = !currentWorkout[exId]?.[setNum]?.done;
    if (done) restartRest(alertSeconds);
    updateSet(exId, setNum, { done });
  };

  const finishWorkout = async () => {
    const session = {
      planId: activePlan.id,
      dayId: activeDay.id,
      date: new Date().toISOString(),
      exercises: structuredClone(currentWorkout),
      notes: { ...currentNotes },
    };
    const next = appendSession(sessions, session);
    try {
      await saveSessions(next);
    } catch (e) {
      console.error(e);
      showToast(saveErrorToast(e, '✗ No se pudo guardar el entreno'));
      return;
    }
    setSessions(next);
    showToast('✓ Entreno guardado');
    exitWorkout();
  };

  const exitWorkout = () => {
    clearWIP();
    setView('home');
    setActiveDay(null);
    setCurrentWorkout({});
    setCurrentNotes({});
    setWorkoutStartedAt(null);
    setRest(NO_REST);
  };

  if (loadError) throw loadError;

  if (newerData) return <UpdateRequired />;

  const confirmSheet = question && (
    <ConfirmSheet {...question.options} onConfirm={() => answer(true)} onCancel={() => answer(false)} />
  );

  if (!ready) {
    return (
      <>
        <div className="app" />
        {confirmSheet}
      </>
    );
  }

  const tabbed = TABS.includes(view);

  return (
    <>
      <div className={`app${tabbed ? ' with-tabs' : ''}${view === 'workout' ? ' app-workout' : ''}`}>
        {view === 'home' && (
          <Home
            plan={plan}
            planName={activePlan.name}
            planId={activePlan.id}
            sessions={sessions}
            onStartWorkout={startWorkout}
            onOpenPlans={() => setView('plans')}
            onOpenPlan={() => openPlanEditor(activePlan.id)}
          />
        )}
        {view === 'progress' && (
          <Progress
            plan={activePlan}
            sessions={sessions}
            period={progressPeriod}
            metric={progressMetric}
            onPeriodChange={setProgressPeriod}
            onMetricChange={setProgressMetric}
          />
        )}
        {view === 'workout' && activeDay && (
          <Workout
            activeDay={activeDay}
            currentWorkout={currentWorkout}
            currentNotes={currentNotes}
            startedAt={workoutStartedAt}
            restStartedAt={rest.startedAt}
            restAlert={rest.alertSeconds}
            onRestartRest={restartRest}
            sessions={sessions}
            planId={activePlan.id}
            progressPeriod={progressPeriod}
            progressMetric={progressMetric}
            onProgressPeriodChange={setProgressPeriod}
            onProgressMetricChange={setProgressMetric}
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
            onActivate={activatePlan}
            onEdit={openPlanEditor}
            onDuplicate={duplicateExistingPlan}
            onRemove={removeExistingPlan}
            onCreate={createNewPlan}
            onExport={exportData}
            onExportHistory={exportHistory}
            onImport={importData}
          />
        )}
        {view === 'planList' && editingPlan && (
          <PlanList
            plan={editingDays}
            planName={editingPlan.name}
            onBack={closePlan}
            onRename={(name) => commitPlans(renamePlan(plansState, editingPlanId, name))}
            onOpenDay={openPlanDay}
            onAdd={addPlanDay}
            onMove={(dayId, delta) => commitDays(moveDay(editingDays, dayId, delta))}
            onExportPlan={exportPlan}
            onImportPlan={importPlan}
          />
        )}
        {view === 'planImport' && editingPlan && planImport && (
          <PlanImport
            planName={editingPlan.name}
            diff={planImport.diff}
            onApply={applyPlanImport}
            onCancel={closePlanImport}
          />
        )}
        {view === 'planDay' && editingDay && (
          <PlanDay
            day={editingDay}
            planId={editingPlanId}
            planName={editingPlan.name}
            sessions={sessions}
            onBack={closePlanDay}
            onUpdateDay={(patch) => commitDays(updateDay(editingDays, editingDayId, patch))}
            onAddExercise={addPlanExercise}
            onOpenExercise={openPlanExercise}
            onMoveExercise={(exId, delta) => commitExercises(exercises => moveExercise(exercises, exId, delta))}
            onRemoveDay={removePlanDay}
          />
        )}
        {view === 'planExercise' && editingDay && editingExercise && (
          <PlanExercise
            day={editingDay}
            exercise={editingExercise}
            onBack={closePlanExercise}
            onUpdate={(patch) => commitDays(updateExercise(editingDays, editingDayId, editingExerciseId, patch))}
            onLink={linkPlanExercise}
            onRemove={removePlanExercise}
          />
        )}
      </div>
      {tabbed && <TabBar view={view} onChange={setView} />}
      <Toast msg={toast.msg} visible={toast.visible} />
      {confirmSheet}
    </>
  );
}
