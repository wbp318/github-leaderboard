// When the daily refresh is due. GitHub starts scheduled workflows late, sometimes hours late, and
// sometimes not at all, so refresh.yml is triggered every hour, and each trigger asks this whether
// to refresh: yes once the day's time (REFRESH_AT_UTC in refresh.yml) has come and the data is
// older than it. The first trigger after that time refreshes; the rest stop at once.

/** The day's refresh time, { hour, minute } in UTC, from refresh.yml's text, or null. */
export function dailyAt(yml) {
  const m = yml.match(/REFRESH_AT_UTC:\s*"(\d{1,2}):(\d{2})"/);
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

/** The latest refresh time at or before now (ms): today's, or yesterday's if today's is still to come. */
export function lastDue(now, { hour, minute }) {
  const d = new Date(now);
  d.setUTCHours(hour, minute, 0, 0);
  if (d.getTime() > now) d.setUTCDate(d.getUTCDate() - 1);
  return d.getTime();
}

/** Whether data saved at dataAt (ms, or NaN for none) needs refreshing now. */
export const refreshDue = (now, dataAt, at) => !(dataAt >= lastDue(now, at));
