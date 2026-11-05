// Plays plant mode at high speed with scripted players, and measures struggle odds.
// This is the numbers half of balancing. It can't tell you whether the game feels fun.
import { resolve } from 'node:path';
import { webkit } from 'playwright';

const SEEDS = +(process.argv[2] || 60);

function playAll(SEEDS) {
  // Each bot gets a chance to spend every 0.5 s of game time.
  const buyPlant = (m, type) => {
    const plot = m.plots.find((pl) => !pl.plant);
    if (plot && m.nutrients >= PM_PLANTS[type].cost) { pmPlant(plot, type); return true; }
    return false;
  };
  const buyUp = (m, types) => {
    for (const pl of m.plots) {
      const p = pl.plant;
      if (!p || (types && !types.includes(p.type))) continue;
      const u = PM_PLANTS[p.type].path[p.lvl];
      if (u && m.nutrients >= u.cost) { pmUpgrade(pl); pmCloseSheet(); return true; }
    }
    return false;
  };
  const buyGrip = (m) => {
    if (m.grip < PM.gripCost.length && m.nutrients >= PM.gripCost[m.grip]) { pmGrip(m.plots[0]); pmCloseSheet(); return true; }
    return false;
  };
  const count = (m) => m.lv.plants.length;
  // A person spreads plants across the map instead of filling plots bottom to top.
  const SPREAD = [2, 3, 4, 5, 0, 1, 6, 7];
  const buyAt = (m, type) => {
    const plot = SPREAD.map((i) => m.plots[i]).find((pl) => !pl.plant);
    if (plot && m.nutrients >= PM_PLANTS[type].cost) { pmPlant(plot, type); return true; }
    return false;
  };
  const onlyPlant = (type) => (m) => buyPlant(m, type);
  const onlyPlantUp = (type) => (m) => buyUp(m) || buyPlant(m, type);
  const cycle = ['flytrap', 'sundew', 'flytrap', 'pitcher', 'bladder', 'flytrap', 'sundew', 'pitcher'];
  const BOTS = {
    'does nothing': () => false,
    'one flytrap, then stops': (m) => count(m) < 1 && buyPlant(m, 'flytrap'),
    'two plants, no upgrades': (m) => count(m) < 2 && buyPlant(m, ['flytrap', 'sundew'][count(m)]),
    'flytraps only, no upgrades': onlyPlant('flytrap'),
    'sundews only, no upgrades': onlyPlant('sundew'),
    'pitchers only, no upgrades': onlyPlant('pitcher'),
    'bladderworts only, no upgrades': onlyPlant('bladder'),
    'flytraps + upgrades': onlyPlantUp('flytrap'),
    'sundews + upgrades': onlyPlantUp('sundew'),
    'pitchers + upgrades': onlyPlantUp('pitcher'),
    'bladderworts + upgrades': onlyPlantUp('bladder'),
    'mixed plants first, then upgrades': (m) => (count(m) < 8 && m.nutrients >= PM_PLANTS[cycle[count(m)]].cost ? buyPlant(m, cycle[count(m)]) : count(m) >= 4 && (buyUp(m) || buyGrip(m))),
    'spread out, no upgrades': (m) => count(m) < 8 && buyAt(m, cycle[count(m)]),
    'spread out, upgrades after 4 plants': (m) => (count(m) < 4 ? buyAt(m, cycle[count(m)]) : buyGrip(m) || buyUp(m) || (count(m) < 8 && buyAt(m, cycle[count(m)]))),
    'spread out, 6 plants then upgrades': (m) => (count(m) < 6 ? buyAt(m, cycle[count(m)]) : buyGrip(m) || buyUp(m) || (count(m) < 8 && buyAt(m, cycle[count(m)]))),
    'mixed + grip early': (m) => (count(m) < 3 ? buyPlant(m, cycle[count(m)]) : buyGrip(m) || (count(m) < 8 && buyPlant(m, cycle[count(m)])) || buyUp(m)),
  };
  const out = {};
  for (const [name, bot] of Object.entries(BOTS)) {
    let wins = 0, hp = 0, waveLost = [0, 0, 0], leakW = [0, 0, 0], eaten = 0, leaked = 0, esc = 0, secs = 0, spent = 0, worst = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      pmStart(0, seed * 7919); pmBegin();
      const m = S.pm;
      let t = 0, frames = 0;
      while (S.mode === 'plant' && frames < 60 * 600) {
        if (t <= 0) { t = 0.5; while (bot(m)); }
        if (!m.active) pmStartWave();
        const w = m.wave, before = m.leaked;
        pmUpdate(1 / 60); leakW[w] += m.leaked - before; S.particles.length = 0; S.texts.length = 0;
        t -= 1 / 60; frames++;
      }
      if (S.mode === 'plant') throw new Error('run never finished: ' + name);
      if (m.hp > 0) { wins++; hp += m.hp; } else waveLost[m.wave]++;
      eaten += m.eaten; leaked += m.leaked; esc += m.escapes; secs += frames / 60; worst = Math.max(worst, frames / 60);
    }
    out[name] = { win: Math.round(wins / SEEDS * 100), hpIfWon: wins ? +(hp / wins).toFixed(1) : '-', lostInWave: waveLost.join('/'), leaksByWave: leakW.map((n) => (n / SEEDS).toFixed(1)).join('/'),
      eaten: +(eaten / SEEDS).toFixed(1), through: +(leaked / SEEDS).toFixed(1), freed: +(esc / SEEDS).toFixed(1), secs: Math.round(secs / SEEDS), worst: Math.round(worst) };
  }
  return out;
}

function odds() {
  pmStart(0, 12345); pmBegin();
  const m = S.pm, N = 3000, table = {};
  for (const grip of [0, 1, 2, 3]) for (const type of Object.keys(PM_PLANTS)) for (const bug of Object.keys(BUGS)) {
    m.grip = grip; let freed = 0;
    for (let i = 0; i < N; i++) {
      const p = Object.assign(makePlant(type, 200, 400, m.R), { held: [], cap: 9, digest: PM.digest, closedT: PM.closed, pop: 0 });
      pmSpawn(bug); const b = m.bugs.pop(); b.armor = 0; b.x = 200; b.y = 400;
      pmCatch(b, p);
      while (b.st) pmStruggle(b, 1 / 60);
      if (!b.gone) freed++;
      m.escapes = 0; S.texts.length = 0; S.particles.length = 0;
    }
    (table[`${type} grip ${grip}`] ||= {})[bug] = Math.round(freed / N * 100) + '%';
  }
  return table;
}

const browser = await webkit.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); process.exitCode = 1; });
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await page.goto('file://' + resolve('../index.html'));
console.log(`\nFull games, ${SEEDS} seeds each (win %, health left when won, losses in wave 1/2/3):`);
console.table(await page.evaluate(playAll, SEEDS));
console.log('\nChance a caught bug breaks free (no armour, full stamina):');
console.table(await page.evaluate(odds));
await browser.close();
