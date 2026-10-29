# GameSense visual language — Field Notes / Edition 01

## Identity
GameSense is a *sports research publication*, not a fintech dashboard, SaaS product, or real-time betting app. It helps a student or a fan read historical records critically. Its design metaphor is a matchday programme crossed with an analyst's notebook.

## Non-negotiable visual choices
- **Typography**: Barlow Condensed for headlines and navigation; Source Sans 3 for editorial reading; IBM Plex Mono for data labels, timestamps, figures and axes. No Inter/Roboto/Arial as the authored face.
- **Palette**: coal `#0c1113`, off-white `#f2f1e9`, warm-paper `#e8e7df`, dark-rule `#2a3335`, desaturated sage `#a9bbac`, archival paper and muted per-sport accents. No fluorescent yellow, purple, indigo, glassmorphism, blur/shadow cards or generic gradients.
- **Shape**: mostly straight edges, 1–4 px corner radius only where ergonomically required, sharp dividers, underlines, left-margin annotation bars. No rounded-2xl pill patterns.
- **Navigation**: sports have numbered text tabs, not emoji; archive sections have clear labels. No decorative stars, trophy icons or generic AI copy.
- **Hierarchy**: editorial masthead → current subject → filter strip → primary charts → diagnostic charts → competitors/notes → methods and provenance.
- **Composition**: asymmetrical proportion and purposeful white space, with alternating dark and warm-paper chart panels; no repeated four-column feature-card marketing layout.
- **Motion**: entrance reveal for data, bar growth, and a short rule/underline movement to indicate selection. Respect `prefers-reduced-motion`. Do not animate everything continuously or fabricate values.
- **Portraits**: exact Wikipedia article match or initials fallback; disclose that photos are fetched remotely and that team/country corresponds to the selected historical archive, not necessarily the present.
- **Charts**: every view must answer a different question. Year trend = when? leaderboard = who? histogram = how concentrated? scatter = volume vs output? duel = how different on comparable metrics? Include readable axes, units, hover/focus tooltips, and explicit no-data explanations.
- **Integrity**: no invented cricket runs, ratings labelled experimental, no implied live-data feed, honest limits for ODI/T20I/Test and career snapshots.

## Interaction and code rules
- Use local semantic HTML and SVG, no external charting CDN.
- Keep existing ID references needed by `app.js`, or update code and tests together.
- Source colours come from JS `defs`; other layout tokens should be defined in CSS once.
- Keep small screens functional and information visible rather than hiding all navigation.
- Check JS syntax, DOM IDs, all 7 cricket views, and source attributions before deployment.

## AI transparency
This redesign and technical implementation used AI assistance. A distinct design does not claim to have been made without AI; continue to attribute assistance honestly in the assessment documentation.

## Portrait and muted palette revision — 30 October 2026
The fluorescent signal yellow has been replaced by desaturated slate/sage and warm paper, with muted sport accents (football #a9bbac, NBA #c6a68d, cricket #b7ac8c, F1 #b69a97). A selected subject profile sits below filters. It shows a verified photograph or club image from Wikipedia where available; national cricket teams show flags; all other missing images show typographic initials. Photographs load only for exact article-title matches, with a second summary API fallback, cached lookups and Wikimedia attribution/source links. Clicking ranking rows or bars changes the subject. Affiliations are grounded in selected historical records; unknown IPL team assignments are not guessed.
