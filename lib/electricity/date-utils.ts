export function calculateOverlapDays(
  periodStart: Date,
  periodEnd: Date,
  stayStart: Date,
  stayEnd: Date
) {
  const start = stayStart > periodStart ? stayStart : periodStart;
  const end = stayEnd < periodEnd ? stayEnd : periodEnd;
  if (start > end) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
}
