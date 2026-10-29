# GameSense — Four-Sport Historical Analytics

GameSense is a responsive, static website for **Soccer, NBA, Cricket (IPL) and Formula 1**. It transforms historical records into ranked comparisons, filterable tables, recent-form summaries, trend graphs, CSV exports and **sport-specific experimental performance ratings**.

**Open the site:** https://dkddhairya26.github.io/GameSense/

## Using it
Select a sport in the sidebar. Choose a season, competition and metric, search for a team/competitor, compare two entries, and explore the recent-form panel. Select **GameSense rating (0–100)** to see an explained experimental index. Open **Methodology** for calculation rules and data-quality notes.

## Data coverage
- Soccer — 108,962 club-perspective match rows (OpenFootball, CC0). Match points recalculated as 3 for wins, 1 for draws, 0 for losses.
- NBA — 2,673 player-season totals (BoxScore Lab, CC BY 4.0); incomplete years.
- Cricket — 208 **selected leading IPL player-season records** across 19 IPL seasons, plus 16 men’s international ODI matches (32 team-perspective observations) (2007/08–2026), derived from Cricsheet using [IPL Analytics ETL](https://github.com/VeeraMounika/IPL-analytics-ETL). Curated sample, **not a complete player archive**.
- F1 — 27,687 driver race-result rows (F1DB, CC BY 4.0).

The included data is limited by its sources; rankings of curated or incomplete data must not be misrepresented as official full-league rankings. The four formulas are educational and not predictions.

## Design change from original proposal
The project was originally planned using Python and the sports Soccer/NBA/AFL/F1. For compatibility with school-managed devices, it now runs in a browser without a Windows installer. **Cricket replaces AFL** because the original project did not bundle an AFL player archive that could safely be redistributed. Cricket has attributable openly licensed historical data.

See [PROJECT_EVIDENCE.md](PROJECT_EVIDENCE.md) for proposal alignment, data-processing decisions, source attribution and AI assistance disclosure.

## Run locally
GitHub Pages hosts the JSON data automatically. If opening the **repository's raw downloaded files** locally, browsers may block fetch of `*.json` under `file://`. The accompanying Canvas submission ZIP is a separate **offline-ready version** with embedded `data/*.js` wrappers; extract and open its `index.html` for a no-install teacher demonstration.

## Primary sources
- [OpenFootball](https://github.com/openfootball/football.json)
- [BoxScore Lab](https://boxscorelab.com/downloads/)
- [F1DB](https://github.com/f1db/f1db)
- [Cricsheet](https://cricsheet.org/) — [ODC-BY 1.0 licence](https://cricsheet.org/licensing/) — [derived IPL ETL](https://github.com/VeeraMounika/IPL-analytics-ETL)

## Academic integrity
Substantial AI collaboration assisted this web edition; see [PROJECT_EVIDENCE.md](PROJECT_EVIDENCE.md). The uploaded assessment sheet sets the Major Project to **Level 3 AI Collaboration** and the separate supervised validation to **Level 1 No AI**. Student review and independent validation remain required.

## International ODI view (final project extension)
Choose Cricket, then **International ODIs · Team results** to compare countries using actual observed outcomes, total wins and win percentages. This small 16-match selection (2009–2014) is sourced from original Cricsheet ODI JSON under ODC-BY 1.0; it is not complete international coverage and does not contain Tests or T20Is. IPL player metrics are kept separate from international team outcomes. See PROJECT_EVIDENCE.md.\n