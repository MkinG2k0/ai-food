/** Android plugin parses `schedule.at` only as UTC ISO (`…SSS'Z'`). */
export function toScheduleAtIso(date: Date): string {
  return date.toISOString();
}
