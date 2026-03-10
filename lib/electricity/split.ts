export function calculateShares(totalAmount: number, stayDays: number[]) {
  const totalDays = stayDays.reduce((sum, days) => sum + days, 0);
  if (!totalDays) return stayDays.map(() => 0);

  const raw = stayDays.map((days) => (totalAmount * days) / totalDays);
  const rounded = raw.map((value) => Math.floor(value * 100) / 100);
  const delta = Number((totalAmount - rounded.reduce((a, b) => a + b, 0)).toFixed(2));

  if (delta !== 0 && rounded.length > 0) {
    rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + delta).toFixed(2));
  }

  return rounded;
}
