// When the daily refresh is due (src/refresh.mjs), and that refresh.yml is set up to ask it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dailyAt, lastDue, refreshDue } from "../src/refresh.mjs";

const AT = { hour: 10, minute: 23 };
const utc = (d, h, m) => Date.UTC(2026, 10, d, h, m);

test("the last refresh time is today's once it has come, yesterday's before", () => {
  assert.equal(lastDue(utc(17, 10, 23), AT), utc(17, 10, 23));
  assert.equal(lastDue(utc(17, 18, 15), AT), utc(17, 10, 23));
  assert.equal(lastDue(utc(17, 10, 22), AT), utc(16, 10, 23));
  assert.equal(lastDue(utc(1, 3, 0), AT), Date.UTC(2026, 9, 31, 10, 23)); // across a month
});

test("a refresh is due once the time has come, until the data is saved after it", () => {
  // Yesterday's data, in the afternoon: GitHub never started this morning's, so the next trigger does.
  assert.equal(refreshDue(utc(17, 18, 23), utc(16, 21, 47), AT), true);
  // The same data before this morning's time: nothing to do yet.
  assert.equal(refreshDue(utc(17, 9, 23), utc(16, 21, 47), AT), false);
  // This morning's refresh saved: the rest of the day's triggers stop.
  assert.equal(refreshDue(utc(17, 12, 23), utc(17, 11, 40), AT), false);
  assert.equal(refreshDue(utc(18, 9, 23), utc(17, 11, 40), AT), false);
  // And the next morning it is due again.
  assert.equal(refreshDue(utc(18, 10, 23), utc(17, 11, 40), AT), true);
  // No data, or a date that can't be read: refresh.
  assert.equal(refreshDue(utc(17, 9, 23), NaN, AT), true);
});

test("refresh.yml is triggered every hour, on the minute of its daily refresh time", () => {
  const yml = readFileSync(new URL("../.github/workflows/refresh.yml", import.meta.url), "utf8");
  const at = dailyAt(yml);
  assert.ok(at && at.hour < 24 && at.minute < 60, 'refresh.yml sets REFRESH_AT_UTC: "HH:MM"');
  const crons = [...yml.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(crons, [`${at.minute} * * * *`]);
  assert.match(yml, /node scripts\/refresh-due\.mjs/);
});

test("dailyAt reads the time, or gives null without one", () => {
  assert.deepEqual(dailyAt('env:\n  REFRESH_AT_UTC: "9:05" # comment'), { hour: 9, minute: 5 });
  assert.equal(dailyAt('cron: "23 10 * * *"'), null);
});
