/** Interpret YYYY-MM-DD + HH:mm in the device local timezone → ISO string. */
export function timestampFromLocalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}
