# GitHub Contribution Tornado

[![Refresh and deploy](https://github.com/wbp318/github-leaderboard/actions/workflows/refresh.yml/badge.svg)](https://github.com/wbp318/github-leaderboard/actions/workflows/refresh.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [!TIP]
> **Runs best in Chromium.** The tornado is a live canvas animation, and it is at its smoothest in Chromium and the browsers built on it (Chrome, Edge, Brave, Arc, Opera, Vivaldi). Firefox and Safari work too, just not as smoothly.
>
> - **Windows:** `winget install Hibbiki.Chromium`. This community build **never updates itself**, so keep it current: run `winget upgrade Hibbiki.Chromium` every few days, or have Windows check daily for you (below).
> - **macOS:** with [Homebrew](https://brew.sh), `brew install --cask ungoogled-chromium` (Chromium without Google's services). Homebrew's plain `chromium` package was retired in September 2026 because Apple's security check rejects it. If macOS will not open the app the first time, go to **System Settings → Privacy & Security** and choose **Open Anyway**. Homebrew does not update it on its own either: run `brew upgrade --cask ungoogled-chromium` now and then. Or use Google Chrome, which updates itself: `brew install --cask google-chrome`.
> - **Linux:** `sudo snap install chromium` (snaps update themselves), or your distribution's `chromium` package.

<details>
<summary><b>Have Windows update Chromium every day</b></summary>

Paste this into PowerShell once. It adds a task that runs `winget upgrade` for Chromium every morning at 9 (or as soon as the PC is next on), hidden, as you, with no administrator rights needed. The last run's output is in `%LOCALAPPDATA%\chromium-update.log`.

```powershell
$log = Join-Path $env:LOCALAPPDATA "chromium-update.log"
$run = "winget upgrade --id Hibbiki.Chromium --exact --silent --accept-source-agreements --accept-package-agreements > `"$log`" 2>&1"
Register-ScheduledTask -TaskName "Update Chromium" -Force `
  -Action (New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless cmd.exe /c $run") `
  -Trigger (New-ScheduledTaskTrigger -Daily -At 9am) `
  -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
```

To stop it: `Unregister-ScheduledTask -TaskName "Update Chromium"`.
</details>

A year of GitHub contributions across the United States, drawn as a spinning tornado: all 50 states, the nine Census divisions and four regions, every county in the country on a map, and leaderboards in eight categories. About 34,000 developers found, the likeliest-busiest 80 in each state compared, refreshed every day by GitHub Actions. One HTML page and the shapes of the counties, no frameworks, no dependencies, and nothing loaded from anywhere else.

**See it live: https://wbp318.github.io/github-leaderboard/** and type your GitHub login to see where you rank. Not on it? One click adds you.

![The tornado for Mississippi, county by county: each ring split into public commits and everything else, with Hinds picked from the keyboard and its numbers beside it](docs/screenshot.png)

![Storm Cellar, the game at the top of the page: a blocky first-person view of a stone cellar, firing at a red and blue beetle, with a commit to pick up by the far door](docs/storm-cellar.png)

![Storm Cellar's second level: the Heisenbug, a storm bug as wide as the tunnel, spitting three glowing balls across the flooded storm drain, with the lightning rod in hand and its health bar along the top](docs/storm-drain.png)

## What is on the page

- **Storm Cellar.** At the top, a little first-person shooter in the old blocky style: the tornado shook the bugs loose, so clear the cellar, find the five commits, and get to the exit. Then go down the storm drain under it: a bigger, flooded level with roaches, five more commits, a lightning rod to find, and the Heisenbug, a storm bug as wide as the tunnel, holding the way out. It's drawn at 320×200 by a ray caster, and every texture, sprite, letter, and sound is made in code. You play it with the keyboard and mouse, or a stick and Fire and Swap buttons on a phone. Pause and press S (or tap **Save progress**) to save where you are, in your browser; the title's **Continue** (or C) puts you back in the same spot, bugs squashed and pickups gone as you left them. It only runs while you play, and links to a view or to someone's ranks open past it.
- **The tornado.** Each ring is a place, the busiest at the top. Its red half is public commits; its blue half is everything else: pull requests, reviews, issues, new repositories, and private contributions for people who show them. Click a ring to go down a level, from divisions to states to a state's busiest people. Every state by county has a tornado of its own (Louisiana by parish, Alaska by borough), the 24 busiest counties a ring each and the rest together. It works from the keyboard too: Tab to it, arrow keys to move between rings, Enter to go down, Escape to come back up. A screen reader reads each ring's place and numbers. Round it the weather rolls in: clouds, rain, debris riding the updraft, and every few seconds lightning that strikes the busiest ring, with thunder if you turn it on. The **Storm** switch turns it all off, and it starts off if your system asks for reduced motion.
- **Find yourself.** Type your GitHub login to see your ranks in your parish or county, state, division, region, and the country, with you in gold in the tornado, the lists, and the map. `?me=<login>` links straight to anyone's ranks. Open any other state to see where you would rank there, and the states table shows your rank in all 50 at once.
- **Share your ranks.** Once you've found yourself, **Share my ranks** draws a picture to post: your GitHub picture, your year, your ranks from county to country, and your state's tornado with you in gold. Download it, copy it, or share it straight from a phone. It also hands you a badge for your profile README, which the daily build redraws, so it always shows today's rank:

  ![contribution tornado: #3 in Hinds County · #12 in Mississippi](docs/badge.svg)
- **Add yourself.** Not on it? The **Add me** button opens a one-click issue; [a bot](https://github.com/wbp318/github-leaderboard/blob/main/.github/workflows/add-me.yml) checks your profile location, adds you, and replies with a link to your ranks in a few minutes. You are refreshed daily after that.
- **Leaderboards** in eight categories (total, public commits, private, pull requests, reviews, issues, new repositories, followers) for any state, division, region, or county, with each person's location. Search by login, name, or place. **Download CSV** saves the list as you have it, every row and every category, for Excel or Google Sheets.
- **Every county, on a map.** All 3,141 counties in the 50 states, coloured by contributions, people counted, or average. Click a state to zoom in, and a county to see its leaderboard; arrow keys, Enter, and Escape do the same. People are placed in a county by the town, city, university, or county named in their GitHub location, from the Census Bureau's lists of places. The map's shapes load only when you scroll near it.
- **A tile map** of the 50 states, coloured the same ways.
- **Tables** of the states, the regions and divisions, and each state's counties.
- **Light or dark.** The page follows your system's setting; the switch at the top changes it and remembers your choice.
- **History.** In the states table, a small line for each state shows how its contributions have moved since the history started. Open a state's tornado for a chart of its total, day by day.

## How it works

```mermaid
flowchart TD
    search["GitHub search<br/>users whose location names each state,<br/>by followers and by repositories"] --> cands[("candidates")]
    cands --> prof["GitHub GraphQL<br/>location, followers, public repos, last push"]
    prof --> place{"src/states.mjs<br/>which state, if any?"}
    place -->|"pushed in the last year:<br/>the likeliest 80 a state,<br/>everyone in LA, MS, AL, AR, and TN"| contrib["GitHub GraphQL<br/>a year of contributions"]
    contrib --> audit["scripts/audit.mjs<br/>what each rule placed and turned away"]
    audit --> build["scripts/build.mjs<br/>states, divisions, regions, parishes and counties, rankings"]
    build --> page["site/leaderboard.html<br/>published to GitHub Pages"]
    daily(["GitHub Actions, every day"]) -.-> search
    daily -.-> page
```

1. **Find people.** [scripts/collect.mjs](scripts/collect.mjs) searches GitHub for users whose location names each state, by its name and by its two-letter code, and Louisiana again by its towns.
2. **Place them.** [src/states.mjs](src/states.mjs) reads each free-text location. Two-letter codes are shared around the world (MS is also Mato Grosso do Sul in Brazil, DE is Germany, IN is India, WA is Western Australia), so a code only counts when the city in front of it is not a known place abroad that uses the same code. Louisiana goes down to the parish, and Mississippi, Alabama, Arkansas, and Tennessee to the county, with [src/counties.mjs](src/counties.mjs), and a few town names that mean only one of them ("New Orleans", "Hattiesburg", "Tuscaloosa", "Little Rock", "Chattanooga") place someone there without the state. [docs/placement.md](docs/placement.md) explains the rules, and the [tests](test/states.test.mjs) hold the hard cases.
3. **Look up contributions.** For each state, the 80 people most likely to be busiest (by public repositories and followers, among those who pushed code in the last year) get their year of contributions looked up. Everyone else active is looked up once a week (up to 1,000 a state), for the parish and county views. States are always compared on the same 80 each. The busiest accounts are too big for GitHub to count in one query, so they are counted the long way rather than dropped; bot and test accounts are left off.
4. **Audit and build.** [scripts/audit.mjs](scripts/audit.mjs) lists what each rule placed and what it turned away; [scripts/build.mjs](scripts/build.mjs) adds everything up and writes it into [web/template.html](web/template.html).
5. **Every day** at about 4 a.m. Central, [a GitHub Actions workflow](.github/workflows/refresh.yml) refreshes what has gone stale (contributions daily, searches and profiles weekly), adds the day's numbers for each state to a small history ([scripts/history.mjs](scripts/history.mjs)), saves the data to the [`data` branch](https://github.com/wbp318/github-leaderboard/tree/data), audits it, and publishes the page. It uses the workflow's own token, so there are no secrets. [docs/data.md](docs/data.md) describes every file.

## Run it yourself

Node 24, no dependencies.

```sh
npm run data     # download the latest data
npm run build    # write site/leaderboard.html
npm test         # the placement rules
npm run audit    # data/audit.md
```

To collect from GitHub yourself (about an hour for every state), see [CONTRIBUTING.md](CONTRIBUTING.md#collect-the-data-yourself).

## Where things are

```
src/        placement rules: states.mjs, counties.mjs, counties/ (us.json, aliases, 5 hand-made states), opt-out.txt; badge.mjs, geo.mjs (decodes the county map)
scripts/    collect, audit, build, fetch-data
web/        template.html, the whole page; us-counties.json, the county map's shapes
site/       what GitHub Pages serves (leaderboard.html, us-counties.js, and badge/ are built)
test/       placement test cases
docs/       placement.md, data.md, the screenshots
.github/    the daily workflow, issue forms
```

## Docs

- [How people are placed](docs/placement.md): the shared two-letter codes, the rules, the audit, and how to fix a mistake.
- [The data](docs/data.md): every file, every field, how it is collected, and the settings.
- [Contributing](CONTRIBUTING.md): running it, where to start, and ideas to pick up.

## What the numbers mean

- **Contributions** are GitHub's own count for the last 12 months, the number on a profile's contribution calendar.
- **Private contributions** count only for people who choose to show them on their profile.
- **It is a sample, not a census.** In each state the 80 people looked up are the likeliest to be busiest by their public signals, so someone very active who works mostly in private can be missed. Ranks are among the people counted.
- **People are placed by what their profile says.** Locations that stay ambiguous (Georgia the country, Washington DC, two places at once) are left out, and so are bot and test accounts.
- **It changes daily.** Contribution counts cover a rolling 12 months, so ranks move a little every day.

## Contributing

Ideas, fixes, and new views are welcome; [CONTRIBUTING.md](CONTRIBUTING.md) has how to run it, where things are, and ideas to pick up, and the [code of conduct](CODE_OF_CONDUCT.md) keeps it friendly. Someone in the wrong state? [Tell me](https://github.com/wbp318/github-leaderboard/issues/new/choose).

Everything shown comes from public GitHub profiles. To be left off, add your login to [src/opt-out.txt](src/opt-out.txt) or open an issue.

## License

[MIT](LICENSE)
