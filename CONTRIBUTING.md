# Contributing

Thanks for wanting to make this better. Everything here is plain JavaScript on Node 24, with no dependencies to install, so you can be running it in two minutes. Please follow the [code of conduct](CODE_OF_CONDUCT.md).

## Run it

```sh
git clone https://github.com/wbp318/github-leaderboard.git
cd github-leaderboard
npm run data     # download the latest data (refreshed daily)
npm run build    # write site/leaderboard.html
npm test         # the placement rules
```

Open `site/leaderboard.html` in a browser. Change [web/template.html](web/template.html), run `npm run build` again, and reload.

## Where things are

| Path | What it is |
|---|---|
| [src/states.mjs](src/states.mjs) | Reads a free-text profile location and decides which state it names, if any. The rules most likely to need you. |
| [src/counties.mjs](src/counties.mjs) | Which county a location names, by FIPS code, in every state. |
| [src/counties/us.json](src/counties/us.json) | Every county of the 50 states: for 45 of them the Census place names in each, and for all 50 the post offices and unincorporated communities that fill the gaps. Made by [scripts/make-counties.mjs](scripts/make-counties.mjs). |
| [src/counties/aliases.mjs](src/counties/aliases.mjs) | Hand fixes to those place names: nicknames, boroughs, universities, and regions that name no one county. |
| [src/counties/la.mjs](src/counties/la.mjs) | Louisiana's 64 parishes and the towns and universities in each. |
| [src/counties/ms.mjs](src/counties/ms.mjs), [al.mjs](src/counties/al.mjs), [ar.mjs](src/counties/ar.mjs), [tn.mjs](src/counties/tn.mjs) | Mississippi's, Alabama's, Arkansas's, and Tennessee's counties, and the towns and universities in each. |
| [src/opt-out.txt](src/opt-out.txt) | People who asked to be left off. |
| [src/exclude.mjs](src/exclude.mjs) | Who is left off: bot and test accounts, and the opt-out list. |
| [scripts/collect.mjs](scripts/collect.mjs) | Gathers people and their contributions from GitHub's API into `data/`. |
| [scripts/audit.mjs](scripts/audit.mjs) | Writes `data/audit.md`: what each rule placed and what it turned away. |
| [scripts/build.mjs](scripts/build.mjs) | Places everyone, adds it all up, and writes the page. |
| [src/sample.mjs](src/sample.mjs) | Who each state is compared on: the 80 likeliest to be busiest. Shared by the build and the history. |
| [src/badge.mjs](src/badge.mjs) | The README badge: everyone's state and county rank, drawn as an SVG the build writes to `site/badge/<login>.svg` every day. |
| [scripts/history.mjs](scripts/history.mjs) | Adds the day to `data/history.json` ([src/history.mjs](src/history.mjs) describes it), the daily record behind the page's sparklines and chart. |
| [scripts/fetch-data.mjs](scripts/fetch-data.mjs) | Downloads the latest data from the `data` branch. |
| [scripts/add-me.mjs](scripts/add-me.mjs) | Checks an "Add me" request and writes the bot's reply. |
| [web/template.html](web/template.html) | The page: the canvas tornado, the map, the tables, and Ice Storm, the hockey game near the top (under the county map), all in one file. The game is the last script, in a block of its own: the camera, the rink, the players, the crests, the sound, and the keys, controller, and touch pad. |
| [src/hockey.mjs](src/hockey.mjs) | Ice Storm's hockey: the rink, the skating and the puck, the computer's players and goalies, and the rules. The build copies it into the game's script. |
| [test/states.test.mjs](test/states.test.mjs) | Locations and where they belong. |
| [test/counties.test.mjs](test/counties.test.mjs) | Locations and the county or parish they name. |
| [test/refresh.test.mjs](test/refresh.test.mjs) | When the daily refresh is due. |
| [test/hockey.test.mjs](test/hockey.test.mjs) | Ice Storm: whole games, the computer on both sides, and the posts, the goalie, passes, checks, faceoffs, and the controls. |
| [e2e/page.mjs](e2e/page.mjs) | Opens the built page in a browser and checks it works. |
| [scripts/check-data.mjs](scripts/check-data.mjs), [scripts/check-links.mjs](scripts/check-links.mjs) | Refuse to publish broken data; catch broken doc links. |
| [docs/placement.md](docs/placement.md) | How the placement rules work, and the audit. |
| [docs/data.md](docs/data.md) | Every data file and field, and the collector's settings. |
| [docs/controller.md](docs/controller.md) | Playing Ice Storm with an Xbox controller: connecting it, the buttons, the wizard, and what to try when it isn't seen. |
| [docs/optimjack.md](docs/optimjack.md) | The November 2026 third-party script attack, and the page's Content Security Policy. |
| [.github/workflows/refresh.yml](.github/workflows/refresh.yml) | The daily refresh and the deploy to GitHub Pages. |
| [scripts/refresh-due.mjs](scripts/refresh-due.mjs), [src/refresh.mjs](src/refresh.mjs) | Whether the daily refresh is due: the workflow is triggered every hour, because GitHub starts scheduled runs late, and only the first trigger after the day's time refreshes. |
| [scripts/refresh-fallback.ps1](scripts/refresh-fallback.ps1) | A fallback from outside GitHub, on the owner's Windows PC: a scheduled task that starts the day's refresh if GitHub hasn't. `-Install` sets it up. |
| [.github/workflows/add-me.yml](.github/workflows/add-me.yml) | Answers "Add me" issues. |

### Fix your state's counties

Every state's counties are in [src/counties/us.json](src/counties/us.json), one county a line, by FIPS code. For 45 states it also lists the towns and cities in each county, made from Census files by [scripts/make-counties.mjs](scripts/make-counties.mjs). Louisiana, Mississippi, Alabama, Arkansas, and Tennessee have hand-written files in `src/counties/` instead. For all 50 it adds the post offices (USPS's names, from GeoNames) and unincorporated communities (from the USGS's GNIS) those leave out, each only if its name means one county in the state. To fix where a location lands:

1. Add the location and its county to [test/counties.test.mjs](test/counties.test.mjs): the FIPS code, or `""` for none.
2. In Louisiana, Mississippi, Alabama, Arkansas, or Tennessee, fix the town in the state's file. In any other state, add the name to [src/counties/aliases.mjs](src/counties/aliases.mjs): a nickname, a neighborhood, a university, a town the Census writes another way, or a region that names no one county (`null`).
3. Run `npm test`.
4. To change how the names are generated, change [scripts/make-counties.mjs](scripts/make-counties.mjs) and run `node scripts/make-counties.mjs`. It downloads the Census, GNIS, and GeoNames files once, rewrites us.json, and writes a review to read: match rates by state, the commonest locations with no county, and a sample of matches.

## Someone is in the wrong place

Profile locations are free text, and two-letter codes are shared around the world: MS is Mississippi and also Mato Grosso do Sul in Brazil, DE is Delaware and Germany, IN is Indiana and India ([the full table](docs/placement.md#the-problem-codes-are-shared)). When the rules get one wrong:

1. Add the location to [test/states.test.mjs](test/states.test.mjs) with where it belongs (`null` for "not in a US state").
2. Change [src/states.mjs](src/states.mjs) until `npm test` passes. A foreign city that shares a code usually belongs in the `ELSEWHERE` list for that code.
3. Run `npm run audit` and read `data/audit.md`: the "turned away" list should hold no US towns and the "accepted" lists no foreign ones.

In the wrong parish or county? See [Fix your state's counties](#fix-your-states-counties).

Not sure how to fix it? [Open an issue](https://github.com/wbp318/github-leaderboard/issues/new/choose) with the exact location text.

## Collect the data yourself

You only need this to change what is collected. It needs the [GitHub CLI](https://cli.github.com/), logged in, and takes about an hour for every state.

```sh
GH_TOKEN=$(gh auth token) npm run collect          # macOS, Linux, Git Bash
$env:GH_TOKEN = gh auth token; npm run collect      # PowerShell
```

`SCOPE=LA,MS,AR` limits it to some states, `PER_STATE` sets how many people in each state have their contributions looked up (80), and `VIEWER=<your login>` makes sure you are included and highlighted; [docs/data.md](docs/data.md#how-it-is-collected) lists every setting. The token stays in your environment and is never written to disk. Rerunning fetches only what is missing or stale, so you can stop it at any point.

## Ideas to pick up

Each of these is an issue with what to build, where in the code, and how to know it is done. Comment on one to claim it.

- [Live lookups for anyone: a Cloudflare Worker behind Find yourself](https://github.com/wbp318/github-leaderboard/issues/10)

[All good first issues](https://github.com/wbp318/github-leaderboard/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Have a different idea? [Open an issue](https://github.com/wbp318/github-leaderboard/issues/new/choose).

## Pull requests

CI ([refresh.yml](.github/workflows/refresh.yml)) checks every pull request:

| Check | Run it yourself |
|---|---|
| The placement rules, and Ice Storm's hockey | `npm test` |
| Every script parses, and no doc links to a missing file | `npm run check:links` |
| The workflows ([actionlint](https://github.com/rhysd/actionlint)) | `docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12` |
| The data looks whole | `npm run check:data` |
| A full build, then the page in a real browser: it loads, the tornado draws, Find yourself and "where you'd rank" work, Share my ranks draws a picture and its badge matches the page, the game plays from the keyboard and on a touch phone, nothing scrolls sideways on a phone, no script errors | `npm run build && npm run e2e` |

The browser test needs Playwright, which is deliberately not a dependency: install it once with `npm i --no-save --no-package-lock playwright && npx playwright install chromium`. Please keep the project dependency-free, working at phone width, and free of third-party scripts: the page's Content Security Policy, written by `scripts/build.mjs`, refuses any script, request, or image host it doesn't name (see [docs/optimjack.md](docs/optimjack.md)).

[Dependabot](.github/dependabot.yml) keeps the workflows' actions up to date, and CodeQL scans the code.

## Leaving the leaderboard

Everything shown comes from public GitHub profiles. To be left off, add your login to [src/opt-out.txt](src/opt-out.txt) in a pull request, or [open an issue](https://github.com/wbp318/github-leaderboard/issues/new) and it will be done for you.
