import { browser, open } from './playtest-lib.mjs';
const page = await open();
await page.evaluate(() => { pmRender = () => {}; pmHUD = () => {}; render = () => {}; });
function replay() {
  const order = [6, 7, 5, 3, 4, 2, 0, 1], type = ['sundew', 'pitcher'], ups = 3, grip = 3, first = 4;
  pmStart(0, 8 * 7919); pmBegin(); const m = S.pm;
  const bot = () => {
    const up = () => { for (const i of order) { const pl = m.plots[i]; if (pl.plant && pl.plant.lvl < ups) { const u = PM_PLANTS[pl.plant.type].path[pl.plant.lvl]; if (m.nutrients >= u.cost) { pmUpgrade(pl); pmCloseSheet(); return true; } } } return false; };
    const pl = () => { for (const i of order) if (!m.plots[i].plant) { const t = type[m.lv.plants.length % 2]; if (m.nutrients >= PM_PLANTS[t].cost) { pmPlant(m.plots[i], t); return true; } return false; } return false; };
    const gr = () => { if (m.grip < grip && m.nutrients >= PM.gripCost[m.grip]) { pmGrip(m.plots[0]); pmCloseSheet(); return true; } return false; };
    return m.lv.plants.length < first ? pl() || gr() || up() : gr() || up() || pl();
  };
  let tick = 0, f = 0;
  while (S.mode === 'plant' && f < 36000) { if (tick <= 0) { tick = 0.5; while (bot()); } if (!m.active) pmStartWave(); pmUpdate(1 / 60); S.particles.length = 0; S.texts.length = 0; tick -= 1 / 60; f++; }
  const snap = () => ({ wave: m.wave, active: m.active, queue: m.queue.length, hp: m.hp, nut: m.nutrients,
    bugs: m.bugs.map((b) => ({ type: b.type, x: +b.x.toFixed(1), y: +b.y.toFixed(1), vy: +b.vy.toFixed(1), st: !!b.st, inv: +b.inv.toFixed(2), stick: +b.stick.toFixed(2), gone: b.gone })),
    plants: m.lv.plants.map((p) => ({ type: p.type, x: p.x, y: p.y, lvl: p.lvl, held: p.held.length, cap: p.cap, mouth: p.mouth, pull: p.pull, force: p.force, r: p.r, slow: p.slow })) });
  const a = snap(); for (let i = 0; i < 600; i++) pmUpdate(1 / 60); const b = snap();
  return { mode: S.mode, a, moved: b.bugs.map((q, i) => [q.x, q.y]) };
}
console.log(JSON.stringify(await page.evaluate(replay), null, 0).slice(0, 1800));
// Confirm top recipes on more seeds
await browser.close();
