// Sessions 8 to 10: cheat at plant mode, play it on desktop, and abuse it.
import { browser, open, OUT } from './playtest-lib.mjs';
const nodraw = (p) => p.evaluate(() => { pmRender = () => {}; pmHUD = () => {}; render = () => {}; updateHUD = () => {}; });

// ---- Session 8: hunt for a recipe that wins too easily
function recipes(SEEDS) {
  const orderAll = { edges: [3, 4, 0, 1, 6, 7, 5, 2], low: [0, 1, 2, 3, 4, 5, 6, 7], high: [6, 7, 5, 3, 4, 2, 0, 1], centre: [2, 5, 3, 4, 0, 1, 6, 7] };
  const plan = (type, order, ups, grip, plantsFirst) => (m) => {
    const up = () => { for (const i of order) { const pl = m.plots[i]; if (pl.plant && pl.plant.lvl < ups) { const u = PM_PLANTS[pl.plant.type].path[pl.plant.lvl]; if (m.nutrients >= u.cost) { pmUpgrade(pl); pmCloseSheet(); return true; } } } return false; };
    const pl = () => { for (const i of order) if (!m.plots[i].plant) { const t = Array.isArray(type) ? type[m.lv.plants.length % type.length] : type; if (m.nutrients >= PM_PLANTS[t].cost) { pmPlant(m.plots[i], t); return true; } return false; } return false; };
    const gr = () => { if (m.grip < grip && m.nutrients >= PM.gripCost[m.grip]) { pmGrip(m.plots[0]); pmCloseSheet(); return true; } return false; };
    return m.lv.plants.length < plantsFirst ? pl() || gr() || up() : gr() || up() || pl();
  };
  const out = [];
  for (const [oname, order] of Object.entries(orderAll)) for (const t of ['sundew', 'flytrap', 'pitcher', 'bladder', ['sundew', 'pitcher'], ['sundew', 'flytrap'], ['sundew', 'bladder'], ['pitcher', 'bladder']]) for (const [ups, grip, first] of [[1, 0, 8], [1, 1, 8], [2, 1, 6], [3, 3, 4], [1, 3, 6]]) {
    let wins = 0, hp = 0, worst = 0, secs = 0;
    for (let s = 1; s <= SEEDS; s++) {
      pmStart(0, s * 7919); pmBegin();
      const m = S.pm, bot = plan(t, order, ups, grip, first);
      let tick = 0, f = 0;
      while (S.mode === 'plant' && f < 36000) {
        if (tick <= 0) { tick = 0.5; while (bot(m)); }
        if (!m.active) pmStartWave();
        pmUpdate(1 / 60); S.particles.length = 0; S.texts.length = 0; tick -= 1 / 60; f++;
      }
      if (S.mode === 'plant') out.push({ STALLED: [oname, t, ups, grip, first, s].join(' ') });
      if (m.hp > 0) { wins++; hp += m.hp; }
      worst = Math.max(worst, f / 60); secs += f / 60;
    }
    out.push({ build: `${Array.isArray(t) ? t.join('+') : t} / ${oname}`, ups, grip, first, win: Math.round(wins / SEEDS * 100), hpLeft: wins ? +(hp / wins).toFixed(1) : 0, worst: Math.round(worst) });
  }
  return out;
}
// Where do leaks go? Which x did bugs cross at, wall or middle?
function leakMap(SEEDS) {
  const lanes = Array(8).fill(0); let total = 0, spawnEdge = 0, spawn = 0;
  for (let s = 1; s <= SEEDS; s++) {
    pmStart(0, s * 31); pmBegin(); const m = S.pm; m.nutrients = 9999;
    m.plots.forEach((pl, i) => pmPlant(pl, ['flytrap', 'sundew', 'pitcher', 'bladder'][i % 4]));
    m.plots.forEach((pl) => { pmUpgrade(pl); pmCloseSheet(); });
    m.wave = 2; pmStartWave();
    let f = 0;
    while (m.active && S.mode === 'plant' && f++ < 9000) { const lk = m.leaked; const xs = m.bugs.filter((b) => !b.gone && !b.st).map((b) => [b, b.x]); pmUpdate(1 / 60); if (m.leaked > lk) for (const [b, x] of xs) if (b.gone) { lanes[Math.min(7, Math.floor(x / 50))]++; total++; } S.particles.length = 0; S.texts.length = 0; }
  }
  return { lanes, total };
}
// Does a pitcher trap a bug in a hover forever?
function hover() {
  const res = [];
  for (const [bug, up] of [['beetle', 0], ['beetle', 2], ['ant', 2], ['fly', 2]]) {
    pmStart(0, 9); pmBegin(); const m = S.pm; m.nutrients = 9999;
    pmPlant(m.plots[2], 'pitcher'); for (let k = 0; k < up; k++) { pmUpgrade(m.plots[2]); pmCloseSheet(); }
    m.active = true; m.queue = [{ t: 1e9, type: 'ant' }];
    pmSpawn(bug); Object.assign(m.bugs[0], { x: 200, y: 470, armor: 0, inv: 0 });   // just past the mouth, walking away
    let f = 0; while (m.bugs[0] && !m.bugs[0].gone && !m.bugs[0].st && f < 3600) { pmUpdate(1 / 60); f++; S.particles.length = 0; S.texts.length = 0; }
    const b = m.bugs[0]; res.push({ bug, pullUpgrades: up, after: +(f / 60).toFixed(1), state: !b ? 'gone' : b.st ? 'caught' : b.gone ? 'reached top' : `STILL HOVERING y=${Math.round(b.y)}` });
  }
  return res;
}
{
  const page = await open(); await nodraw(page);
  await page.evaluate(() => { save.side = 'plant'; });
  const SEEDS = +(process.argv[2] || 12);
  const all = await page.evaluate(recipes, SEEDS);
  const stalled = all.filter((r) => r.STALLED);
  const rows = all.filter((r) => r.build).sort((a, b) => b.win - a.win || b.hpLeft - a.hpLeft);
  console.log(`SESSION 8: ${rows.length} recipes x ${SEEDS} seeds. stalled games: ${stalled.length}`, stalled.slice(0, 3));
  console.table(rows.slice(0, 12)); console.log('share of recipes winning >= 90%:', rows.filter((r) => r.win >= 90).length, 'of', rows.length, ' worst game secs', Math.max(...rows.map((r) => r.worst)));
  console.log('leak lanes, 50 units each, left to right', await page.evaluate(leakMap, 30));
  console.table(await page.evaluate(hover));
  console.log('errors', page.errs, await page.evaluate(() => __oddities));
  await page.context().close();
}
await browser.close();
