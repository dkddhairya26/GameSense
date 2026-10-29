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
## Interactive design refresh — 30 October 2026
The interface includes **original GameSense styling influenced by sports-data dashboards such as STATSCORE**: motion-accented hero artwork, chart transitions, sport-specific colours, leader portraits, and competitor profile cards. It does not copy or embed STATSCORE proprietary assets, branded widgets, or live data feeds.

Profile images are requested on demand from the **English Wikipedia MediaWiki API**, with a conservative page-title match. Images are not included in the source repository or downloaded into the project ZIP. Their licences vary by file, so users can follow the provided attribution/source link; unavailable or ambiguous images fall back to initials. A profile's associated team or country is derived from **selected historical records**, not assumed to be a current team.

The animations use CSS transforms/opacity and honour `prefers-reduced-motion`. GameSense historical data remains sourced separately from all photos.

## Final analysis expansion — 30 October 2026
The Cricket menu supports **IPL player-seasons**, **international ODI**, **international T20I** and **international Test match** views. The new archives contain 2,988 ODI, 4,501 T20 and 878 Test match records from 2001–2025, from a [Cricsheet-derived historical CSV project](https://github.com/eddy-dev07/circ_sheet-analysis-project). They are stored as 11 small CSV segments, parsed in the browser, and displayed as two team perspectives per match. For results where the source winner is blank or not one of the teams, the outcome is **unreported** rather than an invented win/loss. These are observed match records, not a live feed; coverage varies by competition.

The dashboard now also provides **interactive, animated SVG charts**: (1) a year-by-year historical metric trend and (2) a top-competitor comparison. Both change when sport, competition, season, or metric changes and work without charting CDNs. The graphs show totals for additive metrics, means for rates and finishing positions, and handle missing values without fabrication. The previous compact season trend and ranking visuals remain.

Data rights: original Cricsheet structured match data is published under ODC-BY 1.0 (https://cricsheet.org/licensing/). The derivative project hosts transformed match tables; the original source must continue to be credited. As always, this is a student analytic selection, not an official cricket statistics service.

## International cricket player analysis (30 October 2026)
Cricket now has three additional **international player batting views**: ODI Players, T20I Players and Test Players. These complement the existing IPL player statistics and separately tracked country match outcomes. The bundled `cricket-international-players.json` is a format-specific career snapshot with **583 player-format records for 209 named players from 12 countries** (205 ODI, 201 T20I, 177 Test). The underlying `total_teams_batting.csv` from [Prabhath66/Cricket_stats_analysis](https://github.com/Prabhath66/Cricket_stats_analysis) is credited as the published snapshot used to generate these summaries; its update schedule and full original data provenance are not independently verified.

Fields include matches, innings, runs, balls faced, batting average, strike rate, highest score, fifties, hundreds, fours and sixes. International player scoreboards are filtered by format. Profiles show the source's country affiliation. **Do not mistake these for current official totals**: they are static historical career totals, not results per year. The year-by-year trend chart explicitly explains that this source does not include yearly observations rather than manufacturing them. Bowling figures are not bundled in these player snapshots; country-match results and IPL wickets remain separate.

Data note: player stats are factual records sourced from a third-party public repository; that repository does not provide an explicit dataset licence in the inspected metadata. Review the source rights before redistribution outside this educational project.

## Field Notes redesign and analytical chart expansion (30 October 2026)

GameSense now follows the dedicated [DESIGN.md](DESIGN.md) identity: *sports matchday publication meets analyst's notebook*. The HTML and CSS use a bespoke editorial rhythm, Barlow Condensed / Source Sans 3 / IBM Plex Mono, signal-yellow and charcoal, paper-like primary charts, squared rules instead of soft-glass cards, numbered sport navigation, and reduced-motion-aware chart animation. Generic decorative emoji/gradient templates were deliberately removed. This is an original GameSense interpretation of a professional sports data product; it does not reproduce STATSCORE assets or proprietary layout.

The selected source metric drives five complementary chart views:
1. **Yearly trend**, when source years exist. Historical international player snapshots instead compare the chosen athlete's ODI/T20I/Test career figures across formats; no missing seasonal values are fabricated.
2. **Top competitors** by selected metric.
3. **Distribution histogram** showing how concentrated or spread out competitor totals/averages are.
4. **Volume vs performance scatter** showing sample matches/observations against the chosen metric.
5. **Head-to-head four-metric comparison**, scaled independently for each metric so unlike units aren't misleadingly compared.

Rankings and source rows remain traceable, filters still change all graphs, and missing data produce explicit explanations rather than fake figures. Competitor profile panels use strict Wikipedia title matching and an initials fallback; known IPL abbreviations such as V Kohli and RG Sharma are expanded only for image lookup. Teams/countries use historical records when available and do not imply a current signing.

**Tests**: JavaScript syntax passed; the new DOM IDs all exist; a simulated browser execution with genuine IPL, international player snapshot, ODI, T20I and Test file samples plus independent Soccer, NBA, and F1 fixtures rendered charts and comparisons across all ten tested sport/format states without a runtime error. This does not substitute for a real cross-browser visual inspection.

AI collaboration was used extensively to design and implement the project; see the original AI assistance disclosure and assessment requirements. The redesigned visual identity is not presented as evidence that no AI was used.

## Portrait + low-colour profile revision
The selected-subject photograph now occupies a dedicated large archival profile panel beneath the filters. Click any name in the rankings table or ranking bars to change the subject and see their historical affiliation (soccer club, NBA team, F1 constructor, international cricket country). Wikipedia/Wikimedia photo matching uses exact article titles, controlled name expansions for a few abbreviated IPL entries, original Wikimedia file/page credit links and a REST fallback. Country match-results use flags instead of unrelated portraits. If no safe picture can be found, a readable monogram appears; we do **not** fabricate team memberships for rows that omit them. This feature requires an internet connection for third-party imagery. The colour scheme has been subdued to slate, paper, sage, muted ochre and muted rose; neon lime is removed. Browser script and source-data smoke checks passed, but the live browser's ability to access Wikimedia imagery depends on its network settings.
