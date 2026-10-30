/* GameSense web analytics. Sources: OpenFootball, BoxScore Lab, F1DB, Cricsheet-derived IPL player seasons. AI-assisted refinement: see project documentation. */
const $ = (id) => document.getElementById(id);

let sport = 'Soccer';
let all = [];
let imports = [];
let filtered = [];
let ranking = [];
let footballMode='clubs',homeActive=true;
let clubBadgeMap={};
let portraitManifest={Cricket:{},F1:{}};
let visibleRankingCount=120;
const playerSeasons=Array.from({length:10},(_,i)=>`${2016+i}-${String(17+i)}`);

const defs = {
  Soccer: {
    title: 'The Football Ledger',
    sub: 'A record of club results, goal difference and league points. Every figure links back to an observed match.',
    coverage: 'Club fixtures / archived seasons',
    source: 'OpenFootball',
    sourceSub: 'OpenFootball club results + Fantasy Premier League individual seasons 2016/17–2025/26',
    accent: '#60efd1',
    accent2: '#34bafb',
    metrics: {
      points: 'Match points',
      goals: 'Goals scored',
      goals_against: 'Goals conceded',
      wins: 'Wins',
      draws: 'Draws', assists:'Assists', games:'Appearances', minutes:'Minutes played', shots:'Shots', tackles:'Tackles', passes:'Successful passes', interceptions:'Interceptions', clean_sheets:'Clean sheets',saves:'Saves',yellow_cards:'Yellow cards',red_cards:'Red cards',total_points:'Fantasy points',bonus:'Bonus points',starts:'Starts',expected_goals:'Expected goals (xG)',expected_assists:'Expected assists (xA)',
      performance_score: 'GameSense rating (0–100)'
    }
  },
  NBA: {
    title: 'The Basketball Ledger',
    sub: 'Player-season scorebooks, rebounding, assists and comparisons across recorded seasons.',
    coverage: 'NBA / player-season archive',
    source: 'BoxScore Lab',
    sourceSub: 'Bundled seasons from the GameSense archive',
    accent: '#ffbe66',
    accent2: '#f47257',
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
    title: 'The Cricket Ledger',
    sub: 'IPL records and international scorebooks. Choose team results or individual batting histories.',
    coverage: 'IPL / ODI / T20I / TEST',
    source: 'Cricsheet / IPL ETL',
    sourceSub: 'Curated leading performers; incomplete league coverage',
    accent: '#a8ed60', accent2: '#f0d46c',
    metrics: {
      runs: 'Batting runs', wickets: 'Bowling wickets', games: 'Matches played',
      strike_rate: 'Batting strike rate', batting_average:'Batting average', highest_score:'Highest score', hundreds:'Centuries', fifties:'Half-centuries', fours:'Fours', sixes:'Sixes', innings:'Innings', wins:'Match wins (international)', losses:'Match losses (international)', win_rate:'Win rate % (international)', performance_score: 'GameSense rating (0–100)'
    }
  },
  F1: {
    title: 'The Grand Prix Ledger',
    sub: 'The story in finish positions, grid starts, points and the drivers behind them.',
    coverage: 'Grand Prix / race-result archive',
    source: 'F1DB',
    sourceSub: 'Bundled driver-result history',
    accent: '#ff6e88',
    accent2: '#cf77ff',
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
  const sportIcons={Soccer:'football',NBA:'basketball',Cricket:'cricket',F1:'f1'};
  document.documentElement.style.setProperty('--accent', d.accent);
  document.documentElement.style.setProperty('--accent-2', d.accent2);
  document.documentElement.style.setProperty('--glow', hexToRgba(d.accent, 0.18));
  document.documentElement.style.setProperty('--sport-icon', 'url("assets/sport-icons/'+sportIcons[sport]+'.svg")');
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
  o.country = String(o.country || '').trim();
  // The provided Soccer 'points' field can encode match goals; derive actual league points from wins/draws.
  if (o.sport === 'Soccer' && o.wins !== undefined && o.draws !== undefined)
    o.points = 3 * Number(o.wins || 0) + Number(o.draws || 0);
  [
    'points','goals','goals_against','wins','draws','losses','rebounds','assists','games','minutes','shots','tackles','passes','interceptions','clean_sheets','saves','yellow_cards','red_cards','total_points','bonus','starts','expected_goals','expected_assists','recoveries',
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
    if(result.error){failures.push(result.file.name+': '+result.error);continue;}
    let rejected=0;
    for(const raw of result.records){
      // Original source labels and schema take precedence over containing file name.
      if(raw.sport&&String(raw.sport).toLowerCase()!==result.file.sport.toLowerCase()){rejected++;continue;}
      if(result.file.sport==='F1'){
        if(numeric(raw.finish_position)===null&&numeric(raw.grid_position)===null){rejected++;continue;}
        if(String(raw.competitor_id||'').startsWith('nba:')){rejected++;continue;}
      }
      if(result.file.sport==='NBA'&&(String(raw.competitor_id||'').startsWith('f1:')||numeric(raw.finish_position)!==null)){rejected++;continue;}
      all.push(norm(raw,result.file.sport));
    }
    if(rejected)failures.push(result.file.name+': '+rejected+' incompatible rows excluded (sport/schema check)');
  }

  // Fully independent historical player seasons: one archived record per athlete and year.
  const footballChunks=await Promise.all(playerSeasons.map(async season=>{
    try{const r=await fetchDataset('football-seasons/'+season+'.json','json');return {season,records:r}}
    catch(e){return {season,error:e.message}}
  }));
  for(const chunk of footballChunks){
    if(chunk.error){failures.push('Football '+chunk.season+': '+chunk.error);continue;}
    if(!Array.isArray(chunk.records)){failures.push('Football '+chunk.season+': invalid array');continue;}
    all.push(...chunk.records.filter(r=>r.sport==='Soccer'&&r.record_kind==='player_season'&&r.season===chunk.season)
      .map(r=>norm(r,'Soccer')));
  }
  try{clubBadgeMap=await fetchDataset('assets/club-badges-map.json','json');}
  catch(e){failures.push('Club crest index: '+e.message);}
  try{
    const response=await fetch('assets/portrait-manifest.json',{cache:'no-cache'});
    if(response.ok)portraitManifest=await response.json();
  }catch(e){console.info('GameSense: offline portrait index unavailable',e);}
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
      if(!id||!a||!b||a===b||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
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
  $('heroCoverage').title=loadedMatchRows.toLocaleString()+' international matches loaded.';
  // Career snapshots from attributed external source: format-specific, not per-season records.
  try {
    const records=await fetchDataset('cricket-international-players.json','json');
    if(!Array.isArray(records)||!records.length)throw Error('International player snapshots unavailable');
    all.push(...records.map(r=>norm(r,'Cricket')));
  }catch(e){failures.push('cricket-international-players.json: '+e.message);}

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
  openHome();
}

function rows() {
  return [...all, ...imports].filter(r => {
    if(String(r.sport).trim().toLowerCase()!==sport.toLowerCase())return false;
    if(sport==='F1')return numeric(r.finish_position)!==null||numeric(r.grid_position)!==null;
    if(sport==='NBA')return numeric(r.finish_position)===null&&!String(r.competitor_id||'').startsWith('f1:');
    return true;
  });
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
    if(r.record_kind==='player_season')return r.minutes>0?clamp(2*(r.goals||0)+1.5*(r.assists||0)+.05*(r.total_points||0)):null;
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
    if(r.record_kind==='international_player_career')return r.games>0?clamp(1.4*(r.runs||0)/r.games):null;
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
function averaged(m){return m.endsWith('_position')||['performance_score','strike_rate','economy','win_rate','batting_average'].includes(m);}
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
  $('footballFormats').hidden=(sport!=='Soccer');
  $('footballPlayerArchive').hidden=!(sport==='Soccer'&&footballMode==='players');
  $('footballClubShelf').hidden=!(sport==='Soccer'&&footballMode==='clubs');
  document.querySelectorAll('[data-football-view]').forEach(b=>b.classList.toggle('selected',b.dataset.footballView===footballMode));
  const cricketPanel=$('cricketFormats');
  if(cricketPanel) cricketPanel.hidden=(sport!=='Cricket');
  const rr = rows().filter(r=>sport!=='Soccer'||(footballMode==='players'?r.record_kind==='player_season':r.record_kind!=='player_season'));
  const seasons = [...new Set(rr.map(x => x.season))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const competitions = [...new Set(rr.map(x => x.competition))].sort();
  const oldSeason = $('season').value;
  const oldCompetition = $('competition').value;
  $('season').innerHTML = options(['All seasons', ...seasons], oldSeason);
  $('competition').innerHTML = options(['All competitions', ...competitions], oldCompetition);
  $('metric').innerHTML = Object.entries(d.metrics).map(([k, v]) => `<option value="${k}">${escapeHtml(v)}</option>`).join('');
  syncCricketMetricOptions();
  syncFootballMetricOptions();
  render();
}


/** Chart renderer: SVG is self-contained, responsive, tooltip accessible and has no external CDNs.
 * Line chart aggregates the current metric per observed year. Bar chart uses current ranking.
 * Missing values are ignored. Position metrics sort ascending; win rate uses only decided games. */

/* Formats have distinct schemas. The metric menu must never offer player runs
   against team wins or season-independent career averages in the same view. */
function syncFootballMetricOptions(){
  if(sport!=='Soccer')return;
  const allowed=footballMode==='players'?
    ['goals','assists','minutes','total_points','clean_sheets','saves','yellow_cards','red_cards','bonus','starts','expected_goals','expected_assists','tackles','recoveries','performance_score']:
    ['points','goals','goals_against','wins','draws','performance_score'];
  const previous=$('metric').value;
  $('metric').innerHTML=allowed.map(k=>'<option value="'+k+'">'+escapeHtml(defs.Soccer.metrics[k])+'</option>').join('');
  $('metric').value=allowed.includes(previous)?previous:(footballMode==='players'?'goals':'points');
}
function syncCricketMetricOptions(){
  if(sport!=='Cricket')return;
  const comp=$('competition').value;
  const player=comp.endsWith(' Players');
  const intl=comp.startsWith('International ')&&!player;
  const allowed=intl?['wins','losses','win_rate','games','performance_score']:
    player?['runs','games','innings','strike_rate','batting_average','highest_score','hundreds','fifties','fours','sixes','performance_score']:
    ['runs','wickets','games','strike_rate','performance_score'];
  const current=$('metric').value;
  $('metric').innerHTML=allowed.filter(k=>defs.Cricket.metrics[k])
    .map(k=>'<option value="'+k+'">'+escapeHtml(defs.Cricket.metrics[k])+'</option>').join('');
  $('metric').value=allowed.includes(current)?current:(intl?'wins':'runs');
}

function renderAnalyticalCharts(records,leaders,metric){
  const label=defs[sport].metrics[metric]||metric;
  $('timeChartMetric').textContent=label;
  const byYear=new Map();
  for(const r of records){
    const v=metricValue(r,metric);
    if(v===null||!Number.isFinite(v))continue;
    const y=String(r.season||'').match(/(?:19|20)\d{2}/)?.[0]||String(r.season||'Unknown');
    const cur=byYear.get(y)||{sum:0,n:0};
    cur.sum+=v;cur.n++;
    byYear.set(y,cur);
  }
  const values=[...byYear].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}))
    .map(([year,x])=>({year,value:averaged(metric)?x.sum/x.n:x.sum,n:x.n}));
  const isFootballSnapshot=sport==='Soccer'&&footballMode==='players';
  const isCareerSnapshot=sport==='Cricket'&&records.length&&records.every(r=>r.record_kind==='international_player_career');
  $('timeChartTitle').textContent=isFootballSnapshot?'Footballer season-by-season history':isCareerSnapshot?'The same player, three formats':'When did performance change?';
  $('timeChartNote').textContent=isFootballSnapshot?'Year-by-year record for the chosen footballer; not an invented match-by-match history.':isCareerSnapshot?'Historical career snapshot across formats; no season-by-season player totals are available.':values.length
    ? 'Yearly '+(averaged(metric)?'average':'total')+' of '+label.toLowerCase()+' · '+values.length+' observed years'
    : 'No available numeric values for this metric. Change sport, season or metric.';
  if(isFootballSnapshot){
    const focus=leaders.find(g=>g.id===selectedSubjectId)||leaders[0];
    const yearly=focus?all.filter(r=>r.sport==='Soccer'&&r.record_kind==='player_season'&&r.competitor_id===focus.id)
      .sort((a,b)=>a.season.localeCompare(b.season)).map(r=>({year:r.season,value:metricValue(r,metric)}))
      .filter(r=>r.value!==null&&Number.isFinite(r.value)):[];
    $('timeChartNote').textContent=focus?focus.name+' · '+label+' across '+yearly.length+' observed historical seasons':'Select a footballer to view a season trend.';
    if(!yearly.length){$('timeChart').innerHTML='<p class="chart-empty">No historical figures for this player and metric.</p>';}
    else{
      const w=680,h=245,l=54,right=18,top=24,bottom=42,uw=w-l-right,uh=h-top-bottom;
      const max=Math.max(...yearly.map(x=>x.value),1);
      const points=yearly.map((x,i)=>({year:x.year,value:x.value,
        x:l+(yearly.length===1?.5:i/(yearly.length-1))*uw,
        y:top+uh*(1-x.value/max)}));
      const path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
      const dots=points.map(p=>'<circle tabindex="0" cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--accent)"><title>'+
        escapeHtml(p.year+': '+number(p.value)+' '+label)+'</title></circle>'+
        '<text x="'+p.x+'" y="'+(h-11)+'" text-anchor="middle" fill="#90a8b8" font-size="10">'+escapeHtml(p.year.slice(2).replace('-','/'))+'</text>').join('');
      const ylabels=[0,.5,1].map(a=>'<text x="'+(l-8)+'" y="'+(top+uh*(1-a)+4)+'" text-anchor="end" class="fn-axis">'+number(max*a)+'</text>').join('');
      $('timeChart').innerHTML=fnSvg('<line x1="'+l+'" y1="'+(top+uh)+'" x2="'+(w-right)+'" y2="'+(top+uh)+'" stroke="#56727b"/>'+ylabels+
        '<path class="line-draw" d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>'+dots,w,h,focus.name+' '+label+' by season');
    }
  }else if(isCareerSnapshot){
    const focus=leaders[0];
    const career=focus?all.filter(r=>r.sport==='Cricket'&&r.record_kind==='international_player_career'&&r.competitor_id===focus.id):[];
    const chosen=career.map(r=>({name:r.competition.replace('International ','').replace(' Players',''),v:metricValue(r,metric)}))
      .filter(v=>v.v!==null&&Number.isFinite(v.v));
    if(!chosen.length){$('timeChart').innerHTML='<p class="chart-empty">No other format observations for the selected player.</p>';}
    else{
      const max=Math.max(1,...chosen.map(x=>x.v)),w=640,h=245,left=78,barMax=460;
      const lines=chosen.map((d,i)=>{
        const y=30+i*66,vw=Math.max(0,d.v/max)*barMax;
        return '<text x="'+(left-12)+'" y="'+(y+17)+'" class="fn-axis" text-anchor="end">'+escapeHtml(d.name)+'</text>'+
          '<rect x="'+left+'" y="'+y+'" width="'+barMax+'" height="24" fill="var(--chart-track)"/>'+
          '<rect class="fn-duel-a" x="'+left+'" y="'+y+'" width="'+vw+'" height="24"><title>'+escapeHtml(d.name+': '+number(d.v))+'</title></rect>'+
          '<text x="'+(left+vw+10)+'" y="'+(y+17)+'" class="fn-axis">'+number(d.v)+'</text>';
      }).join('');
      $('timeChart').innerHTML=fnSvg(lines,w,h,focus.name+' '+(defs.Cricket.metrics[metric]||metric)+' by format');
    }
  }else if(!values.length){
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


/* Field Notes chart set:
 * Histogram answers "how unequal is the distribution?".
 * Volume scatter answers "how much evidence is behind a metric?".
 * Duel compares several comparable fields for the two chosen subjects.
 * These are SVG charts; all plotted values come from the selected archive.
 */
function fnSvg(content,w=640,h=250,label='Chart'){
  return '<svg class="field-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+escapeHtml(label)+'">'+content+'</svg>';
}
function fnEmpty(id,message){$(id).innerHTML='<p class="field-empty">'+escapeHtml(message)+'</p>';}
function renderDistributionChart(groups,metric){
  const finite=groups.map(g=>g.metric).filter(Number.isFinite).sort((a,b)=>a-b);
  const n=finite.length;
  if(n<2){$('distributionNote').textContent='Requires two or more measured competitors.';fnEmpty('distributionChart','Select another metric or season for a wider sample.');return;}
  const label=defs[sport].metrics[metric]||metric;
  const min=finite[0],max=finite[n-1],bins=Math.min(10,Math.max(4,Math.ceil(Math.sqrt(n))));
  const counts=Array(bins).fill(0);
  for(const v of finite){const bin=max===min?0:Math.min(bins-1,Math.floor((v-min)/(max-min)*bins));counts[bin]++;}
  const median=finite[Math.floor((n-1)/2)];
  $('distributionNote').textContent=n.toLocaleString()+' competitors · median '+number(median)+' '+label.toLowerCase()+' · '+bins+' equal-width intervals';
  const w=640,h=245,l=54,r=18,t=22,b=42,uw=w-l-r,uh=h-t-b;
  const high=Math.max(...counts,1);
  const chart=counts.map((c,i)=>{
    const x=l+i*uw/bins+2,width=Math.max(1,uw/bins-4),height=uh*c/high,y=t+uh-height;
    const lo=min+(max-min)*i/bins,hi=min+(max-min)*(i+1)/bins;
    return '<rect class="fn-column" tabindex="0" x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" fill="var(--accent)">'+
      '<title>'+escapeHtml(number(lo)+'–'+number(hi)+': '+c+' competitors')+'</title></rect>';
  }).join('');
  const grid=[0,.5,1].map(fr=>'<text x="'+(l-9)+'" y="'+(t+uh*(1-fr)+4)+'" text-anchor="end" class="fn-axis">'+number(Math.round(high*fr))+'</text>').join('');
  const ends='<text x="'+l+'" y="'+(h-13)+'" class="fn-axis">'+number(min)+'</text>'+
    '<text x="'+(w-r)+'" y="'+(h-13)+'" text-anchor="end" class="fn-axis">'+number(max)+'</text>';
  $('distributionChart').innerHTML=fnSvg('<line x1="'+l+'" y1="'+(t+uh)+'" x2="'+(w-r)+'" y2="'+(t+uh)+'" class="fn-axis-line"/>'+grid+chart+ends,w,h,'Distribution of '+label);
}
function renderScatterChart(groups,metric){
  const allRows=rows();
  const selectedSeason=$('season').value,selectedCompetition=$('competition').value;
  const rowsHere=allRows.filter(r=>(selectedSeason==='All seasons'||!selectedSeason||r.season===selectedSeason)&&
    (selectedCompetition==='All competitions'||!selectedCompetition||r.competition===selectedCompetition));
  const gameCounts=new Map();
  for(const r of rowsHere){const id=r.competitor_id||r.competitor;const o=gameCounts.get(id)||{games:0,rows:0};o.rows++;o.games+=numeric(r.games)||0;gameCounts.set(id,o);}
  const values=groups.map(g=>({name:g.name,x:gameCounts.get(g.id)?.games||gameCounts.get(g.id)?.rows||g.rows,y:g.metric}))
    .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>0).slice(0,110);
  const label=defs[sport].metrics[metric]||metric;
  if(values.length<2){$('scatterNote').textContent='Not enough measured subjects to plot this relationship.';fnEmpty('scatterChart','Try all seasons or a different statistic.');return;}
  const isGames=values.some(v=>v.x!==1)&&rowsHere.some(r=>numeric(r.games)>0);
  $('scatterNote').textContent='Horizontal: '+(isGames?'recorded matches':'observations')+' · vertical: '+label.toLowerCase()+' · '+values.length+' subjects';
  const w=640,h=245,l=56,r=20,t=20,b=40,uw=w-l-r,uh=h-t-b;
  const xmin=0,xmax=Math.max(...values.map(p=>p.x),1),ymin=Math.min(0,...values.map(p=>p.y)),ymax=Math.max(...values.map(p=>p.y),1);
  const scaleX=x=>l+uw*x/xmax,scaleY=y=>t+uh*(1-(y-ymin)/Math.max(1,ymax-ymin));
  const grid=[0,.25,.5,.75,1].map(fr=>{
    const yy=t+uh*(1-fr);
    return '<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" class="fn-grid-line"/>'+
       '<text x="'+(l-8)+'" y="'+(yy+4)+'" text-anchor="end" class="fn-axis">'+number(ymin+(ymax-ymin)*fr)+'</text>';
  }).join('');
  const dots=values.map((p,i)=>'<circle tabindex="0" class="fn-dot" cx="'+scaleX(p.x).toFixed(2)+'" cy="'+scaleY(p.y).toFixed(2)+'" r="'+(i<8?5:3.3)+'" fill="'+(i<8?'var(--accent)':'var(--secondary-data)')+'">'+
      '<title>'+escapeHtml(p.name+': '+number(p.x)+' '+(isGames?'matches':'records')+', '+number(p.y)+' '+label)+'</title></circle>').join('');
  const labels=[0,.5,1].map(fr=>'<text x="'+scaleX(fr*xmax)+'" y="'+(h-12)+'" text-anchor="middle" class="fn-axis">'+number(xmax*fr)+'</text>').join('');
  $('scatterChart').innerHTML=fnSvg(grid+dots+labels,w,h,label+' versus '+(isGames?'matches':'observations'));
}
function renderDuelChart(a,b){
  if(!a||!b||a.id===b.id){$('duelNote').textContent='Choose two different competitors from the comparison selectors.';fnEmpty('duelChart','Two competitors required.');return;}
  const competition=$('competition').value;
  const shortlist=sport==='Soccer'?['points','goals','wins','goals_against']:
    sport==='NBA'?['points','rebounds','assists','games']:
    sport==='F1'?['points','wins','podiums','finish_position']:
    competition.endsWith(' Players')?['runs','games','strike_rate','batting_average']:
    competition.startsWith('International ')?['wins','losses','win_rate','games']:
    ['runs','wickets','games','strike_rate'];
  const inView=filtered.filter(r=>r.competitor_id===a.id||r.competitor_id===b.id);
  const stats=[a,b].map(g=>{
    const rr=inView.filter(r=>r.competitor_id===g.id);
    return Object.fromEntries(shortlist.map(m=>{
      const v=rr.map(r=>metricValue(r,m)).filter(x=>x!==null&&Number.isFinite(x));
      return [m,v.length?(averaged(m)?v.reduce((p,c)=>p+c,0)/v.length:v.reduce((p,c)=>p+c,0)):null];
    }));
  });
  $('duelNote').textContent=a.name+' versus '+b.name+' · scaled individually per metric, not between metrics';
  const w=700,h=270,l=158,right=88,barW=w-l-right;
  const bars=shortlist.map((m,i)=>{
    const y=18+i*63,vA=stats[0][m],vB=stats[1][m];
    const high=Math.max(vA??0,vB??0,1),aWidth=vA==null?0:Math.max(0,vA)/high*barW,bWidth=vB==null?0:Math.max(0,vB)/high*barW;
    const title=defs[sport].metrics[m]||m;
    const label='<text x="'+(l-10)+'" y="'+(y+23)+'" text-anchor="end" class="fn-label">'+escapeHtml(title)+'</text>';
    const row=(v,width,offset,klass)=>{
      return '<rect x="'+l+'" y="'+(y+offset)+'" width="'+barW+'" height="12" fill="var(--chart-track)"/>'+
        '<rect class="'+klass+'" x="'+l+'" y="'+(y+offset)+'" width="'+width+'" height="12"/>'+
        '<text x="'+(l+width+7)+'" y="'+(y+offset+10)+'" class="fn-axis">'+(v===null?'n/a':number(v))+'</text>';
    };
    return label+row(vA,aWidth,0,'fn-duel-a')+row(vB,bWidth,17,'fn-duel-b');
  }).join('');
  $('duelChart').innerHTML='<div class="duel-legend"><span class="duel-one">'+escapeHtml(a.name)+'</span><span class="duel-two">'+escapeHtml(b.name)+'</span></div>'+
    fnSvg(bars,w,h,'Four-metric comparison of '+a.name+' and '+b.name);
}

function render() {
  const season = $('season').value;
  const competition = $('competition').value;
  const query = $('search').value.trim().toLowerCase();
  const metric = $('metric').value || Object.keys(defs[sport].metrics)[0];
  const d = defs[sport];

  filtered = rows().filter(r =>
    (sport!=='Soccer'||(footballMode==='players'?r.record_kind==='player_season':r.record_kind!=='player_season')) &&
    (!season || season === 'All seasons' || r.season === season) &&
    (!competition || competition === 'All competitions' || r.competition === competition)
  );

  // Cricket all-competition mixing is prevented: IPL players and national teams are incompatible units.
  ranking = aggregate(filtered, metric).filter(g => !query || g.name.toLowerCase().includes(query));

  renderClubShelf();
  renderAnalyticalCharts(filtered,ranking,metric);
  renderDistributionChart(ranking,metric);
  renderScatterChart(ranking,metric);
  $('count').textContent = number(filtered.length);
  $('competitors').textContent = number(new Set(filtered.map(r => r.competitor_id)).size);
  $('seasons').textContent = number(new Set(filtered.map(r => r.season)).size);
  $('source').textContent = sport==='Soccer'&&footballMode==='players'?'Fantasy Premier League / Historical':d.source;
  $('sourceSub').textContent = sport==='Soccer'&&footballMode==='players'?'Individual player-season totals from FPL archives 2016/17–2025/26':d.sourceSub;
  $('rankingMetric').textContent = d.metrics[metric];
  $('metricHead').textContent = d.metrics[metric];

  $('ratingFormula').textContent={
    Soccer:footballMode==='players'?'Player index: 2×goals + 1.5×assists + 0.05×Fantasy points (0–100). It is educational, not official.':'Club index: 30 + 30×win + 10×draw + 12×goal difference per match (0–100)',
    NBA:'2×points per game + 1.3×rebounds per game + 1.5×assists per game (0–100)',
    Cricket:competition.endsWith(' Players')?'Historical international career snapshot: runs, batting average and strike rate per format; GameSense rating = 1.4 × runs/matches capped at 100. Not official or time-series data.':competition.startsWith('International ')?'International team match index: win 100, loss 0; unknown results excluded. Win rate excludes unknown matches.':'IPL index: 1.25×runs per match + 17×wickets per match (0–100)',
    F1:'100 − 7×(classified finishing position − 1) per race (0–100)'
  }[sport]+' · Experimental GameSense indicator, not official or predictive.';
  const top = ranking.slice(0, 10);
  const max = Math.max(...top.map(x => x.metric), 0.001);
  $('bars').innerHTML = top.length ? top.map(g => `
    <div class="barrow subject-pick" role="button" tabindex="0" data-select-subject="${escapeHtml(g.id)}" title="View ${escapeHtml(g.name)} profile">
      <span class="barname" title="${escapeHtml(g.name)}">${rankAvatar(g)}<span class="bar-label">${escapeHtml(g.name)}</span></span>
      <div class="track"><div class="fill" style="width:${Math.min(100, Math.max(1, g.metric / max * 100))}%"></div></div>
      <span class="value">${number(g.metric)}</span>
    </div>`).join('') : '<p class="empty">No rows found for this selection. Change the filters or load more data.</p>';

  $('rankRows').innerHTML = ranking.slice(0, visibleRankingCount).map((g, i) => `
    <tr class="subject-pick" data-select-subject="${escapeHtml(g.id)}" tabindex="0" title="View ${escapeHtml(g.name)} profile"><td>${i + 1}</td>
      <td><span class="rank-identity">${rankAvatar(g)}<span>${escapeHtml(g.name)}</span></span></td>
      <td>${number(g.rows)}</td><td>${number(g.metric)}</td></tr>`).join('');
  const remaining=Math.max(0,ranking.length-visibleRankingCount);
  $('showMoreRanks').hidden=!remaining;
  $('showMoreRanks').textContent=remaining?'SHOW NEXT '+Math.min(120,remaining)+' PEOPLE · '+remaining.toLocaleString()+' REMAINING':'';

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
  hydrateRankingPhotos();
  renderSelectedSubject();
  $('bars').classList.remove('motion-in');void $('bars').offsetWidth;$('bars').classList.add('motion-in');
  renderRecentForm(ranking[0]);
  renderCompare();
}

/** Most recent observed five events or three selected player-seasons; no fabricated event dates. */
function renderRecentForm(leader){
  if(!leader){$('formSummary').textContent='No records match these filters.';return;}
  const rr=filtered.filter(r=>r.competitor_id===leader.id).sort((a,b)=>String(b.date||b.season).localeCompare(String(a.date||a.season),undefined,{numeric:true}));
  const sample=rr.slice(0,sport==='Soccer'||sport==='F1'?5:3);
  if(sport==='Soccer'&&footballMode==='players'){
    const p=sample[0];$('formSummary').textContent=leader.name+' · '+(p.team||'Unknown club')+' · '+p.season+': '+number(p.goals||0)+' goals, '+number(p.assists||0)+' Fantasy assists, '+number(p.minutes||0)+' minutes. Historical season snapshot, not match-by-match form.';
  } else if(sport==='Soccer'){
    $('formSummary').textContent=leader.name+': '+sample.map(r=>r.wins?'W':r.draws?'D':'L').reverse().join(' · ')+' · recent observed matches (oldest → newest).';
  } else if(sport==='F1'){
    let a=sample.map(r=>r.finish_position).filter(v=>v>0);
    $('formSummary').textContent=leader.name+': '+(a.length?'average classified finish P'+number(a.reduce((p,c)=>p+c,0)/a.length):'no classified results')+' across latest '+sample.length+' races.';
  } else if(sport==='Cricket'&&sample[0].record_kind==='international_player_career'){
    const record=sample[0];
    $('formSummary').textContent=leader.name+' · '+record.team+' · '+number(record.runs)+' career runs across '+number(record.games)+' matches. This is a historical format-specific career snapshot, not recent form.';
  } else if(sport==='Cricket'&&sample[0].record_kind==='international_team_match'){
    $('formSummary').textContent=leader.name+': '+rr.slice(0,5).map(r=>r.outcome||'D').reverse().join(' · ')+' · recent observed international matches, oldest to newest (U = outcome unreported).';
  } else {
    let games=sample.reduce((a,r)=>a+(r.games||numeric(r.games_played)||0),0),v=sample.reduce((a,r)=>a+(sport==='NBA'?(r.points||0):(r.runs||0)),0);
    $('formSummary').textContent=leader.name+': '+(games?number(v/games)+(sport==='NBA'?' points/game':' runs/match'):'no game denominator')+' across '+sample.length+' latest selected player-seasons.';
  }
}

/* Optional Wikipedia portraits: only exact name/title matches are shown.
   If confidence is insufficient or the network is unavailable, show initials instead. */
/* Wikimedia image lookup for documented identities; no guessed portrait URLs.
 * Country teams use flags; sourced photos link to their Commons file description.
 * Wikipedia API is not guaranteed to respond, so initials are always available. */
const photoCache=new Map();
const teamNames={ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GSW:'Golden State Warriors',HOU:'Houston Rockets',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',NYK:'New York Knicks',PHI:'Philadelphia 76ers',PHX:'Phoenix Suns',TOR:'Toronto Raptors'};
// IPL season archives abbreviate player names. Identity-checked full names make
// photo lookup more reliable; abbreviated labels still remain in the tables.
const portraitAliases={
  'V Kohli':'Virat Kohli','RG Sharma':'Rohit Sharma','MS Dhoni':'MS Dhoni',
  'SR Tendulkar':'Sachin Tendulkar','CH Gayle':'Chris Gayle','DA Warner':'David Warner',
  'SK Raina':'Suresh Raina','G Gambhir':'Gautam Gambhir','SE Marsh':'Shaun Marsh',
  'KL Rahul':'KL Rahul','JC Buttler':'Jos Buttler','RR Pant':'Rishabh Pant',
  'JC Archer':'Jofra Archer','YS Chahal':'Yuzvendra Chahal','AB de Villiers':'AB de Villiers',
  'KA Pollard':'Kieron Pollard','SPD Smith':'Steve Smith','V Sehwag':'Virender Sehwag',
  'F du Plessis':'Faf du Plessis','HH Pandya':'Hardik Pandya','RA Jadeja':'Ravindra Jadeja',
  'S Dhawan':'Shikhar Dhawan','SR Watson':'Shane Watson','YK Pathan':'Yusuf Pathan',
  'SK Warne':'Shane Warne','JP Duminy':'JP Duminy','RP Singh':'RP Singh',
  'A Kumble':'Anil Kumble','A Nehra':'Ashish Nehra','PP Ojha':'Pragyan Ojha',
  'A Mishra':'Amit Mishra','PC Valthaty':'Paul Valthaty','SL Malinga':'Lasith Malinga',
  'S Aravind':'Sreenath Aravind','AM Rahane':'Ajinkya Rahane','CL White':'Cameron White',
  'M Morkel':'Morne Morkel','SP Narine':'Sunil Narine','R Vinay Kumar':'Vinay Kumar',
  'KD Karthik':'Dinesh Karthik','JP Faulkner':'James Faulkner','RV Uthappa':'Robin Uthappa',
  'DR Smith':'Dwayne Smith','GJ Maxwell':'Glenn Maxwell','DA Miller':'David Miller',
  'MM Sharma':'Mohit Sharma','LMP Simmons':'Lendl Simmons','DS Kulkarni':'Dhawal Kulkarni',
  'HM Amla':'Hashim Amla','MK Pandey':'Manish Pandey','JD Unadkat':'Jaydev Unadkat',
  'JJ Bumrah':'Jasprit Bumrah','MJ McClenaghan':'Mitchell McClenaghan',
  'KS Williamson':'Kane Williamson','AT Rayudu':'Ambati Rayudu','S Kaul':'Siddarth Kaul',
  'UT Yadav':'Umesh Yadav','Q de Kock':'Quinton de Kock','AD Russell':'Andre Russell',
  'K Rabada':'Kagiso Rabada','DL Chahar':'Deepak Chahar','S Gopal':'Shreyas Gopal',
  'SS Iyer':'Shreyas Iyer','SA Yadav':'Suryakumar Yadav','TA Boult':'Trent Boult',
  'A Nortje':'Anrich Nortje','RD Gaikwad':'Ruturaj Gaikwad','SV Samson':'Sanju Samson',
  'HV Patel':'Harshal Patel','SN Thakur':'Shardul Thakur','DP Conway':'Devon Conway',
  'YBK Jaiswal':'Yashasvi Jaiswal','PP Chawla':'Piyush Chawla','R Parag':'Riyan Parag',
  'TM Head':'Travis Head','B Sai Sudharsan':'Sai Sudharsan','CV Varun':'Varun Chakravarthy',
  'MR Marsh':'Mitchell Marsh','P Simran Singh':'Prabhsimran Singh',
  'M Prasidh Krishna':'Prasidh Krishna','JR Hazlewood':'Josh Hazlewood',
  'V Suryavanshi':'Vaibhav Suryavanshi','H Klaasen':'Heinrich Klaasen',
  'A Kamboj':'Anshul Kamboj'
};
const countryFlags={'India':'🇮🇳','Australia':'🇦🇺','England':'🏴','Pakistan':'🇵🇰','New Zealand':'🇳🇿','South Africa':'🇿🇦','Bangladesh':'🇧🇩','Sri Lanka':'🇱🇰','Afghanistan':'🇦🇫','West Indies':'🏝️','Zimbabwe':'🇿🇼','Ireland':'🇮🇪','Scotland':'🏴','Netherlands':'🇳🇱','Nepal':'🇳🇵','Canada':'🇨🇦','United States of America':'🇺🇸','United States':'🇺🇸','Oman':'🇴🇲','United Arab Emirates':'🇦🇪','Papua New Guinea':'🇵🇬'};
function initials(n){return String(n||'GS').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'GS'}
function titleKey(s){return String(s||'').normalize('NFKD').replace(/\s*\([^)]*\)\s*/g,' ').replace(/[^a-z0-9]/gi,'').toLowerCase()}
function photoSubject(g) {
  if(!g)return null;
  const subset=filtered.filter(r=>r.competitor_id===g.id);
  const r=subset[0];
  const national=sport==='Cricket'&&r?.record_kind==='international_team_match';
  return {name:portraitAliases[g.name]||g.name,kind:national?'country':sport==='Soccer'&&footballMode==='clubs'?'club':'athlete',country:national?g.name:(r?.team||'')};
}
function countryFallback(g){
  const p=photoSubject(g);
  if(!p)return null;
  if(p.kind==='country')return countryFlags[p.name]||'🌐';
  if(sport==='Cricket'){
    const r=filtered.find(x=>x.competitor_id===g.id&&x.record_kind==='international_player_career');
    if(r?.team&&countryFlags[r.team])return countryFlags[r.team];
  }
  if(sport==='F1'&&g.name==='Lewis Hamilton')return '🇬🇧';
  return null;
}
function rankAvatar(g){
  const sportIcon={Soccer:'football',NBA:'basketball',Cricket:'cricket',F1:'f1'}[sport];
  return '<span class="rank-thumb" data-rank-id="'+escapeHtml(g.id)+'">'+
    '<span>'+escapeHtml(countryFallback(g)||initials(g.name))+'</span>'+
    // Rows are lazy-created by IntersectionObserver, so the hidden image must
    // load eagerly once its src is assigned or onload never fires.
    '<img class="rank-photo" alt="" hidden loading="eager" decoding="async" referrerpolicy="no-referrer">'+
    '<img class="rank-sport-icon" src="assets/sport-icons/'+sportIcon+'.svg" alt="" aria-hidden="true">'+
    '</span>';
}
function teamInfo(g){
  if(!g)return 'Select a competitor';
  if(sport==='Soccer'){
    if(footballMode==='players'){const r=filtered.filter(x=>x.competitor_id===g.id).sort((a,b)=>b.season.localeCompare(a.season))[0];return r?'Club · '+(r.team||'Not recorded')+' · '+r.season:'Club not recorded';}
    return 'Club · '+g.name;
  }
  const international=sport==='Cricket'&&$('competition').value.startsWith('International ');
  if(international&&!$('competition').value.endsWith(' Players'))return 'National side · '+g.name;
  const list=filtered.filter(r=>r.competitor_id===g.id&&r.team)
    .sort((a,b)=>String(b.date||b.season).localeCompare(String(a.date||a.season),undefined,{numeric:true}));
  const raw=list[0]?.team||'';
  if(raw)return (sport==='F1'?'Constructor · ':international?'Country · ':'Team · ')+(teamNames[raw]||raw);
  return sport==='Cricket'?'IPL record · club not supplied by this data source':'Team not recorded in this archive';
}
const wikiArticle=name=>'https://en.wikipedia.org/wiki/'+encodeURIComponent(name.replace(/ /g,'_'));
async function resolvePortrait(g){
  const p=photoSubject(g);
  if(!p||p.kind==='country')return null;
  const skipCdn=String(g.id||'').startsWith('wikipedia:');
  const key=(skipCdn?'wiki:':'')+p.kind+':'+p.name;
  if(photoCache.has(key))return photoCache.get(key);
  const promise=(async()=>{
    // Proven, person-specific Commons image files with visible attribution links.
    // Avoid guessed photographs and avoid dependence on cross-origin JSON requests.
    const knownFiles={
      'Virat Kohli':'Virat Kohli portrait.jpg',
      'Lewis Hamilton':'Lewis Hamilton portrait.jpg',
      'Mohamed Salah':'Mohamed Salah Argentina v Egypt 7 July 2026-277.jpg'
    };
    const known=knownFiles[p.name];
    if(p.kind==='club'){
      const badge=clubBadgeUrl(g.name);
      if(badge)return {src:badge,credit:'https://github.com/imadeddine-belkat/Premier-League-Stats',page:'https://github.com/imadeddine-belkat/Premier-League-Stats'};
    }
    if(!skipCdn&&sport==='Soccer'&&footballMode==='players'){
      const row=filtered.find(r=>r.competitor_id===g.id);
      if(row?.photo_code&&/^\d+$/.test(String(row.photo_code)))return {
        src:'https://resources.premierleague.com/premierleague/photos/players/250x250/p'+row.photo_code+'.png',
        credit:'https://www.premierleague.com/',fallbackToWiki:true};
    }
    const indexed=portraitManifest[sport]?.[p.name];
    if(!skipCdn&&indexed?.src&&p.kind==='athlete')return {...indexed,fallbackToWiki:true};
    if(!skipCdn&&known){
      const encoded=encodeURIComponent(known.replace(/ /g,'_'));
      return {src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encoded+'?width=500',
        credit:'https://commons.wikimedia.org/wiki/File:'+encoded,
        page:'https://commons.wikimedia.org/wiki/File:'+encoded};
    }
    // NBA archive IDs are NBA official player IDs. Use the league image CDN first:
    // it avoids Wikimedia CORS/rate limits for known basketball headshots.
    if(!skipCdn&&sport==='NBA'&&/^nba:\d+$/.test(String(g.id||''))){
      const id=String(g.id).slice(4);
      return {src:'https://cdn.nba.com/headshots/nba/latest/260x190/'+id+'.png',
        credit:'https://www.nba.com/players',page:'https://www.nba.com/players',fallbackToWiki:true};
    }
    const title=p.name;
    const url='https://en.wikipedia.org/w/api.php?action=query&origin=*&redirects=1&titles='+
      encodeURIComponent(title)+'&prop=pageimages%7Cdescription&piprop=thumbnail%7Cname&pithumbsize=460&format=json&formatversion=2';
    try{
      const response=await fetch(url,{mode:'cors'});
      if(!response.ok)throw Error('image lookup HTTP '+response.status);
      const data=await response.json();
      const page=(data.query?.pages||[]).find(x=>!x.missing&&x.thumbnail?.source?.startsWith('https://'));
      if(!page||titleKey(page.title)!==titleKey(title))return null;
      const description=String(page.description||'').toLowerCase();
      if(p.kind==='athlete'&&description&&(/politician|actor|actress|singer|musician|film director|writer|political party/.test(description)))return null;
      if(p.kind==='club'&&description&&/person|footballer|basketball player|politician|actor/.test(description))return null;
      const src=page.thumbnail.source;
      const pageURL='https://en.wikipedia.org/?curid='+encodeURIComponent(page.pageid);
      const file=page.pageimage?('https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(page.pageimage.replace(/ /g,'_'))):pageURL;
      return {src,credit:file,page:pageURL};
    }catch(e){
      // A second independent API format improves reliability across browsers/networks.
      try{
        const r=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_')),{mode:'cors'});
        if(!r.ok)return null;
        const d=await r.json();
        if(titleKey(d.title)!==titleKey(title)||!d.thumbnail?.source?.startsWith('https://'))return null;
        return {src:d.thumbnail.source,credit:d.content_urls?.desktop?.page||wikiArticle(title),page:d.content_urls?.desktop?.page||wikiArticle(title)};
      }catch(err){return null;}
    }
  })();
  photoCache.set(key,promise);
  return promise;
}
async function resolveWikiPortraitFallback(g){
  return resolvePortrait({...g,id:'wikipedia:'+g.name});
}
let profileVersion=0,leaderVersion=0,subjectVersion=0;
function displayPhoto(g,imageId,initialsId,creditId,version,readVersion){
  const img=$(imageId),fallback=$(initialsId),credit=creditId?$(creditId):null;
  if(!img||!fallback)return;
  const flag=countryFallback(g);
  fallback.textContent=flag||initials(g?.name||'GS');
  fallback.classList.toggle('flag-glyph',Boolean(flag));
  fallback.hidden=false;img.hidden=true;
  img.removeAttribute('src');
  if(credit){credit.hidden=true;credit.removeAttribute('href')}
  if(!g||photoSubject(g)?.kind==='country')return;
  resolvePortrait(g).then(info=>{
    if(readVersion()!==version||!info)return;
    img.onload=()=>{if(readVersion()===version){img.hidden=false;fallback.hidden=true;}};
    img.onerror=()=>{
      if(readVersion()!==version)return;
      if(info.fallbackToWiki){
        // Re-try with sourced Wikimedia photo when the NBA CDN has no image.
        photoCache.delete('wiki:athlete:'+((portraitAliases[g.name])||g.name));
        resolveWikiPortraitFallback(g).then(alternative=>{
          if(readVersion()!==version)return;
          if(alternative){
            img.onerror=()=>{img.hidden=true;fallback.hidden=false;if(credit)credit.hidden=true;};
            img.src=alternative.src;if(credit){credit.href=alternative.credit;credit.hidden=false}
          }else{img.hidden=true;fallback.hidden=false;if(credit)credit.hidden=true;}
        });
      }else{img.hidden=true;fallback.hidden=false;if(credit)credit.hidden=true;}
    };
    img.loading='eager';
    img.src=info.src;
    if(credit){credit.href=info.credit;credit.hidden=false;credit.title='Wikimedia image file and licensing information'}
  }).catch(()=>{});
}
// Ranking entries show real photo thumbnails, not external photo links.
// Only near-viewport rows request remote images; every subject still has the
// larger photo and a clickable credit in its selected profile panel.
let rankPhotoObserver=null;
function hydrateRankingPhotos(){
  rankPhotoObserver?.disconnect();
  const subjects=new Map(ranking.slice(0,visibleRankingCount).map(g=>[g.id,g]));
  const targets=[...document.querySelectorAll('#rankRows .rank-thumb, #bars .rank-thumb')];
  const display=(node,g,info)=>{
    if(!info||!node.isConnected)return;
    const img=node.querySelector('img.rank-photo'),fallback=node.querySelector('span');
    img.onload=()=>{if(node.isConnected){img.hidden=false;fallback.hidden=true;}};
    img.onerror=()=>{
      img.hidden=true;fallback.hidden=false;
      if(info.fallbackToWiki){
        resolveWikiPortraitFallback(g).then(alt=>{
          if(alt&&node.isConnected)display(node,g,{...alt,fallbackToWiki:false});
        }).catch(()=>{});
      }
    };
    img.loading='eager';
    img.src=info.src;
  };
  const loadNode=node=>{
    const g=subjects.get(node.dataset.rankId);
    if(!g||photoSubject(g)?.kind==='country')return;
    const badge=sport==='Soccer'&&footballMode==='clubs'?clubBadgeUrl(g.name):null;
    if(badge){display(node,g,{src:badge});return;}
    resolvePortrait(g).then(info=>display(node,g,info)).catch(()=>{});
  };
  if(typeof IntersectionObserver==='function'){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);loadNode(entry.target);}
    },{rootMargin:'280px'});
    rankPhotoObserver=observer;
    targets.forEach(node=>observer.observe(node));
  }else targets.slice(0,30).forEach(loadNode);
}

function setupFeaturedImages(){
  document.querySelectorAll('.featured-frame').forEach(frame=>{
    const img=frame.querySelector('.featured-image img');
    const btn=frame.querySelector('[data-featured-name]');
    const credit=frame.querySelector('.featured-credit');
    if(!img||!btn)return;
    img.onload=()=>img.classList.add('is-loaded');
    img.onerror=async()=>{
      if(img.dataset.retried){img.hidden=true;return;}
      img.dataset.retried='1';
      const name=btn.dataset.featuredName;
      try{
        const url='https://en.wikipedia.org/w/api.php?action=query&origin=*&redirects=1&titles='+
          encodeURIComponent(name)+'&prop=pageimages&piprop=thumbnail&pithumbsize=620&format=json&formatversion=2';
        const response=await fetch(url,{mode:'cors'});
        if(!response.ok)throw Error('Photo lookup failed');
        const data=await response.json();
        const page=(data.query?.pages||[]).find(p=>!p.missing&&p.thumbnail?.source&&titleKey(p.title)===titleKey(name));
        if(!page)throw Error('No matching portrait');
        img.src=page.thumbnail.source;
        if(credit){credit.href=wikiArticle(name);credit.textContent='PHOTO: WIKIPEDIA';}
      }catch(_){img.hidden=true;}
    };
    if(img.complete&&img.naturalWidth)img.classList.add('is-loaded');
  });
}
setupFeaturedImages();
function updateProfiles(a,b){
  const version=++profileVersion;
  for(const [suffix,g] of [['A',a],['B',b]]){
    $('avatarName'+suffix).textContent=g?.name||'Select a competitor';
    $('avatarTeam'+suffix).textContent=teamInfo(g);
    displayPhoto(g,'avatarPhoto'+suffix,'avatarFallback'+suffix,'avatarCredit'+suffix,version,()=>profileVersion);
    updateBadge('avatarBadge'+suffix,g);
  }
}
function updateLeaderPhoto(g){
  const version=++leaderVersion;
  $('leaderTeam').textContent=teamInfo(g);
  displayPhoto(g,'leaderPortrait','leaderMonogram','leaderPhotoCredit',version,()=>leaderVersion);
  updateBadge('leaderClubBadge',g);
}
const badgeAliases={'Arsenal FC':'Arsenal','Manchester City':'Man City','Manchester United':'Man Utd','Tottenham':'Spurs','Tottenham Hotspur':'Spurs','Liverpool FC':'Liverpool','Chelsea FC':'Chelsea','Leicester City':'Leicester','Leicester City FC':'Leicester','Newcastle United':'Newcastle','Wolverhampton Wanderers':'Wolves','West Ham United':'West Ham','Nottingham Forest':"Nott'm Forest",'Brighton & Hove Albion':'Brighton','Crystal Palace FC':'Crystal Palace','AFC Bournemouth':'Bournemouth','Sheffield United':'Sheffield Utd','Leeds United':'Leeds','Norwich City':'Norwich','West Bromwich Albion':'West Brom'};
function clubBadgeUrl(rawName){
  const original=String(rawName||'').trim(),short=badgeAliases[original]||original;
  const value=clubBadgeMap[short];
  return typeof value==='string'&&/^[0-9]+$/.test(value)?'assets/club-badges/'+value+'.svg':null;
}
function competitorClub(g){
  if(!g||sport!=='Soccer')return null;
  if(footballMode==='clubs')return g.name;
  const selected=filtered.filter(r=>r.competitor_id===g.id&&r.team).sort((a,b)=>b.season.localeCompare(a.season))[0];
  if(selected?.team)return selected.team;
  return all.find(r=>r.sport==='Soccer'&&r.record_kind==='player_season'&&r.competitor_id===g.id)?.team||null;
}
function updateBadge(id,g){
  const img=$(id);if(!img)return;
  const club=competitorClub(g),url=clubBadgeUrl(club);
  img.hidden=!url;img.removeAttribute('src');
  if(url){img.onerror=()=>{img.hidden=true};img.alt=club+' club crest';img.src=url;}
}
function renderClubShelf(){
  if(sport!=='Soccer'||footballMode!=='clubs')return;
  const names=[...new Set(filtered.map(x=>x.competitor))].sort((a,b)=>a.localeCompare(b)).slice(0,150);
  const items=names.map(name=>{
    const src=clubBadgeUrl(name),initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return '<button class="club-badge-choice" data-club-name="'+escapeHtml(name)+'">'+
      (src?'<img src="'+src+'" alt="'+escapeHtml(name)+' crest" loading="lazy" onerror="this.hidden=true"/>':'<b>'+escapeHtml(initials)+'</b>')+
      '<span>'+escapeHtml(name)+'</span></button>';
  });
  $('footballClubBadgeGrid').innerHTML=items.join('');
}
let footballDetailSeason=null;
function renderFootballProfile(g){
  if(sport!=='Soccer'||footballMode!=='players')return;
  const history=all.filter(r=>r.sport==='Soccer'&&r.record_kind==='player_season'&&r.competitor_id===g.id)
    .sort((a,b)=>a.season.localeCompare(b.season));
  const name=g.name;
  $('footballArchiveTitle').textContent=name+' / year-by-year performance';
  $('footballArchiveNote').textContent='Select a season to inspect all source metrics. '+history.length+' of 10 archived seasons recorded for this player.';
  if(!history.length){$('footballYearTabs').innerHTML='';$('footballStatBreakdown').innerHTML='';$('footballYearRows').innerHTML='';return;}
  const years=history.map(r=>r.season);
  if(!footballDetailSeason||!years.includes(footballDetailSeason))footballDetailSeason=years.at(-1);
  $('footballYearTabs').innerHTML=playerSeasons.map(year=>'<button type="button" data-football-year="'+year+'" class="'+(year===footballDetailSeason?'selected':'')+'" '+(!years.includes(year)?'disabled title="No player record for this season"':'')+'>'+year.replace('-','/')+'</button>').join('');
  const fields=[['goals','GOALS'],['assists','FPL ASSISTS'],['minutes','MINUTES'],['total_points','FPL POINTS'],['starts','STARTS'],['clean_sheets','CLEAN SHEETS'],['saves','SAVES'],['yellow_cards','YELLOW CARDS'],['red_cards','RED CARDS'],['bonus','BONUS POINTS'],['expected_goals','EXPECTED GOALS'],['expected_assists','EXPECTED ASSISTS'],['tackles','TACKLES'],['recoveries','RECOVERIES'],['goals_against','GOALS CONCEDED']];
  const picked=history.find(r=>r.season===footballDetailSeason);
  $('footballStatBreakdown').innerHTML=fields.map(([key,label])=>{
    const val=typeof picked[key]==='number'?number(picked[key]):'Not recorded';
    return '<div class="football-stat-tile"><small>'+label+'</small><strong>'+val+'</strong></div>';
  }).join('');
  $('footballYearRows').innerHTML=history.map(r=>
    '<tr class="'+(r.season===footballDetailSeason?'active-year':'')+'"><td>'+escapeHtml(r.season.replace('-','/'))+'</td><td>'+escapeHtml(r.team||'Not recorded')+'</td>'+
    ['goals','assists','minutes','total_points','clean_sheets','saves'].map(k=>'<td>'+(typeof r[k]==='number'?number(r[k]):'—')+'</td>').join('')+'</tr>').join('');
}

let selectedSubjectId='';
function renderSelectedSubject(){
  const picked=ranking.find(g=>g.id===selectedSubjectId)||ranking[0];
  if(!picked){
    selectedSubjectId='';
    $('subjectName').textContent='NO MATCHING SUBJECT';
    $('subjectAffiliation').textContent='Change the search or filters.';
    $('subjectContext').textContent='No data available for this selection.';
    $('subjectMetric').textContent='—';
    $('subjectMetricLabel').textContent='No metric';
    displayPhoto(null,'subjectPortrait','subjectMonogram','subjectPhotoCredit',++subjectVersion,()=>subjectVersion);
    return;
  }
  selectedSubjectId=picked.id;
  $('subjectName').textContent=picked.name;
  $('subjectAffiliation').textContent=teamInfo(picked);
  const rowsForSubject=filtered.filter(r=>r.competitor_id===picked.id);
  const years=[...new Set(rowsForSubject.map(r=>r.season))];
  $('subjectContext').textContent=rowsForSubject[0]?.record_kind==='international_player_career'?
    'Historical career snapshot · '+$('competition').value:
    years.length+' recorded season'+(years.length===1?'':'s')+' · '+rowsForSubject.length.toLocaleString()+' observations';
  $('subjectMetric').textContent=number(picked.metric);
  $('subjectMetricLabel').textContent=defs[sport].metrics[$('metric').value]||$('metric').value;
  const v=++subjectVersion;
  displayPhoto(picked,'subjectPortrait','subjectMonogram','subjectPhotoCredit',v,()=>subjectVersion);
  updateBadge('subjectClubBadge',picked);
  const badge=clubBadgeUrl(competitorClub(picked));
  $('subjectBadgeLine').hidden=!badge;
  $('subjectClubName').textContent=competitorClub(picked)||'';
  renderFootballProfile(picked);
  document.querySelectorAll('[data-select-subject]').forEach(el=>el.classList.toggle('is-subject-selected',el.dataset.selectSubject===picked.id));
}
function renderCompare() {
  const metric = $('metric').value;
  const a = ranking.find(g => g.id === $('compareA').value);
  const b = ranking.find(g => g.id === $('compareB').value);
  updateProfiles(a,b);
  renderDuelChart(a,b);

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
    const good = parsed
      .filter(r=>!r.sport||String(r.sport).toLowerCase()===sport.toLowerCase())
      .map(r=>norm(r,r.sport||sport))
      .filter(x=>x.competitor&&x.season&&x.sport.toLowerCase()===sport.toLowerCase()&&
        (sport!=='F1'||numeric(x.finish_position)!==null||numeric(x.grid_position)!==null));
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


function openHome(){
  homeActive=true;
  $('homeScreen').hidden=false;
  $('dashboardScreen').hidden=true;
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  const homeButton=document.querySelector('[data-home]');
  if(homeButton)homeButton.classList.add('active');
  window.scrollTo?.({top:0,behavior:'smooth'});
}
function openSport(which){
  if(!defs[which])return;
  homeActive=false;
  $('homeScreen').hidden=true;$('dashboardScreen').hidden=false;
  sport=which;
  visibleRankingCount=120;
  $('search').value='';
  if(sport==='Soccer')footballMode='clubs';
  updateControls();
  if(sport==='Cricket')selectCricketView('International ODI');
  window.scrollTo?.({top:0,behavior:'smooth'});
}
document.querySelectorAll('.sidebar a[href^="#"]').forEach(link=>{
  link.addEventListener('click',()=>{if(homeActive)openSport('Soccer');});
});
document.querySelector('[data-home]').addEventListener('click',openHome);
$('homeExplore').addEventListener('click',()=>openSport('Soccer'));
document.querySelectorAll('[data-open-sport]').forEach(btn=>btn.addEventListener('click',()=>openSport(btn.dataset.openSport)));
document.querySelectorAll('[data-featured-sport]').forEach(btn=>btn.addEventListener('click',()=>{
  const sportName=btn.dataset.featuredSport;
  openSport(sportName);
  if(sportName==='Soccer'){
    footballMode='players';
    updateControls();
    $('competition').value='Premier League · Players';
    syncFootballMetricOptions();
    $('metric').value='goals';
    $('footballPlayerArchive').hidden=false;
    $('footballClubShelf').hidden=true;
    document.querySelectorAll('[data-football-view]').forEach(b=>b.classList.toggle('selected',b.dataset.footballView==='players'));
  }
  if(sportName==='Cricket'){
    selectCricketView('International ODI Players');
  }
  $('season').value='All seasons';
  $('search').value=btn.dataset.featuredName;
  selectedSubjectId='';
  render();
}));
$('footballYearTabs').addEventListener('click',event=>{
  const b=event.target.closest('[data-football-year]');
  if(!b||b.disabled)return;
  footballDetailSeason=b.dataset.footballYear;
  const g=ranking.find(x=>x.id===selectedSubjectId)||ranking[0];
  if(g)renderFootballProfile(g);
});
$('footballClubBadgeGrid').addEventListener('click',event=>{
  const b=event.target.closest('[data-club-name]');
  if(!b)return;
  $('search').value=b.dataset.clubName;
  render();
  $('subjectPanel').scrollIntoView?.({behavior:'smooth',block:'center'});
});
document.querySelectorAll('[data-football-view]').forEach(btn=>btn.addEventListener('click',()=>{
  if(sport!=='Soccer')return;
  footballMode=btn.dataset.footballView;
  selectedSubjectId='';
  $('season').value='All seasons';
  $('search').value='';
  updateControls();
  $('competition').value=footballMode==='players'?'Premier League · Players':'All competitions';
  syncFootballMetricOptions();
  document.querySelectorAll('[data-football-view]').forEach(b=>b.classList.toggle('selected',b.dataset.footballView===footballMode));
  render();
}));
document.querySelectorAll('.nav').forEach(btn => btn.onclick = () => openSport(btn.dataset.sport));

function selectCricketView(c){
  if(sport!=='Cricket')return;
  $('season').value='All seasons';
  const match=[...$('competition').options].some(o=>o.value===c);
  if(!match){
    $('importStatus').textContent='The '+c+' archive could not be found. Check the data status below.';
    return;
  }
  $('competition').value=c;
  $('metric').value=c.startsWith('International ')&&!c.endsWith(' Players')?'wins':'runs';
  syncCricketMetricOptions();
  document.querySelectorAll('[data-cricket-view]').forEach(b=>b.classList.toggle('selected',b.dataset.cricketView===c));
  const cricketPanel=$('cricketFormats'); if(cricketPanel)cricketPanel.hidden=false;
  render();
}
document.querySelectorAll('[data-cricket-view]').forEach(b=>b.addEventListener('click',()=>selectCricketView(b.dataset.cricketView)));
$('competition').addEventListener('change',()=>{
  if(sport!=='Cricket')return;
  const c=$('competition').value;
  if(c==='All competitions'){selectCricketView('International ODI');return;}
  let international=c.startsWith('International ')&&!c.endsWith(' Players');
  syncCricketMetricOptions();
  if(international&&['runs','wickets','strike_rate'].includes($('metric').value))$('metric').value='wins';
  if(!international&&['wins','losses','win_rate'].includes($('metric').value))$('metric').value='runs';
});
$('competition').addEventListener('change',()=>{
  if(sport!=='Soccer')return;
  const value=$('competition').value;
  if(value==='Premier League · Players')footballMode='players';
  else if(value!=='All competitions')footballMode='clubs';
  syncFootballMetricOptions();
  document.querySelectorAll('[data-football-view]').forEach(b=>b.classList.toggle('selected',b.dataset.footballView===footballMode));
});
['season', 'competition', 'metric', 'search'].forEach(id => {
  $(id).addEventListener(id === 'search' ? 'input' : 'change', ()=>{visibleRankingCount=120;render();});
});
$('showMoreRanks').addEventListener('click',()=>{
  visibleRankingCount+=120;
  render();
});
['compareA', 'compareB'].forEach(id => $(id).addEventListener('change', renderCompare));
for(const id of ['bars','rankRows']){
  $(id).addEventListener('click',event=>{
    const item=event.target.closest('[data-select-subject]');
    if(item){selectedSubjectId=item.dataset.selectSubject;renderSelectedSubject();}
  });
  $(id).addEventListener('keydown',event=>{
    const item=event.target.closest('[data-select-subject]');
    if(item&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();selectedSubjectId=item.dataset.selectSubject;renderSelectedSubject();
    }
  });
}

function reportFailure(err){
  console.error('GameSense:',err);
  const panel=$('runtimeError');
  if(panel){panel.hidden=false;panel.textContent='Could not finish loading GameSense: '+String(err?.message||err)+'. Please reload the hosted page.';}
  if($('loadState'))$('loadState').textContent='An error occurred — see message below';
}
window.addEventListener('error',e=>reportFailure(e.error||e.message));
window.addEventListener('unhandledrejection',e=>reportFailure(e.reason));
load().catch(reportFailure);
