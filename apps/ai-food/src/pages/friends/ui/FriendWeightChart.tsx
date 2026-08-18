import {
  WeightTrendChart,
  WEIGHT_VIEW_DAYS,
  getWeightTrendPoints,
} from '@/features/stats';

type FriendWeightChartProps = {
  weights: { date: string; kg: number }[];
  goalKg: number | null;
};

export function FriendWeightChart({
  weights,
  goalKg,
}: FriendWeightChartProps) {
  const today = new Date();
  const points = getWeightTrendPoints(
    weights.map((w, index) => ({ id: String(index), date: w.date, kg: w.kg })),
    WEIGHT_VIEW_DAYS,
    today,
  );
  if (points.length === 0) return null;

  const viewEnd = new Date(today);
  viewEnd.setHours(0, 0, 0, 0);
  const viewStart = new Date(viewEnd);
  viewStart.setDate(viewEnd.getDate() - (WEIGHT_VIEW_DAYS - 1));

  return (
    <WeightTrendChart
      points={points}
      goalKg={goalKg}
      viewStart={viewStart}
      viewEnd={viewEnd}
      interactive={false}
    />
  );
}
