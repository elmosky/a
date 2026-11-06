// Proves bug mode's rules are intact: with auto-walk and wall plants switched off, it plays exactly as it did before
// plant mode existed. It compares game state, not pixels, because the storybook art changed the look on purpose.
// Runs the same scripted play through the original index.html (from git) and the current one, with
// randomness and the clock pinned, and compares a hash of the full game state on every frame.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { webkit } from 'playwright';

const BASE_COMMIT = '908931f';   // last commit before plant mode
mkdirSync('out', { recursive: true });
const repo = resolve('..');
const oldPath = resolve('out/baseline.html');
writeFileSync(oldPath, execSync(`git -C ${repo} show ${BASE_COMMIT}:index.html`));

function trace() {
  const hash = (s, h = 2166136261) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const out = {};
  for (const bugType of ['ant', 'beetle', 'fly']) for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    S.bugType = bugType; save.unlocked = 4;
    if (typeof WALK !== 'undefined') WALK.cruise = 0;
    if (typeof WALLS !== 'undefined') WALLS.on = false;
    let seed = lvl * 31 + bugType.length;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    startLevel(lvl); beginPlay();
    const R = rng(1000 + lvl);
    let h = hash(JSON.stringify(S.lv)), frames = 0, caughts = 0, steer = [0, -1];
    for (; frames < 7000 && S.mode === 'play'; frames++) {
      if (frames % 40 === 0) { steer = [(R() - 0.5) * 1.6, -0.5 - R() * 0.5]; const l = Math.max(1, Math.hypot(...steer)); steer = steer.map((v) => v / l); }
      input.active = true; input.x = steer[0]; input.y = steer[1];
      if (S.struggle) { caughts += S.struggle.t === 0 ? 1 : 0; if (frames % 6 === 0) struggleTap(); }
      update(1 / 60); updateFx(1 / 60);
      const b = S.bug;
      h = hash(JSON.stringify([b.x, b.y, b.vx, b.vy, b.stam, b.stick, b.inv, b.armor, S.lives, S.deaths, S.dropsGot, S.camY, S.cpReached,
        S.struggle && S.struggle.prog, S.caughtT, S.lv.plants.map((p) => [p.state, p.t, p.curl])]), h);
    }
    input.active = false; input.x = input.y = 0;
    out[`${bugType}/${lvl}`] = { h, frames, caughts, mode: S.mode, lives: S.lives, points: save.points };
  }
  return out;
}

const browser = await webkit.launch();
async function run(path) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + path);
  const res = await page.evaluate(trace);
  await ctx.close();
  return { res, errors };
}
const a = await run(oldPath), b = await run(resolve('../index.html'));
await browser.close();

let bad = a.errors.length + b.errors.length;
if (bad) console.log('page errors', a.errors, b.errors);
for (const k of Object.keys(a.res)) {
  const same = JSON.stringify(a.res[k]) === JSON.stringify(b.res[k]);
  if (!same) bad++;
  console.log(same ? 'same' : 'DIFF', k, JSON.stringify(b.res[k]), same ? '' : 'was ' + JSON.stringify(a.res[k]));
}
console.log(bad ? `FAIL: ${bad} differences` : `PASS: all ${Object.keys(a.res).length} scripted runs identical to ${BASE_COMMIT}`);
process.exit(bad ? 1 : 0);
