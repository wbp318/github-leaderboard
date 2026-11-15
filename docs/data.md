# The data

Everything the page is built from lives on the [`data` branch](https://github.com/wbp318/github-leaderboard/tree/data/data), replaced once a day by the [refresh workflow](../.github/workflows/refresh.yml). `npm run data` downloads it into `data/`. It is all public GitHub profile information.

## Files

### candidates.json

Who the searches found, per state.

```json
{
  "AL": { "total": 3441, "logins": ["brandonroberts", "justintadlock", "..."], "done": true, "at": 1794508428857 },
  "LA_CITIES": { "total": 0, "logins": ["..."], "done": true, "at": 1794508428857 }
}
```

- `total`: how many GitHub users list the state's full name (GitHub's own count), shown as "On GitHub" in the state table.
- `logins`: up to about 800 people found by searching the state's name and code, sorted by followers and by repositories. `LA_CITIES` holds the extra Louisiana search by town.
- `at`: when it was fetched, in milliseconds since 1970. Searches are refreshed weekly.

### profiles.json

Cheap facts about everyone found, used to place them and to pick whose contributions to look up.

```json
{ "someone": { "location": "Maine", "followers": 262, "repos": 161, "pushed": "2026-11-11T21:03:14Z", "at": 1794513485786 } }
```

- `repos`: public repositories they own. `pushed`: their most recent push to one of their own repositories.
- `null` for an account that no longer exists.
- Refreshed weekly, spread over a second week by login so the refresh does not land on one day.

### users.json

A year of contributions for the people looked up: in each state, the 80 most likely to be busiest among those who pushed in the last year, scored by public repositories and followers; and in the states with county lists, Louisiana and Mississippi, everyone active, up to 500 a state ([who is looked up](#who-is-looked-up)).

```json
{
  "someone": {
    "name": "Their Name", "location": "Maine", "followers": 262,
    "total": 41018, "commits": 5499, "prs": 479, "reviews": 1060, "issues": 0, "repos": 11, "private": 33969,
    "at": 1794516199109
  }
}
```

- `total`: the number on their contribution calendar for the last 12 months.
- `commits`, `prs`, `reviews`, `issues`, `repos`: public contributions of each kind (`repos` is repositories created).
- `private`: contributions to private repositories, counted only if they show them on their profile. For the busiest accounts GitHub cannot count this field in one query, so it is the calendar total minus the public kinds, which is how the calendar adds up.
- Refreshed every day.

### Who added themselves

Anyone not on the leaderboard can open an [Add me](https://github.com/wbp318/github-leaderboard/issues/new?template=add-me.yml) issue. The [add-me workflow](../.github/workflows/add-me.yml) checks the issue's author (never the issue's text, so nobody can add someone else) with [scripts/add-me.mjs](../scripts/add-me.mjs): their profile location must name a US state, and they must not be a bot, a test account, or on the opt-out list. If they can be placed, it labels the issue `added`, replies with a link to their ranks, and starts a refresh.

The list of people added is the authors of issues labelled `added`; GitHub is the record, so two requests at once cannot overwrite each other. Each refresh writes that list to `data/added.txt` and looks them up along with everyone else. They are ranked among each state's sample of 80 but are not part of it, so adding yourself never changes how states compare.

### audit.md

The [placement audit](placement.md#checking-the-rules): what each rule placed, what the guards turned away, and every city accepted under a shared code.

## How it is collected

[scripts/collect.mjs](../scripts/collect.mjs) uses GitHub's search API (30 searches a minute) and GraphQL API. It saves as it goes and rerunning it fetches only what is missing or stale, so it can stop at any point. GitHub limits GraphQL by compute time as well as by points: the collector runs two or three queries at once and drops to one when GitHub pushes back, and waits for the hourly reset when the points run out. The daily run uses the workflow's own token (1,000 points an hour), which is enough because only contributions are refreshed every day.

| Setting | Default | What it does |
|---|---|---|
| `SCOPE` | every state | Only some states, such as `LA,MS,AR` |
| `PER_STATE` | 80 | People a state whose contributions are looked up, and used to compare states |
| `VIEWER` | wbp318 | Always looked up |
| `CONTRIB_MAX_HOURS` | 20 (12 in the daily run) | When contributions count as stale |
| `PROFILE_MAX_DAYS` | 7 | When profiles count as stale |
| `SEARCH_MAX_DAYS` | 7 | When searches count as stale |

### Who is looked up

States are compared on the same sample everywhere: the 80 people in each who pushed code in the last year and score highest on public repositories and followers. A county view needs more than that, so in each state with a county list ([src/counties.mjs](../src/counties.mjs)) everyone who pushed in the last year is looked up, the likeliest-busiest first, up to 500 (`ALL_ACTIVE` in the collector). Those extra people count only in their own state's view and its counties, never when states are compared.

| State | Active people found | Looked up |
|---|---:|---:|
| Louisiana | about 750 | 500 |
| Mississippi | about 210 | all of them |
| Every other state | | 80 |

The budget, as of November 2026: about 4,550 people are looked up each day, 8 to a query, so about 570 contribution queries at about a point each. The seventh of the profiles refreshed each day takes about 100 more queries at about two points each. So a daily run spends roughly 800 points, against the 1,000 an hour the workflow's token gets. Looking up everyone active in Mississippi, not only its 80, added about 130 people and 17 queries a day, about 2% more. A new state with a county list adds its active people past 80, up to 420 more; count them before adding it.

## Building something new

`scripts/build.mjs` writes everything the page shows into one object in the page (`D` in [web/template.html](../web/template.html)): totals for the country, regions, divisions, states, and the counties of each state with a county list (`D.counties`; Louisiana's are parishes), and one row a person. A new view usually needs only a change to the template. If it needs something the build does not compute yet, add it to the `data` object at the end of the build.
