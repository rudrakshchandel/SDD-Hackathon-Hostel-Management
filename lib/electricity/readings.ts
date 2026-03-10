type ReadingStatus = "VALID" | "RESET_REVIEW";

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
