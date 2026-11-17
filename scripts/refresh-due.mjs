// Whether this hour's scheduled run of refresh.yml should refresh the data (src/refresh.mjs).
//   node scripts/refresh-due.mjs <when the data branch was last saved, ISO> <older refreshes still going>
// Says why, and writes go=true or go=false to $GITHUB_OUTPUT for the workflow's next job.
import { appendFileSync, readFileSync } from "node:fs";
import { dailyAt, lastDue, refreshDue } from "../src/refresh.mjs";

const at = dailyAt(readFileSync(new URL("../.github/workflows/refresh.yml", import.meta.url), "utf8"));
if (!at) throw new Error('refresh.yml has no REFRESH_AT_UTC: "HH:MM"');
const [saved = "", going = "0"] = process.argv.slice(2);
const now = Date.now();
const dataAt = Date.parse(saved);
const due = new Date(lastDue(now, at)).toISOString();

let go = false;
if (Number(going) > 0) console.log(`An earlier run is still refreshing (${going}), so this one stops.`);
else if (!refreshDue(now, dataAt, at)) console.log(`The data was saved ${saved}, after the last refresh time (${due}), so there is nothing to do.`);
else {
  go = true;
  console.log(Number.isNaN(dataAt) ? "No saved data was found, so this run refreshes it." : `The data was saved ${saved}, before the last refresh time (${due}), so this run refreshes it.`);
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `go=${go}\n`);
