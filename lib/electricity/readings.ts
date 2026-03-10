export type ReadingStatus = "VALID" | "RESET_REVIEW" | "CORRECTED";

type ReadingEvaluation = {
  status: ReadingStatus;
  units: number | null;
};

export function evaluateReading(current: number, previous: number): ReadingEvaluation {
  if (current < previous) {
    return { status: "RESET_REVIEW", units: null };
  }
  return { status: "VALID", units: current - previous };
}

export type ReadingLike = {
  readingDate: Date;
  currentReading: number;
  status: ReadingStatus;
};

const VALID_STATUSES: ReadingStatus[] = ["VALID", "CORRECTED"];

export function calculatePeriodUnits(
  readings: ReadingLike[],
  periodStart: Date,
  periodEnd: Date
) {
  const valid = readings
    .filter((reading) => VALID_STATUSES.includes(reading.status))
    .filter((reading) => reading.readingDate <= periodEnd)
    .sort((a, b) => a.readingDate.getTime() - b.readingDate.getTime());

  if (valid.length === 0) return 0;

  const endReading = valid[valid.length - 1];
  if (endReading.readingDate < periodStart) return 0;

  const baseline = [...valid].reverse().find((reading) => reading.readingDate < periodStart);
  if (!baseline) return 0;

  const delta = endReading.currentReading - baseline.currentReading;
  return delta > 0 ? Number(delta.toFixed(2)) : 0;
}
