import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const code = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const mark = fs.readFileSync(path.join(root, 'assets/gamesense-mark.svg'), 'utf8');
const portraitIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/portrait-manifest.json'), 'utf8'));

assert.match(mark, /^<svg /);
assert.match(mark, /viewBox="0 0 96 96"/);
assert.match(html, /rel="icon"[^>]*gamesense-mark\.svg/);
assert.match(html, /class="brand-mark"[^>]*gamesense-mark\.svg/);

const featured = [...html.matchAll(/data-featured-sport="(Soccer|NBA|Cricket|F1)"/g)];
assert.equal(featured.length, 4);
assert.equal((html.match(/class="featured-image"/g) || []).length, 4);
assert.equal((html.match(/class="featured-credit"/g) || []).length, 4);
assert.match(css, /\.featured-image img\.is-loaded/);

for(const name of ['football','basketball','cricket','f1']){
  const image = path.join(root,'assets/sport-photos',name+'.jpg');
  const icon = path.join(root,'assets/sport-icons',name+'.svg');
  assert.ok(fs.statSync(image).size>10000, `Missing home ${name} photo`);
  assert.match(fs.readFileSync(icon,'utf8'),/^<svg /,`Missing ${name} equipment icon`);
  assert.ok(html.includes(`assets/sport-photos/${name}.jpg`));
  assert.ok(html.includes(`assets/sport-icons/${name}.svg`));
}
assert.equal((html.match(/class="home-sport-photo"/g)||[]).length,4);
assert.equal((html.match(/class="home-sport-icon"/g)||[]).length,4);
assert.match(css,/\.home-sport-photo/);
assert.match(css,/\.rank-sport-icon/);
assert.match(html,/id="showMoreRanks"/);
assert.match(code,/visibleRankingCount\+=120/);
assert.match(code,/portraitManifest\[sport\]/);
assert.match(code,/loading='eager'/);
for(const id of ['leaderPortrait','subjectPortrait','avatarPhotoA','avatarPhotoB']){
  assert.match(html,new RegExp(`id="${id}"[^>]*hidden loading="eager"`));
}
assert.ok(Object.keys(portraitIndex.Cricket).length>150);
assert.ok(Object.keys(portraitIndex.F1).length>450);

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
console.log('PASS: logo, sport cards/photos/icons, indexed portraits, expandable rankings, source links, project documentation.');
