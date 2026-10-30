import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const code = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const mark = fs.readFileSync(path.join(root, 'assets/gamesense-mark.svg'), 'utf8');

assert.match(mark, /^<svg /);
assert.match(mark, /viewBox="0 0 96 96"/);
assert.match(html, /rel="icon"[^>]*gamesense-mark\.svg/);
assert.match(html, /class="brand-mark"[^>]*gamesense-mark\.svg/);

const featured = [...html.matchAll(/data-featured-sport="(Soccer|NBA|Cricket|F1)"/g)];
assert.equal(featured.length, 4);
assert.equal((html.match(/class="featured-image"/g) || []).length, 4);
assert.equal((html.match(/class="featured-credit"/g) || []).length, 4);
assert.match(css, /\.featured-image img\.is-loaded/);

assert.match(code, /hydrateRankingPhotos\(\)/);
assert.match(code, /IntersectionObserver/);
assert.match(code, /rank-thumb/);
assert.match(code, /resolveWikiPortraitFallback/);

for (const source of [
  'https://github.com/openfootball/football.json',
  'https://github.com/vaastav/Fantasy-Premier-League',
  'https://boxscorelab.com/downloads/',
  'https://cricsheet.org/',
  'https://github.com/f1db/f1db'
]) assert.ok(html.includes(source), `Missing sport source: ${source}`);

assert.doesNotMatch(html, /DATA, CODE & AI DISCLOSURE/);
assert.match(html, /SOURCE CODE &amp; PROJECT NOTES/);
assert.ok(fs.readFileSync(path.join(root, 'PROJECT_EVIDENCE.md'), 'utf8').includes('AI and academic integrity'));
console.log('PASS: logo, featured images, ranking-photo support, source links and project disclosure record.');
