// Plays plant mode at high speed with scripted players, and measures struggle odds.
// This is the numbers half of balancing. It can't tell you whether the game feels fun.
import { resolve } from 'node:path';
import { webkit } from 'playwright';

const SEEDS = +(process.argv[2] || 60);

function playAll(SEEDS) {
  // Each bot gets a chance to spend every 0.5 s of game time. Runs are endless, so the score is waves held.
  const up = (m, order) => { for (const i of order) { const pl = m.plots[i], p = pl.plant; if (!p) continue; const u = PM_PLANTS[p.type].path[p.lvl]; if (u && m.nutrients >= u.cost) { pmUpgrade(pl); pmCloseSheet(); return true; } } return false; };
  const grip = (m) => { if (m.grip < PM.gripCost.length && m.nutrients >= PM.gripCost[m.grip]) { pmGrip(m.plots[0]); pmCloseSheet(); return true; } return false; };
  const plant = (m, order, types) => { for (const i of order) if (!m.plots[i].plant) { const t = types[m.lv.plants.length % types.length]; if (m.nutrients >= PM_PLANTS[t].cost) { pmPlant(m.plots[i], t); return true; } return false; } return false; };
  const low = [0, 1, 2, 3, 4, 5, 6, 7], high = [6, 7, 5, 3, 4, 2, 0, 1];
  const mix = ['sundew', 'flytrap', 'pitcher', 'bladder'];
  const heal = (m, at) => (!m.active && m.hp <= at && m.nutrients >= pmMendCost() ? (pmMend(), true) : false);
  const fort = (m) => (!m.active && m.lv.plants.length === 8 && m.nutrients >= pmMendCost() ? (pmMend(), true) : false);
  const BOTS = {
    'does nothing': () => false,
    'one flytrap, then stops': (m) => m.lv.plants.length < 1 && plant(m, low, ['flytrap']),
    'plants only, never upgrades or mends': (m) => plant(m, low, mix),
    'plants + upgrades, never mends': (m) => plant(m, low, mix) || grip(m) || up(m, low),
    'plants + upgrades, mends below 10': (m) => heal(m, 9) || plant(m, low, mix) || grip(m) || up(m, low),
    'mixed, mends, then fortifies': (m) => heal(m, 9) || plant(m, low, mix) || grip(m) || up(m, low) || fort(m),
    'plants + upgrades, always mends': (m) => heal(m, 15) || plant(m, low, mix) || grip(m) || up(m, low),
    'sundew + bladderwort, mends, fortifies': (m) => heal(m, 9) || plant(m, high, ['sundew', 'bladder']) || grip(m) || up(m, high) || fort(m),
    'sundew + flytrap, mends, fortifies': (m) => heal(m, 9) || plant(m, low, ['sundew', 'flytrap']) || grip(m) || up(m, low) || fort(m),
    'flytraps only, mends, fortifies': (m) => heal(m, 9) || plant(m, low, ['flytrap']) || grip(m) || up(m, low) || fort(m),
    'mends only, plants little': (m) => heal(m, 19) || (m.lv.plants.length < 3 && plant(m, low, mix)),
  };
  const out = {};
  for (const [name, bot] of Object.entries(BOTS)) {
    const waves = []; let eaten = 0, secs = 0, longest = 0, maxed = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      pmStart(0, seed * 7919); pmBegin();
      const m = S.pm;
      let t = 0, frames = 0;
      while (S.mode === 'plant' && frames < 60 * 3600) {
        if (t <= 0) { t = 0.5; while (bot(m)); }
        if (!m.active) { if (bot(m)) continue; pmStartWave(); }
        pmUpdate(1 / 60); S.particles.length = 0; S.texts.length = 0; m.flies.length = 0;
        t -= 1 / 60; frames++;
      }
      if (S.mode === 'plant') throw new Error('run never finished: ' + name);
      waves.push(m.wave); eaten += m.eaten; secs += frames / 60; longest = Math.max(longest, frames / 60);
      if (m.lv.plants.length === 8 && m.lv.plants.every((p) => p.lvl === 3) && m.grip === 3) maxed++;
    }
    waves.sort((a, b) => a - b);
    const q = (k) => waves[Math.floor(k * (waves.length - 1))];
    out[name] = { worst: waves[0], low: q(0.25), typical: q(0.5), high: q(0.75), best: waves[waves.length - 1], eaten: Math.round(eaten / SEEDS), mins: +(secs / SEEDS / 60).toFixed(1), longestMins: +(longest / 60).toFixed(1), maxedOut: Math.round(maxed / SEEDS * 100) + '%' };
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

// Bug mode: can a player cross, and can you win without trying? Each scripted player gets all 3 lives.
function bugRuns(cruise) {
  if (cruise !== undefined) WALK.cruise = cruise;
  const threat = (p) => (p.type === 'flytrap' ? (p.state === 'open' || p.state === 'warn' ? p.trig + 12 : 0) : p.type === 'sundew' ? p.r + 12 : p.type === 'pitcher' ? p.pull * 0.75 : p.suck * 0.7);
  const dodge = (dew) => () => {
    const b = S.bug; let x = 0, y = -1, hit = false;
    for (const p of S.lv.plants) {
      const ahead = b.y - p.y, R = threat(p);
      if (ahead < -30 || ahead > 190 || !R) continue;
      const dx = b.x - p.x;
      if (Math.abs(dx) < R + 14) { hit = true; const side = Math.abs(dx) < 4 ? (b.x < 200 ? 1 : -1) : Math.sign(dx); x += side * (b.x < 40 && side < 0 || b.x > 360 && side > 0 ? -1 : 1); }
    }
    if (hit) y = 0.5;
    else if (dew) { const d = S.lv.drops.filter((q) => !q.got && q.y < b.y && b.y - q.y < 170).sort((p, q) => q.y - p.y)[0]; if (d) { const gap = Math.abs(d.x - b.x), room = Math.max(1, b.y - d.y); x = Math.max(-1, Math.min(1, (d.x - b.x) / 40)); y = gap > room * 0.8 ? 1 : gap > room * 0.4 ? 0.4 : 0; } }
    const l = Math.max(1, Math.hypot(x, y));
    return [x / l, y / l];
  };
  const players = { 'hands off (no steering, no taps)': { steer: () => [0, 0], taps: 0 }, 'hands off, but taps when caught': { steer: () => [0, 0], taps: 6 }, 'dodges plants': { steer: dodge(false), taps: 6 }, 'dodges plants, chases dew': { steer: dodge(true), taps: 6 } };
  const out = {};
  for (const [name, P] of Object.entries(players)) {
    const row = {};
    for (const type of Object.keys(BUGS)) for (let lvl = 0; lvl < LEVELS.length; lvl++) {
      save.unlocked = 4; S.bugType = type;
      startLevel(lvl); beginPlay();
      let f = 0;
      for (; f < 60 * 240 && S.mode === 'play'; f++) {
        const [x, y] = P.steer(); input.active = true; input.x = x; input.y = y;
        if (S.struggle && P.taps && f % Math.round(60 / P.taps) === 0) struggleTap();
        update(1 / 60); S.particles.length = 0; S.texts.length = 0;
      }
      input.active = false; input.x = input.y = 0;
      const won = S.mode === 'result' && document.getElementById('resTitle').textContent === 'Made it across!';
      const dew = Math.round(S.dropsGot / S.lv.drops.length * 100);
      row[`${type} ${lvl + 1}`] = `${won ? 'WIN' : S.mode === 'play' ? 'stuck' : 'lost'} ${S.deaths}d ${dew}%`;
      S.mode = 'menu';
    }
    out[name] = row;
  }
  return out;
}

const browser = await webkit.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); process.exitCode = 1; });
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await page.goto('file://' + resolve('../index.html'));
console.log('\nBug mode, each cell is result, lives lost, dew collected:');
if (process.env.SWEEP) {
  for (const c of process.env.SWEEP.split(',').map(Number)) {
    const res = await page.evaluate(bugRuns, c);
    const sum = Object.fromEntries(Object.entries(res).map(([k, row]) => { const v = Object.values(row); const dew = v.map((s) => +s.match(/(\d+)%/)[1]); return [k, { wins: v.filter((s) => s.startsWith('WIN')).length + '/12', lives: v.reduce((n, s) => n + +s.match(/(\d)d/)[1], 0), avgDew: Math.round(dew.reduce((a, b) => a + b) / 12) + '%', bestDew: Math.max(...dew) + '%', stuck: v.filter((s) => s.startsWith('stuck')).length }]; }));
    console.log('cruise', c); console.table(sum);
  }
  await browser.close(); process.exit(0);
}
if (!process.env.PLANT_ONLY) console.table(await page.evaluate(bugRuns));
console.log(`\nEndless plant runs, ${SEEDS} seeds each. Waves held, from worst to best, then eaten, minutes of play:`);
console.table(await page.evaluate(playAll, SEEDS));
console.log('\nChance a caught bug breaks free (no armour, full stamina):');
if (!process.env.PLANT_ONLY) console.table(await page.evaluate(odds));
await browser.close();
