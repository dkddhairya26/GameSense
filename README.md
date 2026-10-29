# GameSense Web — independent static website

This site belongs to the publisher who places it in their own GitHub repository. It has no ChatGPT Sites dependency, account dependency or external JavaScript CDN. Its data and graphics are local static files, and it can be hosted using GitHub Pages.

## Publish under your own GitHub account

1. Sign in to GitHub and create a new public repository named `GameSense-Web` (or another name you choose).
2. Upload `index.html`, `app.js`, `style.css`, and the entire `data` folder, preserving paths. **Upload the extracted files, not the ZIP.**
3. Go to **Settings → Pages → Build and deployment → Deploy from a branch**. Select `main` and `/ (root)`, then Save.
4. Your own URL will be `https://YOUR-USERNAME.github.io/GameSense-Web/` (change repository name if needed). The URL is controlled by your account.
5. Test all four sport tabs and imports in Edge/Chrome. GitHub Pages can take a few minutes to activate. Avoid making a false claim that teacher-facing access has been tested.

## Contents and limitations

The complete GameSense desktop project is preserved separately. This is a static, **reduced-functionality web port**, not the original Python/PySide6 desktop executable. Real bundled Soccer, NBA and F1 observations were extracted from the supplied v0.10 assessment project. AFL team records were available only in a private local QA cache, not the submitted ZIP. The desktop app's AFL player connector is opt-in and cites AFL Tables-derived research; those records are **not redistributed** in this site because original-source data rights require review. AFL supports CSV/JSON player-data imports; its initial view shows no invented athletes or statistics. Squiggle prohibits directly fetching its service from a visitor's browser.

The dashboard calculates totals for selected rows, with F1 mean grid and finishing positions. Totals from partial/ongoing seasons are not official rankings. Some metric names are not available for every source row. No complete historical archive or player history is implied.

## Testing locally

Browser `file://` permissions often prevent JavaScript `fetch()` from reading the static JSON. To run locally without web hosting, with Python installed run `python -m http.server 8000` from this directory and open `http://localhost:8000` in your browser. **On GitHub Pages, this is not needed.**

## Source credits

- F1: [F1DB](https://github.com/f1db/f1db), Marcel Overdijk and contributors, CC BY 4.0, v2026.18.0 snapshot.
- NBA: [BoxScore Lab](https://boxscorelab.com/downloads/), CC BY 4.0 snapshot 28 Oct 2026.
- Football club results: [OpenFootball football.json](https://github.com/openfootball/football.json), CC0.
- AFL player research connector in desktop project: [AFL-Data-Analysis](https://github.com/akareen/AFL-Data-Analysis); derived from AFL Tables, separate underlying source rights. **No player records shipped here.**
- [Squiggle API](https://api.squiggle.com.au/): AFL team results, visitor-browser API access not permitted.

AI assistance was used in development. The student must personally review, test and adapt the work, and disclose assistance under their course's assessment rules.
