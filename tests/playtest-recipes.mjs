import { browser, open } from './playtest-lib.mjs';
const p = await open(); await p.evaluate(() => { pmRender = () => {}; pmHUD = () => {}; });
function test(SEEDS) {
  const cases = { 'alternate sundew, flytrap bottom-up, then widen': [['sundew', 'flytrap'], [0, 1, 2, 3, 4, 5, 6, 7], 1, 0], 'sundew + bladderwort top-down, then widen': [['sundew', 'bladder'], [6, 7, 5, 3, 4, 2, 0, 1], 1, 1], 'sundews only bottom-up, no upgrades': [['sundew'], [0, 1, 2, 3, 4, 5, 6, 7], 0, 0], 'sundews only bottom-up, widen': [['sundew'], [0, 1, 2, 3, 4, 5, 6, 7], 1, 0], 'flytraps only bottom-up, widen': [['flytrap'], [0, 1, 2, 3, 4, 5, 6, 7], 1, 0], 'pitchers only bottom-up, widen': [['pitcher'], [0, 1, 2, 3, 4, 5, 6, 7], 1, 0], 'bladderworts only bottom-up, widen': [['bladder'], [0, 1, 2, 3, 4, 5, 6, 7], 1, 0], 'my losing plan: sundews, edges first, widen': [['sundew'], [3, 4, 0, 1, 6, 7, 5, 2], 1, 0] };
  const out = [];
  for (const [name, [types, order, ups, grip]] of Object.entries(cases)) {
    let wins = 0, hp = 0, stall = 0, w1 = 0;
    for (let s = 1; s <= SEEDS; s++) {
      pmStart(0, s * 104729); pmBegin(); const m = S.pm; let tick = 0, f = 0;
      const bot = () => {
        for (const i of order) { const pl = m.plots[i]; if (!pl.plant) { const t = types[m.lv.plants.length % types.length]; if (m.nutrients >= PM_PLANTS[t].cost) { pmPlant(pl, t); return true; } break; } }
        if (m.grip < grip && m.nutrients >= PM.gripCost[m.grip]) { pmGrip(m.plots[0]); pmCloseSheet(); return true; }
        for (const i of order) { const pl = m.plots[i]; if (pl.plant && pl.plant.lvl < ups && m.nutrients >= PM_PLANTS[pl.plant.type].path[pl.plant.lvl].cost) { pmUpgrade(pl); pmCloseSheet(); return true; } }
        return false;
      };
      while (S.mode === 'plant' && f < 36000) { if (tick <= 0) { tick = 0.5; while (bot()); } if (!m.active) pmStartWave(); const w = m.wave, lk = m.leaked; pmUpdate(1 / 60); if (w === 0) w1 += m.leaked - lk; S.particles.length = 0; S.texts.length = 0; tick -= 1 / 60; f++; }
      if (S.mode === 'plant') stall++; else if (m.hp > 0) { wins++; hp += m.hp; }
    }
    out.push({ name, win: Math.round(wins / SEEDS * 100) + '%', hpIfWon: wins ? +(hp / wins).toFixed(1) : '-', wave1Leaks: +(w1 / SEEDS).toFixed(1), stalled: stall });
  }
  return out;
}
console.table(await p.evaluate(test, 60));
await browser.close();
