// Who gets their contributions looked up, and when (scripts/collect.mjs asks each run). In each
// state, the people who pushed code in the last year are ranked by how likely they are to be busy,
// 2 × public repositories + followers / 5, the score src/sample.mjs ranks the sample by. Then:
//   daily   the top PER_STATE (80), whom states are compared on, and the people always looked up
//           (the viewer, and people who added themselves). Looked up again every run.
//   weekly  the rest, up to ALL_ACTIVE (1,000) a state, for the county views. Each has a weekday,
//           from their login, and is looked up on it; a run that is missed is made up the next.
// Someone never looked up waits for a run with room: at most NEW_MAX new people a run, so the first
// runs after the weekly tier grows stay inside the workflow's time limit.
import { stateOf } from "./states.mjs";

export const DAY = 86400000;
/** A number from a login, the same every run. */
export const loginHash = (login) => [...login].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
/** The weekday (0-6, counted in whole UTC days since 1970) a weekly person is looked up on. */
export const slotOf = (login) => loginHash(login) % 7;
export const weekdayOf = (now) => Math.floor(now / DAY) % 7;

/**
 * The daily and weekly tiers, from profiles ({ login: { location, followers, repos, pushed } | null }).
 * extra: logins always looked up daily. scope: a Set of state codes, or null for every state.
 * The weekly tier comes round-robin by rank, a state's busiest first, so a run that stops early
 * has spread itself over every state.
 */
export function tiers(prof, extra = [], { perState = 80, allActive = 1000, now = Date.now(), scope = null } = {}) {
  const yearAgo = now - 365 * DAY;
  const byState = {};
  for (const [login, p] of Object.entries(prof)) {
    if (!p || !p.pushed || Date.parse(p.pushed) < yearAgo) continue;
    const st = stateOf(p.location);
    if (!st || (scope && !scope.has(st))) continue;
    (byState[st] ??= []).push([login, 2 * p.repos + p.followers / 5]);
  }
  const daily = new Set(extra);
  const rest = [];
  for (const st of Object.keys(byState).sort()) {
    const list = byState[st].sort((a, b) => b[1] - a[1]);
    for (const [login] of list.slice(0, perState)) daily.add(login);
    rest.push(list.slice(perState, Math.max(perState, allActive)).map(([login]) => login));
  }
  const weekly = [];
  const longest = Math.max(0, ...rest.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of rest) if (i < l.length && !daily.has(l[i])) weekly.push(l[i]);
  return { daily: [...daily], weekly };
}

/**
 * Who to look up this run, in order: the daily tier's stale entries, then the weekly tier's due
 * ones, then up to newMax never looked up (or whose last lookup failed). users is users.json;
 * contribMax is how old a daily entry may be, in milliseconds. always: logins looked up every run,
 * however recent (the viewer and people who added themselves, so a change to their profile shows on
 * the next refresh, even one started by hand the same day).
 *   due weekly: their weekday, and more than 2 days since their last lookup, or any day once it is
 *   more than 8 days old.
 */
export function due({ daily, weekly }, users, { now = Date.now(), contribMax, newMax = 3000, always = [] }) {
  const every = new Set(always);
  const d = daily.filter((l) => every.has(l) || !users[l]?.at || now - users[l].at > contribMax);
  const today = weekdayOf(now);
  const w = [];
  const fresh = [];
  for (const l of weekly) {
    const at = users[l]?.at;
    if (!at) fresh.push(l);
    else if (now - at > 8 * DAY || (slotOf(l) === today && now - at > 2 * DAY)) w.push(l);
  }
  const take = fresh.slice(0, Math.max(0, newMax));
  return { daily: d, weekly: w, fresh: take, later: fresh.length - take.length };
}
