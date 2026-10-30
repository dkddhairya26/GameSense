"""Build a conservative image index for GameSense's F1 and cricket subjects.

Source: English Wikipedia page-image API; pictures are served from Wikimedia,
not copied into this repository. Only exact (or redirected) names with a
sport-related page description are used. Source links accompany the images.
Run again if the historical source datasets change.
"""

import ast
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "portrait-manifest.json"
API = "https://en.wikipedia.org/w/api.php"
AGENT = "GameSenseSchoolArchive/1.0 (https://github.com/dkddhairya26/GameSense)"


def names_from(filename):
    rows = json.loads((ROOT / filename).read_text(encoding="utf-8"))
    return {str(row.get("competitor", "")).strip() for row in rows if row.get("competitor")}


def aliases():
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    match = re.search(r"const portraitAliases=(\{[^;]+\});", app, re.DOTALL)
    if not match:
        return {}
    # The alias dictionary is plain quoted JS keys and values, with no expressions.
    return ast.literal_eval(match.group(1))


def title_key(value):
    value = re.sub(r"\s*\([^)]*\)\s*", " ", value or "")
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def request_pages(titles):
    params = urlencode({
        "action": "query", "format": "json", "formatversion": 2,
        "redirects": 1, "titles": "|".join(titles),
        "prop": "pageimages|description", "piprop": "thumbnail|name",
        "pithumbsize": 340,
    })
    req = Request(API + "?" + params, headers={"User-Agent": AGENT, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urlopen(req, timeout=25) as response:
                return json.load(response).get("query", {})
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 2:
                print("Warning: skipped an unavailable image batch:", str(error))
                return {}
            time.sleep(1 + attempt)
    return {}


def allowed(description, sport):
    description = (description or "").lower()
    if sport == "Cricket":
        return any(word in description for word in (
            "cricketer", "cricket coach", "cricket team", "batsman", "batter", "bowler",
        ))
    return any(word in description for word in ("racing driver", "formula one", "formula 1", "motorsport driver"))


def collect(sport, title_to_name, manifest):
    queries = sorted(title_to_name)
    for offset in range(0, len(queries), 40):
        batch = queries[offset:offset + 40]
        query = request_pages(batch)
        by_key = {title_key(title): title_to_name[title] for title in batch}
        # Follow Wikipedia's own redirect only if the requested identity was
        # exact, and then check the sport-related article description.
        for redirect in query.get("redirects", []):
            original = by_key.get(title_key(redirect.get("from")))
            if original:
                by_key[title_key(redirect.get("to"))] = original
        for page in query.get("pages", []):
            name = by_key.get(title_key(page.get("title")))
            photo = page.get("thumbnail", {}).get("source", "")
            if not name or name in manifest or not photo.startswith("https://") or not allowed(page.get("description"), sport):
                continue
            clean = urlsplit(photo)
            photo = urlunsplit((clean.scheme, clean.netloc, clean.path, "", ""))
            file_title = page.get("pageimage")
            credit = ("https://commons.wikimedia.org/wiki/File:" + quote(file_title.replace(" ", "_"))) if file_title else (
                "https://en.wikipedia.org/wiki/" + quote(page["title"].replace(" ", "_")))
            manifest[name] = {"src": photo, "credit": credit}
        time.sleep(.15)


def build():
    alias = aliases()
    groups = {
        "Cricket": names_from("cricket.json") | names_from("cricket-international-players.json"),
        "F1": names_from("f1.json"),
    }
    manifest = {"Cricket": {}, "F1": {}}
    for sport, raw_names in groups.items():
        names = sorted({alias.get(name, name) for name in raw_names if name})
        collect(sport, {name: name for name in names}, manifest[sport])
        # Some names are ambiguous and Wikipedia disambiguates their article
        # title. A second exact-name pass can resolve those safely.
        suffixes = [" (cricketer)", " (Indian cricketer)", " (Australian cricketer)"] if sport == "Cricket" else [" (racing driver)", " (Formula One driver)"]
        for suffix in suffixes:
            missing = [name for name in names if name not in manifest[sport]]
            collect(sport, {name + suffix: name for name in missing}, manifest[sport])
        print(sport, "verified portraits:", len(manifest[sport]), "of", len(names), "named competitors")
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Saved", OUTPUT.name)


if __name__ == "__main__":
    build()
