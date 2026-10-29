const $ = (id) => document.getElementById(id);

let sport = 'Soccer';
let all = [];
let imports = [];
let filtered = [];
let ranking = [];
let aflBundled = false;

const defs = {
  Soccer: {
    title: 'Soccer intelligence',
    sub: 'Historical club results, season filters and rankings from bundled match records.',
    coverage: 'Club-match history loaded from bundled files',
    source: 'OpenFootball',
    sourceSub: 'Bundled team results · no player-level football stats',
    accent: '#5ae0b0',
    accent2: '#4bb4ff',
    metrics: {
      points: 'Match points',
      goals: 'Goals scored',
      goals_against: 'Goals conceded',
      wins: 'Wins',
      draws: 'Draws'
    }
  },
  NBA: {
    title: 'NBA performance lab',
    sub: 'Real player-season totals with rankings, comparisons and historical trend views.',
    coverage: 'Bundled player-season totals',
    source: 'BoxScore Lab',
    sourceSub: 'Bundled seasons from the GameSense archive',
    accent: '#ffb347',
    accent2: '#ff6f61',
    metrics: {
      points: 'Points',
      rebounds: 'Rebounds',
      assists: 'Assists',
      games: 'Games',
      minutes: 'Minutes'
    }
  },
  AFL: {
    title: 'AFL player analytics',
    sub: 'Analyse real AFL player records, compare seasons and import or bundle your own permitted dataset.',
    coverage: 'AFL data can load from afl.json / afl.csv or local imports',
    source: 'AFL import / repository file',
    sourceSub: 'Real user-supplied AFL records only',
    accent: '#7ef264',
    accent2: '#2ec27e',
    metrics: {
      disposals: 'Disposals',
      kicks: 'Kicks',
      handballs: 'Handballs',
      marks: 'Marks',
      tackles: 'Tackles',
      goals: 'Goals'
    }
  },
  F1: {
    title: 'Formula 1 race analysis',
    sub: 'Driver race-result history from 1950 onward with rankings and season trend analysis.',
    coverage: 'Bundled driver race records',
    source: 'F1DB',
    sourceSub: 'Bundled driver-result history',
    accent: '#ff6d8c',
    accent2: '#cb6dff',
    metrics: {
      points: 'Race points',
      wins: 'Wins',
      podiums: 'Podiums',
      finish_position: 'Average finish position',
      grid_position: 'Average grid position'
    }
  }
};

function setTheme() {
  const d = defs[sport];
  document.documentElement.style.setProperty('--accent', d.accent);
  document.documentElement.style.setProperty('--accent-2', d.accent2);
  document.documentElement.style.setProperty('--glow', hexToRgba(d.accent, 0.18));
  $('crumbSport').textContent = sport.toUpperCase();
  $('sportTitle').textContent = d.title;
  $('subtitle').textContent = d.sub;
  $('heroSportTag').textContent = sport.toUpperCase();
  $('heroCoverage').textContent = d.coverage;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function numeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function norm(raw, forcedSport = null) {
  const o = { ...raw };
  o.sport = String(forcedSport || o.sport || sport).trim();
  o.season = String(o.season || o.year || 'Unknown').trim();
  o.competitor = String(o.competitor || o.player || o.player_name || o.athlete || o.club || o.driver || o.team_name || o.name || '').trim();
  o.competition = String(o.competition || o.league || (o.sport === 'AFL' ? 'VFL/AFL' : 'All competitions')).trim();
  o.competitor_id = String(o.competitor_id || o.player_id || o.driver_id || o.club_id || o.name || o.competitor);
  o.team = String(o.team || '').trim();
  [
    'points','goals','goals_against','wins','draws','losses','rebounds','assists','games','minutes',
    'disposals','kicks','handballs','marks','tackles','finish_position','grid_position','podiums'
  ].forEach(k => { if (o[k] !== undefined) o[k] = numeric(o[k]); });
  return o;
}

function parseCSV(text) {
  let rows = [], row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  const headers = (rows.shift() || []).map(x => x.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

async function fetchDataset(name, parser = 'json') {
  const paths = [`data/${name}`, name];
  let lastErr = '';
  for (const url of paths) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) { lastErr = `${url} (HTTP ${res.status})`; continue; }
      if (parser === 'csv') return parseCSV(await res.text());
      return await res.json();
    } catch (err) {
      lastErr = `${url}: ${err.message}`;
    }
  }
  throw new Error(lastErr || `Could not load ${name}`);
}

async function load() {
  const failures = [];
  const bundles = [
    { name: 'soccer-01.json', sport: 'Soccer' },
    { name: 'soccer-02.json', sport: 'Soccer' },
    { name: 'soccer-03.json', sport: 'Soccer' },
    { name: 'soccer-04.json', sport: 'Soccer' },
    { name: 'soccer-05.json', sport: 'Soccer' },
    { name: 'f1.json', sport: 'F1' },
    { name: 'nba.json', sport: 'NBA' }
  ];
  all = [];
  for (const file of bundles) {
    try {
      const records = await fetchDataset(file.name, 'json');
      if (Array.isArray(records)) all.push(...records.map(r => norm(r, file.sport)));
      else failures.push(`${file.name}: expected an array`);
    } catch (err) {
      failures.push(`${file.name}: ${err.message}`);
    }
  }

  aflBundled = false;
  const aflCandidates = [
    { name: 'afl.json', parser: 'json' },
    { name: 'afl.csv', parser: 'csv' },
    { name: 'afl-player-seasons.json', parser: 'json' },
    { name: 'afl_player_seasons.json', parser: 'json' }
  ];

  for (const file of aflCandidates) {
    try {
      const records = await fetchDataset(file.name, file.parser);
      if (Array.isArray(records) && records.length) {
        all.push(...records.map(r => norm(r, 'AFL')));
        aflBundled = true;
        $('aflSourceText').textContent = `AFL bundled data detected from ${file.name}. These records are now available directly on the site.`;
        break;
      }
    } catch (err) {
      // optional file; ignore until one works
    }
  }

  try {
    const saved = localStorage.getItem('gamesense-imports');
    if (saved) imports = JSON.parse(saved).map(r => norm(r));
  } catch (err) {
    failures.push(`Saved imports: ${err.message}`);
  }

  $('loadState').textContent = `${all.length.toLocaleString()} bundled rows loaded${aflBundled ? ' · AFL included' : ''}`;
  $('importStatus').textContent = failures.length
    ? `Loaded with some warnings: ${failures.join(' | ')}`
    : (aflBundled
        ? 'All bundled sport data loaded successfully, including AFL.'
        : 'Bundled Soccer, NBA and F1 data loaded. Upload afl.json / afl.csv or import AFL locally to add AFL player data.');

  updateControls();
}

function rows() {
  return [...all, ...imports].filter(r => String(r.sport).toLowerCase() === sport.toLowerCase());
}

function options(values, selected) {
  return values.map(v => `<option${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function number(v) {
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function metricValue(row, metric) {
  if (metric === 'wins' && sport === 'F1') return row.finish_position === 1 ? 1 : 0;
  if (metric === 'podiums' && sport === 'F1') return row.finish_position > 0 && row.finish_position <= 3 ? 1 : 0;
  return typeof row[metric] === 'number' && Number.isFinite(row[metric]) ? row[metric] : null;
}

function aggregate(records, metric) {
  const groups = new Map();
  for (const row of records) {
    if (!row.competitor) continue;
    const id = row.competitor_id || row.competitor;
    const item = groups.get(id) || { id, name: row.competitor, rows: 0, sum: 0, n: 0, season: new Map() };
    item.rows++;
    const v = metricValue(row, metric);
    if (v !== null) {
      item.sum += v;
      item.n++;
      const s = item.season.get(row.season) || { sum: 0, n: 0 };
      s.sum += v; s.n++;
      item.season.set(row.season, s);
    }
    groups.set(id, item);
  }
  return [...groups.values()]
    .filter(g => g.n)
    .map(g => ({ ...g, metric: metric.endsWith('_position') ? g.sum / g.n : g.sum }))
    .sort((a, b) => metric.endsWith('_position') ? a.metric - b.metric : b.metric - a.metric);
}

function updateControls() {
  setTheme();
  const d = defs[sport];
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.sport === sport));
  const rr = rows();
  const seasons = [...new Set(rr.map(x => x.season))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const competitions = [...new Set(rr.map(x => x.competition))].sort();
  const oldSeason = $('season').value;
  const oldCompetition = $('competition').value;
  $('season').innerHTML = options(['All seasons', ...seasons], oldSeason);
  $('competition').innerHTML = options(['All competitions', ...competitions], oldCompetition);
  $('metric').innerHTML = Object.entries(d.metrics).map(([k, v]) => `<option value="${k}">${escapeHtml(v)}</option>`).join('');
  render();
}

function render() {
  const season = $('season').value;
  const competition = $('competition').value;
  const query = $('search').value.trim().toLowerCase();
  const metric = $('metric').value || Object.keys(defs[sport].metrics)[0];
  const d = defs[sport];

  filtered = rows().filter(r =>
    (!season || season === 'All seasons' || r.season === season) &&
    (!competition || competition === 'All competitions' || r.competition === competition)
  );

  ranking = aggregate(filtered, metric).filter(g => !query || g.name.toLowerCase().includes(query));

  $('count').textContent = number(filtered.length);
  $('competitors').textContent = number(new Set(filtered.map(r => r.competitor_id)).size);
  $('seasons').textContent = number(new Set(filtered.map(r => r.season)).size);
  $('source').textContent = sport === 'AFL' && aflBundled ? 'AFL bundled file' : d.source;
  $('sourceSub').textContent = sport === 'AFL' && !aflBundled ? 'Bundle or import AFL to unlock player stats' : d.sourceSub;
  $('rankingMetric').textContent = d.metrics[metric];
  $('metricHead').textContent = d.metrics[metric];

  const top = ranking.slice(0, 10);
  const max = Math.max(...top.map(x => x.metric), 0.001);
  $('bars').innerHTML = top.length ? top.map(g => `
    <div class="barrow">
      <span class="barname" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</span>
      <div class="track"><div class="fill" style="width:${Math.min(100, Math.max(1, g.metric / max * 100))}%"></div></div>
      <span class="value">${number(g.metric)}</span>
    </div>`).join('') : '<p class="empty">No rows found for this selection. Change the filters or load more data.</p>';

  $('rankRows').innerHTML = ranking.slice(0, 120).map((g, i) => `
    <tr><td>${i + 1}</td><td>${escapeHtml(g.name)}</td><td>${number(g.rows)}</td><td>${number(g.metric)}</td></tr>`).join('');

  const previousA = $('compareA').value, previousB = $('compareB').value;
  const compareOptions = ranking.slice(0, 180).map(g => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
  $('compareA').innerHTML = compareOptions;
  $('compareB').innerHTML = compareOptions;
  if (ranking.some(g => g.id === previousA)) $('compareA').value = previousA;
  if (ranking.some(g => g.id === previousB)) $('compareB').value = previousB;
  else if (ranking.length > 1) $('compareB').selectedIndex = 1;

  if (ranking[0]) {
    $('leaderName').textContent = ranking[0].name;
    $('leaderMetric').textContent = `${number(ranking[0].metric)} ${d.metrics[metric].toLowerCase()}`;
    $('insightTitle').textContent = `${ranking[0].name} leads`;
    $('insightText').textContent = `${ranking[0].name} is currently ranked #1 for ${d.metrics[metric].toLowerCase()} in the active filtered view.`;
  } else {
    $('leaderName').textContent = 'No data';
    $('leaderMetric').textContent = 'Nothing matches this filter.';
    $('insightTitle').textContent = 'No insight available';
    $('insightText').textContent = 'Try a different sport, season or metric.';
  }

  renderCompare();
}

function renderCompare() {
  const metric = $('metric').value;
  const a = ranking.find(g => g.id === $('compareA').value);
  const b = ranking.find(g => g.id === $('compareB').value);

  $('comparison').innerHTML = [a, b].filter(Boolean).map(g => `
    <div class="compare-card">
      <span>${escapeHtml(g.name)} · ${number(g.rows)} records</span>
      <strong>${number(g.metric)}</strong>
      <span>${escapeHtml(defs[sport].metrics[metric])}</span>
    </div>`).join('') || '<p class="empty">Select competitors from the available ranking list.</p>';

  const focus = a || b;
  if (!focus) {
    $('trend').innerHTML = '';
    $('trendAxis').innerHTML = '';
    return;
  }

  const seasons = [...focus.season.entries()].sort((x, y) => x[0].localeCompare(y[0], undefined, { numeric: true }));
  const values = seasons.map(([, v]) => metric.endsWith('_position') ? v.sum / v.n : v.sum);
  const max = Math.max(...values, 1);

  $('trend').innerHTML = seasons.map(([season], i) => `
    <div class="trendcol" style="height:${Math.max(7, values[i] / max * 100)}%" title="${escapeHtml(season)}: ${number(values[i])}"></div>`).join('');
  $('trendAxis').innerHTML = seasons.map(([season]) => `<span>${escapeHtml(season)}</span>`).join('');
}

$('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    let parsed = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCSV(text);
    if (!Array.isArray(parsed)) parsed = parsed.records || parsed.data || [];
    if (!Array.isArray(parsed)) throw new Error('Expected an array of rows.');
    const good = parsed.map(r => norm(r, sport)).filter(x => x.competitor && x.season && x.sport === sport);
    if (!good.length) throw new Error(`No ${sport} rows found with competitor and season fields.`);
    imports.push(...good);
    localStorage.setItem('gamesense-imports', JSON.stringify(imports));
    $('importStatus').textContent = `${good.length.toLocaleString()} ${sport} rows imported into this browser.`;
    if (sport === 'AFL') $('aflSourceText').textContent = 'AFL data is currently active from your local browser import.';
    updateControls();
  } catch (err) {
    $('importStatus').textContent = `Import failed: ${err.message}`;
  }
});

$('clearImports').onclick = () => {
  imports = [];
  localStorage.removeItem('gamesense-imports');
  $('importStatus').textContent = 'Local imported data cleared.';
  $('aflSourceText').textContent = aflBundled
    ? 'AFL bundled data is still available from your repository file.'
    : 'AFL player data will load automatically if a compatible AFL file is uploaded to this repository or imported locally in the browser.';
  updateControls();
};

$('export').onclick = () => {
  const metric = $('metric').value;
  const csv = ['Competitor,Records,' + metric, ...ranking.map(x => [x.name, x.rows, x.metric].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `gamesense-${sport.toLowerCase()}-rankings.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

document.querySelectorAll('.nav').forEach(btn => btn.onclick = () => {
  sport = btn.dataset.sport;
  $('search').value = '';
  updateControls();
});

['season', 'competition', 'metric', 'search'].forEach(id => {
  $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
});
['compareA', 'compareB'].forEach(id => $(id).addEventListener('change', renderCompare));

load();
