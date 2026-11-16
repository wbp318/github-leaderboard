// The daily history, data/history.json: one record a day of what the page showed for each state.
// It is kept in columns to stay small: the dates once, then for each state one number a day.
//   { "dates": ["2026-11-13", ...], "people": { "AL": [80, ...], ... }, "total": { "AL": [151843, ...], ... } }
// people is how many people the state was compared on that day and total is their contributions,
// the numbers in the states table; the average is total / people. A day is the data's own refresh
// date (UTC), so a second record for the same day replaces the first. null means no record.
import { existsSync, readFileSync } from "node:fs";
import { isBot, optedOut } from "./exclude.mjs";
import { current, markSample, refreshedAt } from "./sample.mjs";
import { NAMES, stateOf } from "./states.mjs";

export const FIELDS = ["people", "total"];
// A year of daily records must stay well under this.
export const YEAR_BUDGET = 1024 * 1024;
const DAY = 86400000;

export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

// The record for the data in users.json and profiles.json: the day it was refreshed, and per state
// the people it is compared on (src/sample.mjs) and their total contributions.
export function recordOf(users, profiles, perState = 80) {
  const at = refreshedAt(users);
  if (!at) throw new Error("users.json has no lookup times, so its data has no date");
  const out = optedOut();
  const people = [];
  for (const [login, u] of Object.entries(users)) {
    if (!current(u, at) || out.has(login.toLowerCase()) || isBot(login)) continue;
    const state = stateOf(u.location);
    if (state) people.push({ login, state, total: u.total });
  }
  markSample(people, profiles, perState, at);
  const rec = { date: dayOf(at), at, people: {}, total: {} };
  for (const [ab] of NAMES) {
    rec.people[ab] = 0;
    rec.total[ab] = 0;
  }
  for (const p of people) {
    if (!p.fair) continue;
    rec.people[p.state]++;
    rec.total[p.state] += p.total;
  }
  return rec;
}

// The history with a record added in date order, or with that day's record replaced if it has one.
// history may be null, for the first record.
export function merge(history, rec) {
  const h = history ? structuredClone(history) : { dates: [] };
  let i = h.dates.indexOf(rec.date);
  if (i < 0) {
    i = h.dates.findIndex((d) => d > rec.date);
    if (i < 0) i = h.dates.length;
    h.dates.splice(i, 0, rec.date);
    for (const f of FIELDS) for (const xs of Object.values(h[f] ?? {})) xs.splice(i, 0, null);
  }
  for (const f of FIELDS) {
    h[f] ??= {};
    for (const ab of Object.keys(rec[f])) h[f][ab] ??= h.dates.map(() => null);
    for (const [ab, xs] of Object.entries(h[f])) xs[i] = rec[f][ab] ?? null;
  }
  return h;
}

// The file's text: the dates on one line and each state on its own, so it reads well.
export function format(h) {
  const block = (m) => {
    const rows = Object.entries(m).map(([ab, xs]) => `    ${JSON.stringify(ab)}: ${JSON.stringify(xs)}`);
    return rows.length ? `{\n${rows.join(",\n")}\n  }` : "{}";
  };
  return `{\n  "dates": ${JSON.stringify(h.dates)},\n${FIELDS.map((f) => `  ${JSON.stringify(f)}: ${block(h[f] ?? {})}`).join(",\n")}\n}\n`;
}

// About how many bytes a year of records like these takes: the part that does not grow (the
// state codes) plus 365 days at this history's size a day.
export function yearSize(h) {
  const empty = { dates: [] };
  for (const f of FIELDS) empty[f] = Object.fromEntries(Object.keys(h[f] ?? {}).map((ab) => [ab, []]));
  const fixed = Buffer.byteLength(format(empty));
  const size = Buffer.byteLength(format(h));
  return h.dates.length ? Math.round(fixed + ((size - fixed) / h.dates.length) * 365) : fixed;
}

// What is wrong with a history, if anything: a list of problems, empty when it is fine.
export function checkHistory(h) {
  if (!h || typeof h !== "object" || !Array.isArray(h.dates)) return ["it has no list of dates"];
  const out = [];
  const n = h.dates.length;
  h.dates.forEach((d, i) => {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || dayOf(Date.parse(d) || 0) !== d) out.push(`${JSON.stringify(d)} is not a date`);
    else if (i > 0 && !(d > h.dates[i - 1])) out.push(`the dates are out of order or repeated at ${d}`);
  });
  for (const f of FIELDS) {
    const m = h[f];
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      out.push(`it has no ${f}`);
      continue;
    }
    for (const [ab, xs] of Object.entries(m)) {
      if (!/^[A-Z]{2}$/.test(ab)) out.push(`${f} has ${JSON.stringify(ab)}, which is not a state code`);
      else if (!Array.isArray(xs) || xs.length !== n) out.push(`${f}.${ab} has ${Array.isArray(xs) ? xs.length : "no"} values for ${n} dates`);
      else if (xs.some((x) => x !== null && !(Number.isInteger(x) && x >= 0))) out.push(`${f}.${ab} has a value that is not a count`);
    }
  }
  if (out.length) return out;
  const states = FIELDS.map((f) => Object.keys(h[f]).sort().join());
  if (new Set(states).size > 1) out.push(`${FIELDS.join(" and ")} do not have the same states`);
  const year = yearSize(h);
  if (year > YEAR_BUDGET) out.push(`a year of records like these would take ${Math.round(year / 1024)} KB, over the ${YEAR_BUDGET / 1024} KB budget`);
  return out;
}

// The history in a file, or null if there is none yet.
export function readHistory(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

// Only the last year of a history, which is what the page shows.
export function lastYear(h) {
  if (!h?.dates?.length) return h ?? null;
  const from = dayOf(Date.parse(h.dates.at(-1)) - 365 * DAY);
  const i = h.dates.findIndex((d) => d >= from);
  const out = { dates: h.dates.slice(i) };
  for (const f of FIELDS) out[f] = Object.fromEntries(Object.entries(h[f] ?? {}).map(([ab, xs]) => [ab, xs.slice(i)]));
  return out;
}
