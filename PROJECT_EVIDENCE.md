# GameSense — design and assessment evidence

GameSense is a **static browser-based** version of a four-sport analytics project, covering Soccer, NBA, Cricket (IPL), and Formula 1.

## Proposal alignment
The original proposal called for a modular four-sport platform that cleans historical datasets, computes sport-specific performance statistics, compares competitors, shows historical charts, assesses recent form and provides rankings. This edition implements those functions with HTML/CSS/JavaScript instead of the proposed Python/Streamlit tooling. The design change avoids unsigned Windows installer problems at school. **AFL has been replaced with Cricket**, because no distributable AFL player dataset was available in the supplied archive; source-derived IPL player-season data could be included. The change is disclosed rather than concealed.

## Data and processing
- Soccer: 108,962 club-perspective match rows from OpenFootball. Calculated match points: `3×wins + draws`, after detecting that a prior `points` field described goals instead of league points.
- NBA: 2,673 player-season records, attributed to BoxScore Lab (CC BY 4.0).
- Cricket: **208 curated player-season records over 19 observed IPL editions** from Cricsheet-derived `VeeraMounika/IPL-analytics-ETL/csv/player_season_stats.csv`. For each season select seven leaders in runs and four leaders in wickets, then deduplicate overlaps. These are **not** complete league rankings. Cricsheet's JSON/CSV data: ODC-BY 1.0, https://cricsheet.org/licensing/
- F1: 27,687 driver race-result rows from F1DB (CC BY 4.0).

Fields are normalized and missing statistics are treated as missing, rather than invented. Duplicate checks distinguish legitimate multiple F1 driver entries on the same date. The app provides filters, a sport-specific 0–100 experimental GameSense performance index, and recent form using latest *observed* events or seasons; scores do not predict future results and are not comparable across sports.

## AI and academic integrity
ChatGPT assisted substantially with the website's code, data loader, source transformation, testing, design and explanatory writing. The supplied task sheet explicitly authorizes **Level 3 AI Collaboration for the Major Project**, requiring the student to critically evaluate and modify AI-assisted material. It **prohibits AI for the separate supervised validation (Level 1)**. The student must follow any additional genuine school-approved written instructions, keep authentic progress evidence, personally verify code and perform the validation without AI.

## Testing evidence
Local programmatic checks of the offline edition verified all four sports return nonempty rankings and recent-form summaries. An initial duplicate-key bug dropped 56 real F1 rows; using the source's race/team fields restored all 27,687 F1 records. A full visual browser test remains for the student because the automated browser environment blocked local navigation.

## External sources
- OpenFootball: https://github.com/openfootball/football.json
- F1DB: https://github.com/f1db/f1db
- BoxScore Lab: https://boxscorelab.com/downloads/
- Cricket data: https://cricsheet.org/ and https://github.com/VeeraMounika/IPL-analytics-ETL
- Cricsheet licence: https://cricsheet.org/licensing/

This is a student learning project, not an official sport-data service.