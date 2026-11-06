// Browser tests at iPhone sizes, using WebKit (the engine iPhones run) and real taps where a player would tap.
// Long stretches of play are fast-forwarded by calling the game's own update loop.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { webkit, devices } from 'playwright';

const root = resolve('..');
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  try { const f = await readFile(root + (path === '/' ? '/index.html' : path)); res.writeHead(200, { 'content-type': types[extname(path || '.html')] || 'text/html' }); res.end(f); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const URL_ = `http://localhost:${server.address().port}/`;

let passed = 0; const failures = [];
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log('  ok  ', name); } else { failures.push(name); console.log('  FAIL', name, detail); } };

const browser = await webkit.launch();
const iphone = devices['iPhone 14'];
async function open(viewport) {
  const ctx = await browser.newContext({ ...iphone, ...(viewport ? { viewport } : {}) });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); });
  await page.goto(URL_);
  return page;
}
const plotXY = (page, i) => page.evaluate((i) => { const { view: v, plots } = S.pm; return [v.ox + plots[i].x * v.s, v.oy + plots[i].y * v.s]; }, i);
const tapPlot = async (page, i) => { const [x, y] = await plotXY(page, i); await page.touchscreen.tap(x, y); await page.waitForTimeout(60); };
async function startPlant(page) {
  await page.tap('#side-plant'); await page.tap('#pmLevelList .level-btn'); await page.tap('#goBtn');
  await page.waitForFunction(() => S.mode === 'plant');
}
// Run the game forward until a condition holds. Returns frames used.
const forward = (page, cond, max = 60 * 240) => page.evaluate(([cond, max]) => {
  const test = new Function('m', `return ${cond}`);
  let n = 0;
  while (S.mode === 'plant' && S.pm && !test(S.pm) && n < max) { pmUpdate(1 / 60); updateFx(1 / 60); n++; }
  return n;
}, [cond, max]);

// ---------------------------------------------------------------- bug mode
console.log('Bug mode (real taps, iPhone 14)');
{
  const page = await open();
  check('menu opens on the bug side with bug picker and landscapes', await page.isVisible('#bugRow') && await page.isVisible('#levelList') && !(await page.isVisible('#plantSide')));
  check('three bugs and four landscapes listed', (await page.locator('#bugRow .bug-card').count()) === 3 && (await page.locator('#levelList .level-btn').count()) === 4);
  await page.tap('#evoOpen'); check('evolve screen opens', await page.isVisible('#evoList')); await page.tap('#evoBack');
  await page.tap('#levelList .level-btn'); await page.tap('#goBtn');
  await page.waitForFunction(() => S.mode === 'play');
  await page.waitForTimeout(100);
  check('stamina bar shows in bug mode', await page.isVisible('#hudStam'));
  const y0 = await page.evaluate(() => S.bug.y);
  // Touch drag on the canvas, as a thumb would
  await page.evaluate(() => {
    const c = document.getElementById('game'), ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    ev('pointerdown', 200, 600); ev('pointermove', 200, 520);
  });
  await page.waitForTimeout(900);
  const y1 = await page.evaluate(() => S.bug.y);
  await page.evaluate(() => document.getElementById('game').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })));
  check('dragging moves the bug up the map', y1 < y0 - 40, `${y0} -> ${y1}`);
  const walk = await page.evaluate(() => {
    const run = (x, y) => { input.active = true; input.x = x; input.y = y; const a = S.bug.y, ax = S.bug.x; S.bug.inv = 9; for (let i = 0; i < 30; i++) update(1 / 60); const r = [a - S.bug.y, S.bug.x - ax]; input.active = false; input.x = input.y = 0; return r; };
    const keep = S.lv.plants; S.lv.plants = []; S.bug.y = S.lv.startY; S.bug.x = 200;
    const none = run(0, 0)[0], fast = run(0, -1)[0], slow = run(0, 1)[0], side = run(1, 0);
    S.lv.plants = keep; S.bug.inv = 0; S.bug.y = S.lv.startY; S.bug.x = 200;
    return { none, fast, slow, sideX: side[1], speed: BUGS.ant.speed };
  });
  check('with no input the bug keeps walking forward', walk.none > 25, JSON.stringify(walk));
  check('pushing up is faster, pulling down is slower but never stops', walk.fast > walk.none && walk.slow > 0 && walk.slow < walk.none * 0.6, JSON.stringify(walk));
  check('dragging sideways steers', walk.sideX > 25, JSON.stringify(walk));
  const thumb = await page.evaluate(() => {
    const ev = (t, x, y, id) => document.getElementById('game').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    const keep = S.lv.plants, res = {};
    S.lv.plants = [makePlant('flytrap', 200, S.bug.y - 300, rng(1))];
    ev('pointerdown', 195, 560, 3); ev('pointermove', 250, 560, 3);
    catchBug(S.lv.plants[0]); ev('pointermove', 140, 560, 3);          // same thumb, still down, now pushing left
    S.struggle.prog = 0.99; ev('pointerdown', 100, 500, 4); ev('pointerup', 100, 500, 4);
    for (let i = 0; i < 4; i++) update(1 / 60);
    res.free = !S.struggle; S.bug.inv = 9; for (let i = 0; i < 40; i++) update(1 / 60);
    res.vx = S.bug.vx; res.live = input.active; ev('pointerup', 140, 560, 3);
    // A finger that lands the last tap and stays down steers too
    catchBug(S.lv.plants[0]); S.struggle.prog = 0.99; ev('pointerdown', 195, 560, 6); ev('pointermove', 250, 560, 6);
    for (let i = 0; i < 4; i++) update(1 / 60);
    S.bug.inv = 9; for (let i = 0; i < 40; i++) update(1 / 60);
    res.tapVx = S.bug.vx; ev('pointerup', 250, 560, 6);
    S.lv.plants = keep; S.bug.inv = 0; S.bug.y = S.lv.startY; S.bug.x = 200; S.bug.vx = 0;
    return res;
  });
  check('a thumb held through a struggle steers as soon as you are free', thumb.free && thumb.live && thumb.vx < -40, JSON.stringify(thumb));
  check('a finger left down after the last tap steers too', thumb.tapVx > 40, JSON.stringify(thumb));
  const walls = await page.evaluate(() => LEVELS.map((L, i) => { const lv = buildLevel(i); return [lv.plants.filter((p) => p.x < 40).length, lv.plants.filter((p) => p.x > 360).length]; }));
  check('every landscape has plants on both walls', walls.every(([l, r]) => l >= 2 && r >= 2), JSON.stringify(walls));
  await page.tap('#pauseBtn'); check('pause works', await page.isVisible('#pause'));
  await page.tap('#resumeBtn'); check('resume returns to play', (await page.evaluate(() => S.mode)) === 'play');
  await page.evaluate(() => { const p = S.lv.plants.find((q) => q.type === 'flytrap'); catchBug(p); });
  await page.touchscreen.tap(200, 500);
  check('getting caught starts the tap struggle, and taps fill the meter', await page.evaluate(() => !!S.struggle && S.struggle.prog > 0));
  await page.evaluate(() => endLevel(true));
  check('finishing a landscape shows the result screen', (await page.textContent('#resTitle')) === 'Made it across!');
  await page.tap('#resMenu');
  check('no page errors in bug mode', page.errs.length === 0, page.errs.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- placing and upgrading
console.log('Plant mode: placing and upgrading (real taps, iPhone 14)');
{
  const page = await open();
  await startPlant(page);
  const nut = () => page.evaluate(() => S.pm.nutrients);
  const start = await nut();
  await tapPlot(page, 2);
  check('tapping an empty plot opens the plant picker with 4 plants', await page.isVisible('#pmSheet') && (await page.locator('.pm-card').count()) === 4);
  const [, py] = await plotXY(page, 2), box = await page.locator('#pmSheet').boundingBox();
  check('picker does not cover the plot you tapped', py < box.y || py > box.y + box.height, `plot y ${py}, sheet ${box.y}-${box.y + box.height}`);
  const t = await page.evaluate(() => { const a = S.time; pmUpdate(0.1); return S.time - a; });
  check('time slows while a menu is open', Math.abs(t - 0.1 * 0.3) < 1e-9, t);
  await page.tap('#pm-flytrap');
  check('flytrap planted and paid for', await page.evaluate(() => S.pm.plots[2].plant?.type === 'flytrap') && (await nut()) === start - 50);
  check('picker closes after planting', !(await page.isVisible('#pmSheet')));
  await page.touchscreen.tap(195, 800 - 90); await page.waitForTimeout(50);
  await tapPlot(page, 2);
  check('tapping a plant opens its upgrades', (await page.textContent('#pmSheetTitle')) === 'Venus flytrap' && (await page.textContent('#pmSheetBody')).includes('Bigger trigger zone'));
  await page.locator('#pmSheetBody .evo-row button').first().tap();
  check('upgrade 1 paid for and applied', await page.evaluate(() => S.pm.plots[2].plant.trig === 84 && S.pm.plots[2].plant.lvl === 1) && (await nut()) === start - 90);
  check('next upgrade in the path is offered', (await page.textContent('#pmSheetBody')).includes('Faster snap'));
  await page.locator('#pmSheetBody .evo-row button').nth(1).tap();
  check('Grip bought once, shared by all plants', await page.evaluate(() => S.pm.grip === 1) && (await nut()) === start - 135);
  const disabled = await page.locator('#pmSheetBody .evo-row button').first().isDisabled();
  check('upgrades you cannot afford are disabled', disabled === (await nut()) < 60);
  await page.tap('#pmClose');
  await page.evaluate(() => { S.pm.nutrients = 0; });
  await tapPlot(page, 0);
  const sold = await page.locator('.pm-card:disabled').count();
  await page.locator('#pm-sundew').tap({ force: true }).catch(() => {});
  check('with no nutrients, plants are disabled and nothing gets planted', sold === 4 && await page.evaluate(() => !S.pm.plots[0].plant));
  await page.tap('#pmClose');

  console.log('Plant mode: every plant and every upgrade');
  const all = await page.evaluate(() => {
    const res = [];
    const m = S.pm; m.nutrients = 99999;
    Object.keys(PM_PLANTS).forEach((type, i) => {
      const plot = m.plots[[0, 1, 3, 4][i]];
      pmPlant(plot, type);
      const p = plot.plant, before = JSON.stringify(p);
      for (let u = 0; u < 3; u++) {
        const was = JSON.stringify(p), lvl = p.lvl;
        pmUpgrade(plot); pmCloseSheet();
        if (p.lvl !== lvl + 1 || JSON.stringify(p) === was) res.push(`${type} upgrade ${u} did nothing`);
      }
      const n = m.nutrients; pmUpgrade(plot); pmCloseSheet();
      if (m.nutrients !== n || p.lvl !== 3) res.push(`${type} went past its last upgrade`);
    });
    for (let f = 0; f < 240; f++) { pmUpdate(1 / 60); pmRender(); }
    return res;
  });
  check('all 12 upgrades change their plant, and none can be bought twice', all.length === 0, all.join(', '));

  await page.tap('#pauseBtn'); check('pause works in plant mode', await page.isVisible('#pause'));
  await page.tap('#restartBtn'); await page.tap('#goBtn');
  check('upgrades and plants reset on a new run', await page.evaluate(() => S.pm.grip === 0 && S.pm.lv.plants.length === 0 && S.pm.plots.every((p) => !p.plant) && S.pm.nutrients === PM_LEVELS[0].nutrients));
  check('no page errors', page.errs.length === 0, page.errs.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- eating, escaping, shells
console.log('Plant mode: eating, escaping, beetle shells');
{
  const page = await open();
  await startPlant(page);
  await tapPlot(page, 2); await page.tap('#pm-flytrap');
  const unstuck = await page.evaluate(() => {
    // The exact trap from the playtest: a beetle on the edge of a wide sundew, with an upgraded pitcher behind it
    const m = S.pm, keepPlants = m.lv.plants, keep = { n: m.nutrients };
    const sun = Object.assign(makePlant('sundew', 105, 225, rng(1)), { held: [], cap: 2, r: 72, pop: 0, digest: PM.digest });
    const pit = Object.assign(makePlant('pitcher', 90, 425, rng(1)), { held: [], cap: 2, pull: 135, force: 1.7, pop: 0, digest: PM.digest });
    m.lv.plants = [sun, pit]; pmSpawn('beetle'); const b = m.bugs[0]; Object.assign(b, { x: 93, y: 299.5, armor: 0 });
    let f = 0; while (m.bugs.includes(b) && !b.gone && !b.st && f < 60 * 30) { pmUpdate(1 / 60); f++; }
    const r = { secs: +(f / 60).toFixed(1), freed: !m.bugs.includes(b) || !!b.gone || !!b.st, y: Math.round(b.y) };
    m.bugs = []; m.lv.plants = keepPlants; m.hp = m.C.hp; m.leaked = 0; m.eaten = 0; m.nutrients = keep.n; S.texts = []; S.particles = [];
    return r;
  });
  check('a bug pinned between a sundew and a pitcher gets free', unstuck.freed && unstuck.secs < 25, JSON.stringify(unstuck));
  await page.tap('#pmWave');
  await page.waitForTimeout(100);
  check('wave button starts the wave and hides itself', await page.evaluate(() => S.pm.active) && !(await page.isVisible('#pmWave')));
  await page.evaluate(() => { const m = S.pm; m.queue = []; m.bugs = []; pmSpawn('ant'); Object.assign(m.bugs[0], { x: 200, y: 590 }); m.R = () => 0.99; });
  // m.R 0.99 means the slowest struggle this run allows, so this ant should be digested
  const before = await page.evaluate(() => S.pm.nutrients);
  await forward(page, "m.bugs.some((b) => b.st)");
  const held = await page.evaluate(() => ({ state: S.pm.plots[2].plant.state, held: S.pm.plots[2].plant.held.length }));
  check('flytrap senses, snaps and holds the ant', held.held === 1, JSON.stringify(held));
  await page.evaluate(() => { const b = S.pm.bugs[0]; b.st.t = 0.2; b.st.prog = 0.6; S.pm.shake = 0; pmRender(); });
  const ring = await page.evaluate(() => {
    const b = S.pm.bugs[0], v = S.pm.view, x = (v.ox + b.st.hx * v.s) * dpr, y = (v.oy + b.st.hy * v.s) * dpr, R = 24 * v.s * dpr;
    const d = ctx.getImageData(Math.round(x + R), Math.round(y), 1, 1).data;   // 3 o'clock on the ring: inside the 60% arc
    return [...d.slice(0, 3)];
  });
  check('escape meter is drawn on the caught bug (yellow pixel on the ring)', ring[0] > 200 && ring[1] > 150 && ring[2] < 130, ring.join(','));
  await page.evaluate(() => { const b = S.pm.bugs[0]; b.stam = 0; });   // an exhausted bug can't struggle, so this one gets eaten
  await forward(page, 'm.eaten === 1');
  check('digested ant counts as eaten and pays nutrients', await page.evaluate((n) => S.pm.eaten === 1 && S.pm.nutrients === n + AI.ant.bounty && S.pm.plots[2].plant.held.length === 0, before));
  await forward(page, "m.plots[2].plant.state === 'open'");
  check('flytrap reopens after eating', await page.evaluate(() => S.pm.plots[2].plant.state === 'open'));

  await page.evaluate(() => { const m = S.pm; m.R = rng(3); pmSpawn('ant'); const b = m.bugs[m.bugs.length - 1]; Object.assign(b, { x: 200, y: 590 }); });
  await forward(page, 'm.bugs.some((b) => b.st)');
  await page.evaluate(() => { S.pm.bugs.find((b) => b.st).st.rate = 40; });   // a frantic bug fills the meter for certain
  await forward(page, 'm.escapes === 1');
  const esc = await page.evaluate(() => ({ escapes: S.pm.escapes, held: S.pm.plots[2].plant.held.length, state: S.pm.plots[2].plant.state, inv: S.pm.bugs[0]?.inv, text: S.texts.some((t) => t.text === 'Broke free!'), free: !S.pm.bugs[0]?.st }));
  check('a bug that fills its meter breaks free and the trap opens', esc.escapes === 1 && esc.held === 0 && esc.state === 'opening' && esc.free && esc.inv > 0 && esc.text, JSON.stringify(esc));
  const left = await forward(page, 'm.bugs.length === 0');
  check('the escaped bug carries on and reaches the top', await page.evaluate(() => S.pm.leaked === 1 && S.pm.hp === S.pm.C.hp - 1), `frames ${left}`);

  await page.evaluate(() => {
    const m = S.pm; m.queue = [{ t: 9e9, type: 'ant' }];   // keeps the wave open for this check
    pmSpawn('beetle'); Object.assign(m.bugs[m.bugs.length - 1], { x: 200, y: 590 });
  });
  await forward(page, 'm.bugs[0] && m.bugs[0].armor === 0');
  const sh = await page.evaluate(() => { const b = S.pm.bugs[0]; return { armor: b.armor, caught: !!b.st, inv: b.inv > 0 }; });
  check('a beetle shrugs off its first bite', sh.armor === 0 && !sh.caught && sh.inv, JSON.stringify(sh));
  check('no page errors', page.errs.length === 0, page.errs.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- win and loss
console.log('Plant mode: win and loss');
{
  const page = await open();
  await startPlant(page);
  for (let w = 0; w < 3 && (await page.evaluate(() => S.mode)) === 'plant'; w++) {
    await page.waitForTimeout(100);
    await page.tap('#pmWave');
    await forward(page, '!m.active');
  }
  await page.waitForTimeout(100);
  check('with no plants the bog falls', (await page.textContent('#resTitle')) === 'The bog was overrun.' && await page.isVisible('#result'), await page.textContent('#resTitle'));
  check('loss screen has no Next button and hides the wave bar', !(await page.isVisible('#resNext')) && !(await page.isVisible('#pmBar')));
  await page.tap('#resRetry'); await page.tap('#goBtn');
  check('Retry starts a fresh run', await page.evaluate(() => S.mode === 'plant' && S.pm.hp === S.pm.C.hp && S.pm.wave === 0));
  await page.evaluate(() => { const m = S.pm; m.nutrients = 99999; m.plots.forEach((pl, i) => pmPlant(pl, ['flytrap', 'sundew', 'pitcher', 'bladder'][i % 4])); m.plots.forEach((pl) => { for (let k = 0; k < 3; k++) { pmUpgrade(pl); pmCloseSheet(); } }); });
  for (let w = 1; w <= 3; w++) {
    const label = await page.textContent('#pmWave').catch(() => '');
    await page.waitForFunction(() => !S.pm.active && document.getElementById('pmWave').offsetParent !== null, null, { timeout: 2000 });
    check(`wave ${w} button shows its bugs`, (await page.textContent('#pmWave')).startsWith(`Start wave ${w} ·`), label);
    await page.tap('#pmWave');
    await forward(page, `!m.active || m.hp <= 0`);
    await page.waitForTimeout(60);
  }
  check('surviving wave 3 wins', (await page.textContent('#resTitle')) === 'The bog held!', await page.textContent('#resTitle'));
  console.log('      ', await page.textContent('#resText'), '|', await page.textContent('#resPoints'));
  await page.tap('#resMenu');
  await page.tap('#side-bug'); await page.tap('#levelList .level-btn'); await page.tap('#goBtn');
  await page.waitForFunction(() => S.mode === 'play');
  await page.waitForTimeout(300);
  check('bug mode still starts cleanly after a plant run', await page.evaluate(() => S.pm === null) && await page.isVisible('#hudStam') && !(await page.isVisible('#pmBar')));
  check('no page errors', page.errs.length === 0, page.errs.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- screen sizes
console.log('Layout at phone sizes');
for (const [name, viewport] of [['iPhone 14', { width: 390, height: 844 }], ['iPhone 14 in Safari', { width: 390, height: 664 }], ['iPhone SE', { width: 375, height: 667 }], ['iPhone SE in Safari', { width: 375, height: 553 }], ['small', { width: 320, height: 568 }]]) {
  const page = await open(viewport);
  await page.tap('#side-plant');
  const last = page.locator('#pmLevelList .level-btn');
  await last.scrollIntoViewIfNeeded();
  await last.tap(); await page.tap('#goBtn');
  await page.waitForFunction(() => S.mode === 'plant');
  await page.waitForTimeout(100);
  const L = await page.evaluate(() => {
    const m = S.pm, v = m.view, top = document.getElementById('hud').getBoundingClientRect().bottom, bot = document.getElementById('pmBar').getBoundingClientRect().top;
    const ys = m.plots.map((p) => v.oy + p.y * v.s), xs = m.plots.map((p) => v.ox + p.x * v.s), rx = 34 * v.s, ry = 26 * v.s;
    return { top, bot, s: v.s, minY: Math.min(...ys) - ry, maxY: Math.max(...ys) + ry, minX: Math.min(...xs) - rx, maxX: Math.max(...xs) + rx,
      tap: 2 * PM.tapR * v.s, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, w: innerWidth };
  });
  check(`${name}: all plots sit between the HUD and the bottom bar`, L.minY >= L.top && L.maxY <= L.bot && L.minX >= 0 && L.maxX <= L.w, JSON.stringify(L));
  check(`${name}: tap target ${Math.round(L.tap)}px is at least 44px`, L.tap >= 44);
  check(`${name}: no sideways overflow`, L.overflow === 0, L.overflow);
  for (const i of [0, 7]) {
    await tapPlot(page, i);
    const b = await page.locator('#pmSheet').boundingBox(), [, y] = await plotXY(page, i), h = (await page.locator('.pm-card').first().boundingBox()).height;
    check(`${name}: picker fits on screen, clear of plot ${i}, buttons ${Math.round(h)}px tall`, b.y >= 0 && b.y + b.height <= viewport.height && (y < b.y || y > b.y + b.height) && h >= 48, JSON.stringify({ b, y }));
    await page.tap('#pmClose');
  }
  await tapPlot(page, 6); await page.tap('#pm-flytrap'); await tapPlot(page, 6);
  const ub = await page.locator('#pmSheet').boundingBox(), bh = (await page.locator('#pmSheetBody .evo-row button').first().boundingBox()).height;
  check(`${name}: upgrade sheet fits, buttons ${Math.round(bh)}px tall`, ub.y >= 0 && ub.y + ub.height <= viewport.height && bh >= 48, JSON.stringify(ub));
  await page.screenshot({ path: `out/size-${viewport.width}x${viewport.height}.png` });
  check(`${name}: no page errors`, page.errs.length === 0, page.errs.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- desktop stage
console.log('Desktop stage (mouse and keyboard, 1280x800)');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  await page.goto(URL_);
  await page.click('#side-plant'); await page.click('#pmLevelList .level-btn'); await page.click('#goBtn');
  await page.waitForFunction(() => S.mode === 'plant');
  await page.waitForTimeout(120);
  check('shop and status panels show, phone HUD and bar do not', await page.isVisible('#pmShop') && await page.isVisible('#pmRun') && !(await page.isVisible('#hud')) && !(await page.isVisible('#pmBar')));
  const box = await page.evaluate(() => {
    const m = S.pm, r = (id) => document.getElementById(id).getBoundingClientRect(), f = m.view.frame;
    return { shopRight: r('pmShop').right, runLeft: r('pmRun').left, runBottom: r('pmRun').bottom, frame: f, h: innerHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      plotsIn: m.plots.every((p) => { const y = m.view.oy + p.y * m.view.s; return y - 26 * m.view.s > f.y && y + 26 * m.view.s < f.y + f.h; }) };
  });
  check('panels sit beside the bog without touching it', box.shopRight < box.frame.x && box.runLeft > box.frame.x + box.frame.w && box.runBottom <= box.h, JSON.stringify(box));
  check('all plots fit inside the framed bog, no overflow', box.plotsIn && box.over === 0, JSON.stringify(box));
  await page.keyboard.press('1');
  check('pressing 1 picks the flytrap in the shop', await page.evaluate(() => S.pm.armed === 'flytrap' && document.getElementById('shop-flytrap').classList.contains('armed')));
  const at = (i) => plotXY(page, i);
  let [x, y] = await at(2);
  await page.mouse.move(x, y); await page.waitForTimeout(40);
  check('hovering a plot with a plant picked targets it', await page.evaluate(() => S.pm.hover === S.pm.plots[2]));
  await page.mouse.click(x, y); await page.waitForTimeout(40);
  [x, y] = await at(3); await page.mouse.click(x, y); await page.waitForTimeout(40);
  check('clicking plots plants without opening a menu, and stays picked', await page.evaluate(() => S.pm.plots[2].plant?.type === 'flytrap' && S.pm.plots[3].plant?.type === 'flytrap' && S.pm.armed === 'flytrap' && !S.pm.sel));
  await page.evaluate(() => { S.pm.nutrients = 10; });
  [x, y] = await at(4); await page.mouse.click(x, y); await page.waitForTimeout(40);
  check('with too few nutrients nothing is planted', await page.evaluate(() => !S.pm.plots[4].plant && S.pm.nutrients === 10));
  await page.waitForTimeout(60);
  check('shop rows you cannot afford are disabled', await page.isDisabled('#shop-flytrap'));
  await page.evaluate(() => { S.pm.nutrients = 300; });
  await page.keyboard.press('1');
  check('pressing 1 again puts it down', await page.evaluate(() => S.pm.armed === null));
  [x, y] = await at(2); await page.mouse.click(x, y); await page.waitForTimeout(120);
  check('clicking a plant opens its upgrades', (await page.textContent('#pmSheetBody')).includes('Bigger trigger zone'));
  const sb = await page.locator('#pmSheet').boundingBox();
  check('upgrade menu stays out of the bog', sb.x >= box.frame.x + box.frame.w && sb.y + sb.height <= 800, JSON.stringify(sb));
  await page.click('#pmClose');
  await page.click('#shop-sundew');
  check('clicking the shop picks a plant too', await page.evaluate(() => S.pm.armed === 'sundew'));
  await page.click('#pmWave2'); await page.waitForTimeout(100);
  check('wave starts from the side panel', await page.evaluate(() => S.pm.active) && await page.isDisabled('#pmWave2'));
  await page.click('#pmSpeed');
  await page.waitForTimeout(100);
  const spd = await page.evaluate(async () => {
    const m = S.pm, count = (n) => new Promise((done) => { const a = m.t; let f = 0; const tick = () => (++f === n ? done(m.t - a) : requestAnimationFrame(tick)); requestAnimationFrame(tick); });
    const fast = await count(30); m.speed = 1; const slow = await count(30); m.speed = 2;
    return { ratio: fast / slow };
  });
  await page.waitForTimeout(100);
  check('speed button really runs the game twice as fast', Math.abs(spd.ratio - 2) < 0.35 && (await page.textContent('#pmSpeed')) === 'Speed 1x', JSON.stringify(spd));
  await page.click('#pmPause'); check('pause works from the panel', await page.isVisible('#pause'));
  await page.click('#quitBtn');
  check('leaving plant mode removes the panels', !(await page.isVisible('#pmShop')) && !(await page.isVisible('#pmRun')));
  await page.click('#side-bug'); await page.click('#levelList .level-btn'); await page.click('#goBtn');
  await page.waitForTimeout(200);
  check('bug mode HUD is back after desktop plant mode', await page.isVisible('#hud') && await page.isVisible('#hudStam'));
  check('no page errors', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}

// ---------------------------------------------------------------- calm mode
console.log('Reduced motion');
{
  const ctx = await browser.newContext({ ...iphone, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  await page.goto(URL_);
  await startPlant(page);
  const r = await page.evaluate(() => {
    const m = S.pm; m.nutrients = 500; pmPlant(m.plots[2], 'flytrap');
    pmStartWave(); m.queue = []; pmSpawn('ant'); Object.assign(m.bugs[0], { x: 200, y: 590 });
    let flies = 0, n = 0;
    while (m.eaten + m.escapes === 0 && n++ < 3000) { pmUpdate(1 / 60); flies = Math.max(flies, m.flies.length); }
    return { flies, calm: CALM };
  });
  check('with reduced motion on, no flying specks', r.calm && r.flies === 0, JSON.stringify(r));
  check('no page errors', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1); }
