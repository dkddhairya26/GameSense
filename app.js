/* GameSense web analytics. Sources: OpenFootball, BoxScore Lab, F1DB, Cricsheet-derived IPL player seasons. AI-assisted refinement: see project documentation. */
const $ = (id) => document.getElementById(id);

let sport = 'Soccer';
let all = [];
let imports = [];
let filtered = [];
let ranking = [];

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
      draws: 'Draws',
      performance_score: 'GameSense rating (0–100)'
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
      minutes: 'Minutes',
      performance_score: 'GameSense rating (0–100)'
    }
  },
  Cricket: {
    title: 'Cricket performance lab',
    sub: 'IPL player-season stats and international ODI, T20I and Test results, with separate team and player analysis.',
    coverage: 'IPL player-seasons + historical ODI, T20I and Test results',
    source: 'Cricsheet / IPL ETL',
    sourceSub: 'Curated leading performers; incomplete league coverage',
    accent: '#a6ec6a', accent2: '#ffd966',
    metrics: {
      runs: 'Batting runs', wickets: 'Bowling wickets', games: 'Matches played',
      strike_rate: 'Average recorded strike rate', wins:'Match wins (international)', losses:'Match losses (international)', win_rate:'Win rate % (international)', performance_score: 'GameSense rating (0–100)'
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
      grid_position: 'Average grid position',
      performance_score: 'GameSense rating (0–100)'
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
  o.competition = String(o.competition || o.league || 'All competitions').trim();
  o.competitor_id = String(o.competitor_id || o.player_id || o.driver_id || o.club_id || o.name || o.competitor);
  o.team = String(o.team || '').trim();
  // The provided Soccer 'points' field can encode match goals; derive actual league points from wins/draws.
  if (o.sport === 'Soccer' && o.wins !== undefined && o.draws !== undefined)
    o.points = 3 * Number(o.wins || 0) + Number(o.draws || 0);
  [
    'points','goals','goals_against','wins','draws','losses','rebounds','assists','games','minutes',
    'disposals','kicks','handballs','marks','tackles','finish_position','grid_position','podiums','runs','wickets','strike_rate','economy'
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
  // Load bundles concurrently so large archive chunks don't block first render sequentially.
  let completed=0;
  const results=await Promise.all(bundles.map(async file=>{
    try{
      const records=await fetchDataset(file.name,'json');
      if(!Array.isArray(records))throw Error('expected an array');
      return {file,records};
    }catch(err){return {file,error:err.message};}
    finally{
      completed++;
      $('loadState').textContent='Loading historical archive '+completed+'/'+bundles.length+'…';
    }
  }));
  for(const result of results){
    if(result.error)failures.push(result.file.name+': '+result.error);
    else all.push(...result.records.map(r=>norm(r,result.file.sport)));
  }

  // Cricket is an openly attributable, curated source-derived selection, not synthetic data.
  try {
    const records = (window.GameSenseArchive && window.GameSenseArchive['cricket.json']) || await fetchDataset('cricket.json', 'json');
    if (!Array.isArray(records) || !records.length) throw Error('Missing Cricket records');
    all.push(...records.map(r => norm(r, 'Cricket')));
  } catch (e) { failures.push('cricket.json: '+e.message); }

  // Licensed Cricsheet-derived CSV match observations, split into browser-friendly files.
  const internationalParts=[
    ...Array.from({length:4},(_,i)=>({file:'cricket-odi-'+String(i+1).padStart(2,'0')+'.csv',competition:'International ODI'})),
    ...Array.from({length:6},(_,i)=>({file:'cricket-t20-'+String(i+1).padStart(2,'0')+'.csv',competition:'International T20I'})),
    {file:'cricket-test-01.csv',competition:'International Test'}
  ];
  let internationalCompleted=0;
  const internationalResults=await Promise.all(internationalParts.map(async part=>{
    try{
      const source=await fetchDataset(part.file,'csv');
      if(!Array.isArray(source))throw Error('Invalid CSV');
      return {part,source};
    }catch(e){return {part,error:e.message};}
    finally{
      internationalCompleted++;
      $('loadState').textContent='Loading cricket history '+internationalCompleted+'/'+internationalParts.length+'…';
    }
  }));
  let loadedMatchRows=0;
  for(const result of internationalResults){
    if(result.error){failures.push(result.part.file+': '+result.error);continue;}
    for(const match of result.source){
      const id=String(match.match_id||'').trim(),a=String(match.team1||'').trim(),b=String(match.team2||'').trim(),date=String(match.date||'').trim();
      if(!id||!a||!b||a===b||!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))continue;
      const winner=String(match.winner||'').trim();
      // Unknown winners are undetermined, not losses; never invent outcomes.
      const outcomeA=winner===a?'W':winner===b?'L':'U';
      const outcomeB=winner===b?'W':winner===a?'L':'U';
      for(const [team,opponent,outcome] of [[a,b,outcomeA],[b,a,outcomeB]]){
        all.push(norm({sport:'Cricket',season:date.slice(0,4),competitor:team,competitor_id:'country:'+team,
          competition:result.part.competition,date,opponent,outcome,
          wins:outcome==='W'?1:0,losses:outcome==='L'?1:0,draws:0,games:1,
          venue:match.venue||'',record_id:'cricsheet:'+id+':'+team,
          record_kind:'international_team_match'},'Cricket'));
      }
      loadedMatchRows++;
    }
  }
  $('heroCoverage').title=loadedMatchRows.toLocaleString()+' international match results loaded.';
  try {
    const saved = localStorage.getItem('gamesense-imports');
    if (saved) imports = JSON.parse(saved).map(r => norm(r));
  } catch (err) {
    failures.push(`Saved imports: ${err.message}`);
  }

  // Key includes classification and team; F1 may have multiple legitimate driver entries on one calendar date.
  const seen=new Set(); let duplicates=0, invalid=0;
  all=all.filter(r=>{
    if(!r.competitor || !r.season || !defs[r.sport]){invalid++;return false;}
    const key=[r.sport,r.season,r.competitor_id,r.competition,r.date||'',r.opponent||'',r.team||'',r.finish_position??'',r.grid_position??'',r.record_id||'',r.points??'',r.runs??''].join('|');
    if(seen.has(key)){duplicates++;return false;}
    seen.add(key);return true;
  });
  $('loadState').textContent=all.length.toLocaleString()+' verified historical rows';
  $('qualityStatus').textContent='Validation: '+invalid+' invalid rows excluded · '+duplicates+' duplicates removed · '+failures.length+' loading errors';
  $('importStatus').textContent=failures.length ? failures.join(' | ') : 'Four sports loaded successfully.';
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

/** GameSense's educational 0–100 index is deliberately sport-specific, non-official, non-predictive. */
function ratingValue(r){
  const clamp=n=>Math.max(0,Math.min(100,n));
  if(sport==='Soccer'){
    if(r.wins==null || r.draws==null || r.goals==null || r.goals_against==null)return null;
    return clamp(30+30*r.wins+10*r.draws+12*(r.goals-r.goals_against));
  }
  if(sport==='NBA'){
    let g=numeric(r.games)??numeric(r.games_played);
    if(!g||r.points==null)return null;
    return clamp(2*r.points/g+1.3*(r.rebounds||0)/g+1.5*(r.assists||0)/g);
  }
  if(sport==='Cricket'){
    if(r.record_kind==='international_team_match')return r.outcome==='U'?null:r.wins?100:r.draws?50:0;
    if(!r.games)return null;
    return clamp(1.25*(r.runs||0)/r.games+17*(r.wickets||0)/r.games);
  }
  if(sport==='F1'){
    if(!(r.finish_position>0))return null;
    return clamp(100-7*(r.finish_position-1));
  }
  return null;
}
function metricValue(r,m){
  if(m==='performance_score')return ratingValue(r);
  if(m==='win_rate'&&sport==='Cricket')return r.record_kind==='international_team_match'?(r.outcome==='U'?null:r.wins?100:0):null;
  if(m==='wins'&&sport==='F1')return r.finish_position===1?1:0;
  if(m==='podiums'&&sport==='F1')return r.finish_position>0&&r.finish_position<=3?1:0;
  return typeof r[m]==='number'&&Number.isFinite(r[m])?r[m]:null;
}
// Rates and positions are means. Totals are sums. Missing metrics are excluded, not invented.
function averaged(m){return m.endsWith('_position')||['performance_score','strike_rate','economy','win_rate'].includes(m);}
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
    .map(g => ({ ...g, metric: averaged(metric) ? g.sum / g.n : g.sum }))
    .sort((a, b) => metric.endsWith('_position') || metric === 'economy' ? a.metric - b.metric : b.metric - a.metric);
}

function updateControls() {
  setTheme();
  const d = defs[sport];
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.sport === sport));
  // Explicit visibility, compatible with browsers that do not support CSS :has().
  const cricketPanel=$('cricketFormats');
  if(cricketPanel) cricketPanel.hidden=(sport!=='Cricket');
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


/** Chart renderer: SVG is self-contained, responsive, tooltip accessible and has no external CDNs.
 * Line chart aggregates the current metric per observed year. Bar chart uses current ranking.
 * Missing values are ignored. Position metrics sort ascending; win rate uses only decided games. */
function renderAnalyticalCharts(records,leaders,metric){
  const label=defs[sport].metrics[metric]||metric;
  $('timeChartMetric').textContent=label;
  const byYear=new Map();
  for(const r of records){
    const v=metricValue(r,metric);
    if(v===null||!Number.isFinite(v))continue;
    const y=String(r.season||'').match(/(?:19|20)\\d{2}/)?.[0]||String(r.season||'Unknown');
    const cur=byYear.get(y)||{sum:0,n:0};
    cur.sum+=v;cur.n++;
    byYear.set(y,cur);
  }
  const values=[...byYear].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}))
    .map(([year,x])=>({year,value:averaged(metric)?x.sum/x.n:x.sum,n:x.n}));
  $('timeChartNote').textContent=values.length
    ? 'Yearly '+(averaged(metric)?'average':'total')+' of '+label.toLowerCase()+' · '+values.length+' observed years'
    : 'No available numeric values for this metric. Change sport, season or metric.';
  if(!values.length){
    $('timeChart').innerHTML='<p class="chart-empty">No matching historical trend data.</p>';
  }else{
    const w=680,h=240,p={l:46,r:18,t:18,b:34},iw=w-p.l-p.r,ih=h-p.t-p.b;
    const min=0,max=Math.max(...values.map(o=>o.value),1);
    const points=values.map((o,i)=>{
      const x=p.l+(values.length===1?.5:i/(values.length-1))*iw;
      const y=p.t+ih*(1-(o.value-min)/(max-min));
      return {...o,x,y};
    });
    const grid=[0,.25,.5,.75,1].map(a=>{
      const y=p.t+ih*(1-a),v=min+(max-min)*a;
      return '<line x1="'+p.l+'" y1="'+y+'" x2="'+(w-p.r)+'" y2="'+y+'" stroke="rgba(174,205,246,.13)" stroke-dasharray="4 6"/>'+
        '<text x="'+(p.l-9)+'" y="'+(y+4)+'" text-anchor="end" fill="#93a7c4" font-size="11">'+number(v)+'</text>';
    }).join('');
    const path=points.map((o,i)=>(i===0?'M':'L')+o.x.toFixed(2)+' '+o.y.toFixed(2)).join(' ');
    const area=path+' L '+points.at(-1).x.toFixed(2)+' '+(h-p.b)+' L '+points[0].x.toFixed(2)+' '+(h-p.b)+' Z';
    const step=Math.max(1,Math.ceil(values.length/7));
    const marks=points.map((o,i)=>
      '<circle cx="'+o.x+'" cy="'+o.y+'" r="4.2" fill="var(--accent)" stroke="#0b192d" stroke-width="2" tabindex="0">'+
      '<title>'+escapeHtml(o.year+': '+number(o.value)+' '+label)+'</title></circle>'+
      (i%step===0||i===points.length-1?'<text x="'+o.x+'" y="'+(h-8)+'" fill="#93a7c4" text-anchor="middle" font-size="11">'+escapeHtml(o.year)+'</text>':'')
    ).join('');
    $('timeChart').innerHTML='<svg class="analytics-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+escapeHtml(label)+' trend by year">'+
      '<defs><linearGradient id="time-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".30"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'+
      grid+'<path d="'+area+'" fill="url(#time-fill)"/><path class="line-draw" d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+marks+'</svg>';
  }
  const top=leaders.slice(0,7);
  $('rankChartNote').textContent='Top '+top.length+' competitors by '+label.toLowerCase()+' · hover or focus bars for values';
  if(!top.length){$('rankChart').innerHTML='<p class="chart-empty">No ranked competitors for this selection.</p>';return}
  const w=680,h=270,left=164,right=70,bar=22,space=36,max=Math.max(...top.map(o=>o.metric),1);
  const rows=top.map((g,i)=>{
    const y=17+i*space,ww=(w-left-right)*Math.max(0,g.metric)/max;
    const name=g.name.length>21?g.name.slice(0,19)+'…':g.name;
    return '<text x="'+(left-10)+'" y="'+(y+15)+'" text-anchor="end" fill="#d8e7f9" font-size="12">'+escapeHtml(name)+'</text>'+
      '<rect x="'+left+'" y="'+y+'" width="'+(w-left-right)+'" height="'+bar+'" rx="6" fill="rgba(166,199,235,.07)"/>'+
      '<rect class="comparison-bar" x="'+left+'" y="'+y+'" width="'+ww+'" height="'+bar+'" rx="6" fill="var(--accent)" opacity="'+(1-i*.075)+'" tabindex="0"><title>'+escapeHtml(g.name)+': '+number(g.metric)+' '+escapeHtml(label)+'</title></rect>'+
      '<text x="'+(left+ww+8)+'" y="'+(y+15)+'" fill="#d8e7f9" font-size="12">'+number(g.metric)+'</text>';
  }).join('');
  $('rankChart').innerHTML='<svg class="analytics-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Competitor ranking by '+escapeHtml(label)+'">'+rows+'</svg>';
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

  // Cricket all-competition mixing is prevented: IPL players and national teams are incompatible units.
  ranking = aggregate(filtered, metric).filter(g => !query || g.name.toLowerCase().includes(query));

  renderAnalyticalCharts(filtered,ranking,metric);
  $('count').textContent = number(filtered.length);
  $('competitors').textContent = number(new Set(filtered.map(r => r.competitor_id)).size);
  $('seasons').textContent = number(new Set(filtered.map(r => r.season)).size);
  $('source').textContent = d.source;
  $('sourceSub').textContent = d.sourceSub;
  $('rankingMetric').textContent = d.metrics[metric];
  $('metricHead').textContent = d.metrics[metric];

  $('ratingFormula').textContent={
    Soccer:'30 + 30×win + 10×draw + 12×goal difference per match (0–100)',
    NBA:'2×points per game + 1.3×rebounds per game + 1.5×assists per game (0–100)',
    Cricket:competition.startsWith('International ')?'International match index: win 100, loss 0; unreported outcomes excluded. Win rate = wins ÷ decided matches.':'IPL index: 1.25×runs per match + 17×wickets per match (0–100)',
    F1:'100 − 7×(classified finishing position − 1) per race (0–100)'
  }[sport]+' · Experimental GameSense indicator, not official or predictive.';
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

  updateLeaderPhoto(ranking[0]);
  $('bars').classList.remove('motion-in');void $('bars').offsetWidth;$('bars').classList.add('motion-in');
  renderRecentForm(ranking[0]);
  renderCompare();
}

/** Most recent observed five events or three selected player-seasons; no fabricated event dates. */
function renderRecentForm(leader){
  if(!leader){$('formSummary').textContent='No records match these filters.';return;}
  const rr=filtered.filter(r=>r.competitor_id===leader.id).sort((a,b)=>String(b.date||b.season).localeCompare(String(a.date||a.season),undefined,{numeric:true}));
  const sample=rr.slice(0,sport==='Soccer'||sport==='F1'?5:3);
  if(sport==='Soccer'){
    $('formSummary').textContent=leader.name+': '+sample.map(r=>r.wins?'W':r.draws?'D':'L').reverse().join(' · ')+' · recent observed matches (oldest → newest).';
  } else if(sport==='F1'){
    let a=sample.map(r=>r.finish_position).filter(v=>v>0);
    $('formSummary').textContent=leader.name+': '+(a.length?'average classified finish P'+number(a.reduce((p,c)=>p+c,0)/a.length):'no classified results')+' across latest '+sample.length+' races.';
  } else if(sport==='Cricket'&&sample[0].record_kind==='international_team_match'){
    $('formSummary').textContent=leader.name+': '+rr.slice(0,5).map(r=>r.outcome||'D').reverse().join(' · ')+' · recent observed international matches, oldest to newest (U = outcome unreported).';
  } else {
    let games=sample.reduce((a,r)=>a+(r.games||numeric(r.games_played)||0),0),v=sample.reduce((a,r)=>a+(sport==='NBA'?(r.points||0):(r.runs||0)),0);
    $('formSummary').textContent=leader.name+': '+(games?number(v/games)+(sport==='NBA'?' points/game':' runs/match'):'no game denominator')+' across '+sample.length+' latest selected player-seasons.';
  }
}

/* Optional Wikipedia portraits: only exact name/title matches are shown.
   If confidence is insufficient or the network is unavailable, show initials instead. */
const photoCache=new Map(); let portraitSequence=0;
const teamNames={ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GSW:'Golden State Warriors',HOU:'Houston Rockets',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',NYK:'New York Knicks',PHI:'Philadelphia 76ers',PHX:'Phoenix Suns',TOR:'Toronto Raptors'};
function initials(n){return String(n||'GS').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'GS'}
function titleKey(s){return String(s||'').normalize('NFKD').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase()}
async function resolvePortrait(name) {
  if(!name||name.length<5)return null;
  if(photoCache.has(name))return photoCache.get(name);
  const promise=(async()=>{
    try{
      const query='intitle:"'+name.replace(/"/g,'')+'"';
      const url='https://en.wikipedia.org/w/api.php?action=query&origin=*&generator=search&gsrsearch='+encodeURIComponent(query)+'&gsrlimit=5&prop=pageimages&piprop=thumbnail&pithumbsize=420&format=json&formatversion=2';
      const res=await fetch(url,{mode:'cors'});if(!res.ok)return null;
      const data=await res.json();
      const candidate=(data.query?.pages||[]).find(p=>{
        const a=titleKey(p.title),b=titleKey(name);
        return b.length>=5&&(a===b||a.startsWith(b)&&a.length-b.length<=14)&&p.thumbnail?.source?.startsWith('https://');
      });
      return candidate?{image:candidate.thumbnail.source,article:'https://en.wikipedia.org/?curid='+candidate.pageid}:null;
    }catch(e){return null;}
  })();
  photoCache.set(name,promise);return promise;
}
function teamInfo(g){
  if(!g)return 'Select a competitor';
  if(sport==='Soccer')return 'Football club · '+g.name;
  if(sport==='Cricket'&&$('competition').value.startsWith('International '))return 'National team · '+g.name;
  const list=filtered.filter(r=>r.competitor_id===g.id&&r.team).sort((a,b)=>String(b.date||b.season).localeCompare(String(a.date||a.season),undefined,{numeric:true}));
  const t=list[0]?.team;
  if(t)return (sport==='F1'?'Constructor · ':'Team · ')+(teamNames[t]||t);
  return sport==='Cricket'?'IPL athlete · historical team not in source':'Team not recorded in the selected data';
}
let profileVersion=0, leaderVersion=0;
async function displayPhoto(name,imageId,initialsId,creditId,version,readVersion){
  const image=$(imageId),fallback=$(initialsId),credit=creditId?$(creditId):null;
  if(!image||!fallback)return;
  fallback.textContent=initials(name);
  fallback.hidden=false;image.hidden=true;image.removeAttribute('src');
  if(credit)credit.hidden=true;
  const info=await resolvePortrait(name);
  if(readVersion()!==version||!info)return;
  image.onload=()=>{if(readVersion()===version){image.hidden=false;fallback.hidden=true;}};
  image.onerror=()=>{image.hidden=true;fallback.hidden=false;};
  image.src=info.image;
  if(credit){credit.href=info.article;credit.hidden=false;}
}
function updateProfiles(a,b){
  const version=++profileVersion;
  for(const [suffix,g] of [['A',a],['B',b]]){
    $('avatarName'+suffix).textContent=g?.name||'Select a competitor';
    $('avatarTeam'+suffix).textContent=teamInfo(g);
    displayPhoto(g?.name,'avatarPhoto'+suffix,'avatarFallback'+suffix,'avatarCredit'+suffix,version,()=>profileVersion);
  }
}
function updateLeaderPhoto(g){const v=++leaderVersion;displayPhoto(g?.name,'leaderPortrait','leaderMonogram',null,v,()=>leaderVersion)}
function renderCompare() {
  const metric = $('metric').value;
  const a = ranking.find(g => g.id === $('compareA').value);
  const b = ranking.find(g => g.id === $('compareB').value);
  updateProfiles(a,b);

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
  const values = seasons.map(([, v]) => averaged(metric) ? v.sum / v.n : v.sum);
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
    // Imported data stays browser-local.
    updateControls();
  } catch (err) {
    $('importStatus').textContent = `Import failed: ${err.message}`;
  }
});

$('clearImports').onclick = () => {
  imports = [];
  localStorage.removeItem('gamesense-imports');
  $('importStatus').textContent = 'Local imported data cleared.';
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
  if(sport==='Cricket')selectCricketView('International ODI');
});

function selectCricketView(c){
  if(sport!=='Cricket')return;
  $('season').value='All seasons';$('competition').value=c;
  $('metric').value=c.startsWith('International ')?'wins':'runs';
  document.querySelectorAll('[data-cricket-view]').forEach(b=>b.classList.toggle('selected',b.dataset.cricketView===c));
  const cricketPanel=$('cricketFormats'); if(cricketPanel)cricketPanel.hidden=false;
  render();
}
document.querySelectorAll('[data-cricket-view]').forEach(b=>b.addEventListener('click',()=>selectCricketView(b.dataset.cricketView)));
$('competition').addEventListener('change',()=>{
  if(sport!=='Cricket')return;
  let international=$('competition').value.startsWith('International ');
  if(international&&['runs','wickets','strike_rate'].includes($('metric').value))$('metric').value='wins';
  if(!international&&['wins','losses','win_rate'].includes($('metric').value))$('metric').value='runs';
});
['season', 'competition', 'metric', 'search'].forEach(id => {
  $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
});
['compareA', 'compareB'].forEach(id => $(id).addEventListener('change', renderCompare));

function reportFailure(err){
  console.error('GameSense:',err);
  const panel=$('runtimeError');
  if(panel){panel.hidden=false;panel.textContent='Could not finish loading GameSense: '+String(err?.message||err)+'. Please reload the hosted page.';}
  if($('loadState'))$('loadState').textContent='An error occurred — see message below';
}
window.addEventListener('error',e=>reportFailure(e.error||e.message));
window.addEventListener('unhandledrejection',e=>reportFailure(e.reason));
load().catch(reportFailure);
