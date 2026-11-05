export function parseCalendarDate(value) {
  if (typeof value !== 'string') return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? parsed : null;
}

export function calculateAttachmentProgress(start, end, today = new Date()) {
  const startDate = parseCalendarDate(start);
  const endDate = parseCalendarDate(end);
  if (!startDate || !endDate || endDate < startDate) return null;
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const day = 86400000;
  const total = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / day) + 1);
  const elapsed = Math.max(0, Math.min(total, Math.floor((todayUTC - startDate.getTime()) / day) + 1));
  const remaining = Math.max(0, Math.ceil((endDate.getTime() - todayUTC) / day));
  const completed = todayUTC > endDate.getTime();
  return { elapsed, remaining, total, percent: Math.round((elapsed / total) * 100), completed, upcoming: todayUTC < startDate.getTime() };
}
