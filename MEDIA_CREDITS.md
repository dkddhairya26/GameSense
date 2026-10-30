# Media credits, photo reliability and licensing

GameSense displays historic football club crests **locally** from `assets/club-badges/*.svg` when a matching club name is available. Original design assets were retrieved from https://github.com/imadeddine-belkat/Premier-League-Stats/tree/main/pl_stats/_badges . These club marks may be protected by trademark or copyright; inclusion for a school archive does not imply affiliation or commercial licensing.

The website displays a linked source next to remotely retrieved player portraits. These are **not guaranteed to display** when Wikimedia or a sports provider is blocked by school/browser security. Fallback flags/initials do not represent photos. The locally hosted club crests have no such external network requirement.

## Four illustrated sport cards

The four home navigation cards now have **locally hosted, real sports photographs**, not generated people or generic placeholders. The originals came from Wikimedia Commons; the site crops them with CSS but does not alter the photo files:

| Sport | Original Wikimedia file | Photographer | Licence |
| --- | --- | --- | --- |
| Football | [Manchester City – Burnley, 31 Jan 2024](https://commons.wikimedia.org/wiki/File:Manchester_City_-_Burnley_31_Jan_2024.jpg) | Fra Casa | CC0 |
| Basketball | [Orlando Magic vs. Milwaukee Bucks, Dec 2024](https://commons.wikimedia.org/wiki/File:Orlando_Magic_vs._Milwaukee_Bucks_December_2024_17_(in-game_action).jpg) | Michael Barera | CC BY-SA 4.0 |
| Cricket | [Indian Premier League](https://commons.wikimedia.org/wiki/File:Indian_Premier_League.jpg) | Ashwin John | CC BY-SA 2.0 |
| Formula 1 | [2024 Spanish Grand Prix](https://commons.wikimedia.org/wiki/File:2024_Spanish_Grand_Prix_(53811183018).jpg) | jtstewart | CC BY-SA 2.0 |

Each card also carries a newly drawn white vector icon: a football, basketball, cricket bat with ball, or racing flag. These icons are original site artwork in `assets/sport-icons/`.

## Portrait index and display rules

`assets/portrait-manifest.json` holds image URLs and corresponding Wikimedia file-credit links for identity-checked Cricket and F1 articles. `tools/build_portrait_manifest.py` regenerates this index from the bundled historical competitor lists; a name or Wikipedia redirect must match, and the article must have a relevant sporting description and actual image. The index intentionally does not fill gaps with unrelated photographs.

Football individual-player photographs are requested from the Premier League image CDN using their recorded player photo IDs; NBA player photographs are requested from the league's official CDN using recorded NBA player IDs. If a provider photo is missing, the page attempts a Wikimedia article image. The ranking table loads portrait thumbnails lazily as they approach the screen; **SHOW NEXT PEOPLE** lets visitors reach competitors beyond the initial 120. The featured, ranking, leader and selected-profile photos all carry a small sport icon. Selecting a ranking entry reveals its image-credit link in the profile view.

Some historical racers and cricketers have no verified Wikimedia article photograph. In those cases GameSense shows their initials (or a national flag), with a sport icon. Images hosted by leagues or Wikimedia remain subject to those providers' availability and rights.

## Confirmed Wikimedia files in the code
- Virat Kohli — *Virat Kohli portrait.jpg*, photograph by Anand Anil; CC BY-SA 4.0. https://commons.wikimedia.org/wiki/File:Virat_Kohli_portrait.jpg
- Lewis Hamilton — *Lewis Hamilton portrait.jpg*, photograph by Ben Novakovic; CC BY-SA 2.0. https://commons.wikimedia.org/wiki/File:Lewis_Hamilton_portrait.jpg
- Mohamed Salah — *Mohamed Salah Argentina v Egypt 7 July 2026-277.jpg*, photograph by Bryan Berlin; CC BY-SA 4.0. https://commons.wikimedia.org/wiki/File:Mohamed_Salah_Argentina_v_Egypt_7_July_2026-277.jpg

Photos are linked from Wikimedia rather than bundled in the site. Appropriate attribution and share-alike terms remain attached to the source images, and no image author endorses GameSense.

Other athlete portraits use the English Wikipedia query and summary APIs; NBA headshots may be requested from the league's public image CDN. Premier League player headshots may be requested from the Premier League image CDN; those images are externally hosted and are not assumed to be freely licensed. Source links are surfaced wherever available.

## Visual refresh: embedded photos and original mark
The home page now contains actual `<img>` elements for Mohamed Salah, LeBron James, Virat Kohli and Lewis Hamilton. The three confirmed Wikimedia Commons file credits are listed above; LeBron James uses an externally hosted NBA headshot from `cdn.nba.com`, with an NBA source link. HTTP image availability was checked during development, but networks and providers can change.

The rankings table loads a competitor photo or club crest when its row approaches the viewport. It uses the same conservative source matching as the full profile panel. A player without a verifiable available image displays initials or a country flag; no unrelated photograph is substituted. Selecting the row opens the profile with the photo's attribution link. This cannot guarantee a real photograph for every historical competitor.

`assets/gamesense-mark.svg` is an original vector mark created for this GameSense redesign. It is stored locally, and does not depend on an external image service.

## Historical footballer records
Season-by-season player statistics use Vaastav Anand's Fantasy Premier League data: https://github.com/vaastav/Fantasy-Premier-League (repository includes a MIT license for its software). FPL stats use that provider's definitions and coverage. Ten archived seasons cover 2016/17 through 2025/26. Any source metric missing in a particular year is presented as **not recorded**, not zero or an invented figure.
