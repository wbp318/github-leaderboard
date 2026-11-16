// Who gets their contributions looked up, and when (src/schedule.mjs).
import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY, due, slotOf, tiers, weekdayOf } from "../src/schedule.mjs";

const NOW = Date.UTC(2026, 10, 16, 10, 23);
const pushed = new Date(NOW - 30 * DAY).toISOString();
// n people in a state, busiest first (score 2 × repos + followers / 5).
const crowd = (prefix, location, n) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}`, { location, followers: 0, repos: n - i, pushed }]));

test("the busiest in each state are daily, the rest weekly, up to the cap", () => {
  const prof = { ...crowd("tx", "Austin, TX", 10), ...crowd("ms", "Jackson, MS", 4) };
  const t = tiers(prof, [], { perState: 3, allActive: 8, now: NOW });
  assert.deepEqual(t.daily.sort(), ["ms0", "ms1", "ms2", "tx0", "tx1", "tx2"]);
  assert.equal(t.weekly.length, 5 + 1); // TX ranks 4-8, MS rank 4
  assert.ok(!t.weekly.includes("tx8") && !t.weekly.includes("tx9"));
});

test("counties change nothing: every state is tiered the same way", () => {
  const t = tiers({ ...crowd("tx", "Austin, TX", 6), ...crowd("la", "Ruston, LA", 6) }, [], { perState: 2, allActive: 4, now: NOW });
  assert.equal(t.daily.filter((l) => l.startsWith("tx")).length, t.daily.filter((l) => l.startsWith("la")).length);
  assert.equal(t.weekly.filter((l) => l.startsWith("tx")).length, t.weekly.filter((l) => l.startsWith("la")).length);
});

test("the weekly tier takes turns between states, busiest first", () => {
  const t = tiers({ ...crowd("a", "Austin, TX", 5), ...crowd("b", "Jackson, MS", 5) }, [], { perState: 1, allActive: 5, now: NOW });
  assert.deepEqual(t.weekly, ["b1", "a1", "b2", "a2", "b3", "a3", "b4", "a4"]);
});

test("the people always looked up are daily, and the idle and unplaced are left out", () => {
  const prof = {
    ...crowd("tx", "Austin, TX", 3),
    idle: { location: "Austin, TX", followers: 900, repos: 900, pushed: new Date(NOW - 400 * DAY).toISOString() },
    nowhere: { location: "Remote", followers: 900, repos: 900, pushed },
    gone: null,
  };
  const t = tiers(prof, ["viewer"], { perState: 1, allActive: 3, now: NOW });
  assert.deepEqual(t.daily.sort(), ["tx0", "viewer"]);
  assert.deepEqual(t.weekly, ["tx1", "tx2"]);
});

test("a scope keeps only its states", () => {
  const t = tiers({ ...crowd("tx", "Austin, TX", 3), ...crowd("ms", "Jackson, MS", 3) }, [], { perState: 1, now: NOW, scope: new Set(["MS"]) });
  assert.ok([...t.daily, ...t.weekly].every((l) => l.startsWith("ms")));
});

test("daily entries are due once stale", () => {
  const users = { a: { at: NOW - 13 * 3600000 }, b: { at: NOW - 3600000 }, c: null };
  const d = due({ daily: ["a", "b", "c", "d"], weekly: [] }, users, { now: NOW, contribMax: 12 * 3600000 });
  assert.deepEqual(d.daily, ["a", "c", "d"]);
});

test("over a week of daily runs, each weekly person is looked up once", () => {
  const weekly = Array.from({ length: 300 }, (_, i) => `user-${i}`);
  // As things settle: everyone last looked up on their own weekday, in the week up to today.
  const lastSlot = (l) => NOW - ((weekdayOf(NOW) - slotOf(l) + 7) % 7) * DAY;
  const users = Object.fromEntries(weekly.map((l) => [l, { at: lastSlot(l) }]));
  const times = Object.fromEntries(weekly.map((l) => [l, 0]));
  for (let k = 1; k <= 7; k++) {
    const now = NOW + k * DAY;
    for (const l of due({ daily: [], weekly }, users, { now, contribMax: DAY }).weekly) {
      users[l].at = now;
      times[l]++;
    }
  }
  assert.deepEqual(new Set(Object.values(times)), new Set([1]));
});

test("a weekly person is looked up on their weekday, or any day once 8 days late", () => {
  const login = "someone";
  const onSlot = NOW + ((slotOf(login) - weekdayOf(NOW) + 7) % 7) * DAY;
  const offSlot = onSlot + DAY;
  const check = (now, ago) => due({ daily: [], weekly: [login] }, { [login]: { at: now - ago } }, { now, contribMax: DAY }).weekly.length;
  assert.equal(check(onSlot, 3 * DAY), 1);
  assert.equal(check(onSlot, DAY), 0); // looked up only yesterday
  assert.equal(check(offSlot, 7 * DAY), 0);
  assert.equal(check(offSlot, 9 * DAY), 1); // their day was missed: made up the next run
});

test("people never looked up wait for room, at most newMax a run", () => {
  const weekly = ["n1", "n2", "n3", "seen"];
  const users = { n2: null, seen: { at: NOW - DAY } };
  const d = due({ daily: [], weekly }, users, { now: NOW, contribMax: DAY, newMax: 2 });
  assert.deepEqual(d.fresh, ["n1", "n2"]);
  assert.equal(d.later, 1);
});
