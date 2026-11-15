// Adds a day to data/history.json: per state, the people compared and their total contributions,
// the same numbers the page shows (src/history.mjs describes the file). The day is the data's own
// refresh date, so running it again on the same data replaces that day instead of adding another.
// The daily workflow runs it after a refresh; builds only read the file.
//   node scripts/history.mjs                    the day in data/users.json and data/profiles.json
//   node scripts/history.mjs --backfill [ref]   the days in the data branch's saved commits that the
//                                               history does not have yet (ref: origin/data)
//   PER_STATE (80)                              people a state is compared on, as in the build
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { checkHistory, format, merge, readHistory, recordOf, yearSize } from "../src/history.mjs";

const PER_STATE = Number(process.env.PER_STATE ?? 80);
const file = new URL("../data/history.json", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [mode, ref = "origin/data"] = process.argv.slice(2);
let history = readHistory(file);

if (mode === "--backfill") {
  // The data branch is replaced with one new commit each day, so its older days are only in the
  // reflog of a clone that fetched them. Walk both: the branch's commits and its reflog.
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] });
  const list = (...args) => {
    try {
      return git(...args).split("\n").filter(Boolean);
    } catch {
      return [];
    }
  };
  const commits = [...new Set([...list("rev-list", ref), ...list("log", "--walk-reflogs", "--format=%H", ref)])];
  // One record a day: the latest data of that day.
  const byDay = new Map();
  for (const commit of commits) {
    let users, profiles;
    try {
      users = JSON.parse(git("show", `${commit}:data/users.json`));
      profiles = JSON.parse(git("show", `${commit}:data/profiles.json`));
    } catch {
      continue;
    }
    const rec = recordOf(users, profiles, PER_STATE);
    if (!byDay.has(rec.date) || byDay.get(rec.date).at < rec.at) byDay.set(rec.date, rec);
  }
  const days = [...byDay.keys()].sort();
  const added = days.filter((d) => !history?.dates.includes(d));
  for (const d of added) history = merge(history, byDay.get(d));
  console.log(`${ref}: ${commits.length} commits with ${days.length} days (${days.join(", ") || "none"}); ${added.length} added to the history`);
  if (!history) process.exit(0);
} else {
  const rec = recordOf(read("users.json"), read("profiles.json"), PER_STATE);
  const had = history?.dates.includes(rec.date);
  history = merge(history, rec);
  console.log(`${had ? "replaced" : "added"} ${rec.date}`);
}

const problems = checkHistory(history);
if (problems.length) {
  console.error(`Not writing data/history.json: ${problems.join("; ")}.`);
  process.exit(1);
}
const text = format(history);
writeFileSync(file, text);
console.log(`data/history.json: ${history.dates.length} days, ${history.dates[0]} to ${history.dates.at(-1)}, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB; a year would be about ${Math.round(yearSize(history) / 1024)} KB`);
