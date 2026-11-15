// The people each state is compared on: in each state, among those who pushed code in the year
// before the data was refreshed, the PER_STATE (80) likeliest to be busiest, by public
// repositories and followers. The build (scripts/build.mjs) and the daily history
// (scripts/history.mjs) both use it, so the history holds the same numbers the page shows.

// When the data was last fetched: the newest lookup in users.json, in milliseconds (0 if none).
export const refreshedAt = (users) => Math.max(0, ...Object.values(users).map((u) => u?.at ?? 0));

// Sets p.fair on everyone in people ({ login, state }) who is in their state's sample. now is the
// time the year is counted back from: the data's refresh time, so the sample depends only on the data.
export function markSample(people, profiles, perState, now) {
  const yearAgo = now - 365 * 86400000;
  const byState = {};
  for (const p of people) {
    const pr = profiles[p.login];
    p.fair = false;
    if (!pr || !pr.pushed || Date.parse(pr.pushed) < yearAgo) continue;
    (byState[p.state] ??= []).push([p, 2 * pr.repos + pr.followers / 5]);
  }
  for (const list of Object.values(byState)) {
    list.sort((a, b) => b[1] - a[1]);
    for (const [p] of list.slice(0, perState)) p.fair = true;
  }
}
