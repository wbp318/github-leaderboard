// The daily history (src/history.mjs, scripts/history.mjs): a day's record holds the numbers the
// page shows, records merge in date order, the same day twice is one record, and a year stays small.
import assert from "node:assert/strict";
import { test } from "node:test";
import { YEAR_BUDGET, checkHistory, dayOf, format, lastYear, merge, recordOf, yearSize } from "../src/history.mjs";

const DAY = 86400000;
const AT = Date.parse("2026-11-15T11:30:00Z");
const rec = (date, totals, people = {}) => ({
  date,
  people: Object.fromEntries(Object.keys(totals).map((ab) => [ab, people[ab] ?? 80])),
  total: totals,
});

test("a record counts each state's sample, as the page does", () => {
  const users = {
    a: { location: "Austin, TX", total: 100, at: AT - 3600000 },
    b: { location: "Dallas, Texas", total: 50, at: AT },
    c: { location: "Houston, TX", total: 1000, at: AT - 7200000 }, // has not pushed in a year
    d: { location: "Boise, ID", total: 7, at: AT },
    "some-bot": { location: "Austin, TX", total: 999, at: AT },
    e: { location: "Berlin, Germany", total: 5, at: AT },
    gone: null,
  };
  const pushed = new Date(AT - 30 * DAY).toISOString();
  const profiles = {
    a: { repos: 10, followers: 0, pushed },
    b: { repos: 1, followers: 0, pushed },
    c: { repos: 50, followers: 0, pushed: new Date(AT - 400 * DAY).toISOString() },
    d: { repos: 1, followers: 0, pushed },
    "some-bot": { repos: 99, followers: 0, pushed },
  };
  const r = recordOf(users, profiles, 80);
  assert.equal(r.date, "2026-11-15");
  assert.equal(r.total.TX, 150);
  assert.equal(r.people.TX, 2);
  assert.equal(r.people.ID, 1);
  assert.equal(r.total.ID, 7);
  assert.equal(r.people.AL, 0);
  assert.equal(Object.keys(r.total).length, 50);
  // Only the likeliest to be busiest count: with a sample of one, Texas is just "a".
  assert.equal(recordOf(users, profiles, 1).total.TX, 100);
});

test("a day is the data's own refresh date in UTC, not the clock's", () => {
  assert.equal(dayOf(Date.parse("2026-11-13T00:17:06Z")), "2026-11-13");
  assert.equal(recordOf({ a: { location: "Austin, TX", total: 1, at: Date.parse("2026-11-12T23:59:00-06:00") } }, {}).date, "2026-11-13");
  assert.throws(() => recordOf({ a: { location: "Austin, TX", total: 1 } }, {}), /no lookup times/);
});

test("records merge in date order, whichever comes first", () => {
  let h = merge(null, rec("2026-11-15", { AL: 30, TX: 300 }));
  h = merge(h, rec("2026-11-13", { AL: 10, TX: 100 }));
  h = merge(h, rec("2026-11-14", { AL: 20, TX: 200 }));
  assert.deepEqual(h.dates, ["2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.deepEqual(h.total.TX, [100, 200, 300]);
  assert.deepEqual(h.people.AL, [80, 80, 80]);
  assert.deepEqual(checkHistory(h), []);
});

test("the same day twice is one record, the later one", () => {
  const once = merge(merge(null, rec("2026-11-13", { AL: 10 })), rec("2026-11-14", { AL: 20 }));
  const twice = merge(once, rec("2026-11-14", { AL: 20 }));
  assert.deepEqual(twice, once);
  assert.equal(format(twice), format(once));
  const later = merge(once, rec("2026-11-14", { AL: 25 }, { AL: 79 }));
  assert.deepEqual(later.dates, ["2026-11-13", "2026-11-14"]);
  assert.deepEqual(later.total.AL, [10, 25]);
  assert.deepEqual(later.people.AL, [80, 79]);
});

test("merging leaves the old history alone", () => {
  const h = merge(null, rec("2026-11-13", { AL: 10 }));
  const copy = structuredClone(h);
  merge(h, rec("2026-11-14", { AL: 20 }));
  assert.deepEqual(h, copy);
});

test("a state missing from a day is null that day", () => {
  let h = merge(null, rec("2026-11-13", { AL: 10 }));
  h = merge(h, rec("2026-11-14", { AL: 20, TX: 200 }));
  assert.deepEqual(h.total.TX, [null, 200]);
  assert.deepEqual(checkHistory(h), []);
});

test("the file reads back as the same history", () => {
  const h = merge(merge(null, rec("2026-11-13", { AL: 10, TX: 100 })), rec("2026-11-14", { AL: 20, TX: 200 }));
  assert.deepEqual(JSON.parse(format(h)), h);
  // One line for the dates and one for each state.
  assert.match(format(h), /\n {2}"dates": \["2026-11-13","2026-11-14"\],\n/);
  assert.match(format(h), /\n {4}"TX": \[100,200\]\n/);
});

test("a broken history is caught", () => {
  const good = merge(null, rec("2026-11-13", { AL: 10 }));
  const broken = (change) => {
    const h = structuredClone(good);
    change(h);
    return checkHistory(h);
  };
  assert.deepEqual(checkHistory(good), []);
  assert.match(checkHistory(null)[0], /no list of dates/);
  assert.match(broken((h) => h.total.AL.push(5)).join(), /2 values for 1 dates/);
  assert.match(broken((h) => (h.dates[0] = "2026-02-30")).join(), /not a date/);
  assert.match(broken((h) => (h.total.AL[0] = -1)).join(), /not a count/);
  assert.match(broken((h) => (h.total.AL[0] = "10")).join(), /not a count/);
  assert.match(broken((h) => delete h.people).join(), /no people/);
  assert.match(broken((h) => (h.total.Texas = [1])).join(), /not a state code/);
  assert.match(broken((h) => (h.total.TX = [1])).join(), /same states/);
  const twoDays = merge(good, rec("2026-11-14", { AL: 20 }));
  twoDays.dates.reverse();
  assert.match(checkHistory(twoDays).join(), /out of order/);
});

test("a year of all 50 states stays well under a megabyte", () => {
  const codes = Object.keys(recordOf({ a: { location: "Austin, TX", total: 1, at: AT } }, {}).total);
  let h = null;
  for (let d = 0; d < 365; d++) {
    // Totals like the real ones: up to a few hundred thousand a state.
    h = merge(h, rec(dayOf(AT + d * DAY), Object.fromEntries(codes.map((ab, i) => [ab, 150000 + i * 6000 + d * 37]))));
  }
  const bytes = Buffer.byteLength(format(h));
  assert.ok(bytes < 300 * 1024, `${bytes} bytes`);
  assert.ok(Math.abs(yearSize(h) - bytes) < 16, "the estimate of a year is the size of a year");
  assert.deepEqual(checkHistory(h), []);
});

test("a history that would grow past the budget in a year is refused", () => {
  // Every two-letter code, 676 of them: about 7 KB a day, 2.7 MB a year.
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const many = Object.fromEntries([...letters].flatMap((a) => [...letters].map((b) => [a + b, 123456])));
  const h = merge(merge(null, rec("2026-11-13", many)), rec("2026-11-14", many));
  assert.ok(yearSize(h) > YEAR_BUDGET);
  assert.match(checkHistory(h).join(), /over the 1024 KB budget/);
});

test("the page gets the last year", () => {
  let h = null;
  for (let d = 0; d < 400; d++) h = merge(h, rec(dayOf(AT + d * DAY), { AL: d }));
  const year = lastYear(h);
  assert.equal(year.dates.length, 366);
  assert.equal(year.dates.at(-1), h.dates.at(-1));
  assert.deepEqual(year.total.AL, h.total.AL.slice(-366));
  assert.equal(lastYear(null), null);
});
