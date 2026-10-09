export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const weightFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const formatWeight = (value) => {
  if (value === 'PC') return 'PC';
  const kg = parseFloat(value);
  return Number.isNaN(kg) ? null : `${weightFormat.format(kg)} kg`;
};

export const getLastWeight = (session, exId) => session?.exercises[exId]?.[1]?.weight || null;
