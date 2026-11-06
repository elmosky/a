// Session 5: try to win bug mode without really playing.
import { browser, open } from './playtest-lib.mjs';

function run({ bug, lvl, steer, taps, fingers = 1, evo }) {
  S.bugType = bug; save.unlocked = 4; save.points = 0;
  for (const k of Object.keys(save.evo[bug])) save.evo[bug][k] = evo ?? 0;
  startLevel(lvl); __step(5); document.getElementById('goBtn').click(); __step(2);
  const T = __touch; let held = false, f = 0, catches = 0, inS = false, minStam = 999, escT = [], sT = 0, maxX = 0, minX = 400;
  while (S.mode === 'play' && f < 60 * 200) {
    f++;
    if (S.struggle) {
      if (!inS) { catches++; inS = true; sT = f; }
      if (held) { T.up(0, 0); held = false; }
      if (taps && f % Math.max(1, Math.round(60 / taps)) === 0) for (let k = 0; k < fingers; k++) __tap(100 + k * 60, 500, 5 + k);
    } else {
      if (inS) { inS = false; if (!S.caught) escT.push((f - sT) / 60); }
      if (!S.caught) { if (!held) { T.down(195, 560); held = true; } T.move(195 + steer[0] * 55, 560 + steer[1] * 55); }
    }
    __step(1);
    if (S.bug && S.mode === 'play') { minStam = Math.min(minStam, S.bug.stam); }
  }
  if (held) T.up(0, 0);
  const won = document.getElementById('resTitle').textContent === 'Made it across!';
  const r = { won, deaths: S.deaths, catches, secs: +(f / 60).toFixed(1), dew: S.dropsGot, total: S.lv.drops.length, esc: escT, minStam: Math.round(minStam), pts: save.points, mode: S.mode };
  S.mode = 'menu'; S.pm = null; return r;
}

const page = await open();
await page.evaluate(() => { render = () => {}; updateHUD = () => {}; });   // logic and input stay real; drawing doesn't change the outcome
const all = async (label, o) => {
  let wins = 0, deaths = 0, catches = 0, secs = 0; const lost = [];
  for (const bug of ['ant', 'beetle', 'fly']) for (let lvl = 0; lvl < 4; lvl++) {
    const r = await page.evaluate(run, { bug, lvl, ...o });
    wins += r.won ? 1 : 0; deaths += r.deaths; catches += r.catches; secs += r.secs;
    if (!r.won) lost.push(`${bug}${lvl + 1}`);
  }
  return { label, wins: `${wins}/12`, livesLost: deaths, catches, avgSecs: Math.round(secs / 12), lost: lost.join(' ') };
};
const rows = [];
rows.push(await all('nothing at all', { steer: [0, 0], taps: 0 }));
rows.push(await all('hold UP only, no taps', { steer: [0, -1], taps: 0 }));
rows.push(await all('hold UP, tap when caught', { steer: [0, -1], taps: 6 }));
rows.push(await all('hug LEFT wall, no taps', { steer: [-1, 0], taps: 0 }));
rows.push(await all('hug RIGHT wall, no taps', { steer: [1, 0], taps: 0 }));
rows.push(await all('hug LEFT wall + UP, no taps', { steer: [-0.7, -0.7], taps: 0 }));
rows.push(await all('hug RIGHT wall + UP, no taps', { steer: [0.7, -0.7], taps: 0 }));
rows.push(await all('hold UP, maxed evolution, taps', { steer: [0, -1], taps: 6, evo: 5 }));
console.table(rows);

// Tapping: how fast does a fresh ant get out with one thumb, two thumbs, four fingers?
const tapRows = [];
for (const [label, taps, fingers] of [['6 taps/s one thumb', 6, 1], ['6 taps/s two thumbs', 6, 2], ['8 taps/s four fingers', 8, 4]]) {
  const r = await page.evaluate(({ taps, fingers }) => {
    const out = {};
    for (const type of ['flytrap', 'sundew', 'pitcher', 'bladder']) {
      S.bugType = 'ant'; startLevel(0); __step(3); document.getElementById('goBtn').click(); __step(2);
      S.lv.plants = [makePlant(type, 200, S.bug.y - 200, rng(1))];
      catchBug(S.lv.plants[0]);
      let f = 0; while (S.struggle && f < 600) { f++; if (f % Math.round(60 / taps) === 0) for (let k = 0; k < fingers; k++) __tap(100 + k * 40, 500, 5 + k); __step(1); }
      out[type] = S.caught ? 'EATEN' : (f / 60).toFixed(1) + 's, ' + Math.round(S.bug.stam) + ' stam left';
      S.mode = 'menu';
    }
    return out;
  }, { taps, fingers });
  tapRows.push({ label, ...r });
}
console.table(tapRows);

// Immunity chaining: after an escape, how much ground can you cover untouchable?
console.log('immunity after escape 1.2s = at full speed', await page.evaluate(() => Object.fromEntries(Object.entries(BUGS).map(([k, b]) => [k, Math.round(b.speed * 1.2) + ' units']))));

// Evolution farming, Sunny Bog on repeat, holding up and tapping
const farm = await page.evaluate(() => {
  save.points = 0; const per = EVO_COST.reduce((a, b) => a + b) * EVO.length; return { perBug: per, allBugs: per * 3 };
});
const a = await page.evaluate(run, { bug: 'ant', lvl: 0, steer: [0, -1], taps: 6 });
const b = await page.evaluate(run, { bug: 'ant', lvl: 0, steer: [0, -1], taps: 6 });
console.log('evo cost', farm, 'first run pts', a.pts, 'secs', a.secs, 'repeat pts', b.pts, 'secs', b.secs, 'dew', b.dew, '/', b.total);
// Dying on purpose: do you keep dew?
console.log('page errors', page.errs, 'oddities', await page.evaluate(() => __oddities));
await browser.close();
