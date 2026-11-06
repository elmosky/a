# Plant mode

**Status, 2026-11-06:** endless waves on Sunny Bog. This is the design note; `README.md` has the numbers as shipped.
Other landscapes aren't built yet.

## What changed while building it

- **AI bugs walk at 55% of their `BUGS` speed.** At full speed they crossed a flytrap's zone during its 0.5 s warning, so traps almost never caught anything.
- **Plants digest in 55% of the `GRIP` time limit,** and flytraps stay shut for 0.8 s instead of 2.2 s, so one plant can eat often enough to matter.
- **Pitcher pull runs at 80%,** because it competes with the slower walking speed. Bladderwort bursts stay at full strength because they only last 0.45 s.
- **Sundews have a stronger base hold (1.35x),** or bugs almost always escaped them.
- **Plants can hold more than one bug:** sundews, pitchers and bladderworts hold 2, flytraps hold 1.
- **All four plants are available on Sunny Bog,** even though only two grow there on the bug side, so every upgrade path is in play.
- **Time runs at 30% while a plant menu is open,** so reading a menu on a phone doesn't cost you the bog.

Players choose a side on the menu: **Bug** (the current game) or **Plant**, a defend-the-base mode. Real carnivorous
plants grow in nutrient-poor bogs and get their nitrogen from insects, so nutrients are the plant side's currency.

## Core loop

1. A landscape is shown with fixed planting plots (empty soil patches) between the bottom and the top.
2. Waves of AI bugs (ants, beetles, flies, using the existing `BUGS` stats) try to cross from bottom to top.
3. Each bug eaten gives **nutrients**. The player spends them to plant on a plot or upgrade an existing plant.
4. Each bug that reaches the top drains the bog's health (the "castle"). Health at 0 ends the run. The waves never stop, so the score is how many you held.
5. Between waves the player can plant, upgrade, mend or fortify. Healing costs the same nutrients as upgrades, so every repair is an upgrade you didn't buy. Fortifying gives nutrients a use after everything is upgraded.

## Reuse from bug mode

- Plant behaviour (`updatePlant`, `bladderPhase`, `trapOpen`), plant drawing, bug drawing and themes carry over unchanged.
- The struggle mechanic flips: a caught AI bug struggles automatically. Its escape odds come from its stats against the
  plant's grip, so upgrading grip directly reduces escapes. Show its meter so the player can watch it fight.
- AI steering, kept simple: head for the goal and dodge visible threats with an "awareness" stat. Ants are cautious,
  flies are fast but careless, and beetles walk straight through.

## Plant upgrades (in-run, paid with nutrients)

| Plant         | Upgrade path |
|---------------|--------------|
| Venus flytrap | Bigger trigger zone → faster snap → shorter digest (reopens sooner) |
| Sundew        | Wider rosette → stickier (bugs get stuck sooner) → slower bugs inside |
| Pitcher plant | Wider scent pull → stronger pull → wider mouth |
| Bladderwort   | Faster cycle → bigger suction radius → stronger burst |
| All           | **Grip**: makes caught bugs' struggles harder |

## Open questions for the designer

- Settled: fixed plots, and in-run upgrades that reset each run.
- Should there also be permanent unlocks (new species, starting nutrients) bought with a separate currency? Not built.
- Should anything link the two sides? For example, a plant-mode win could unlock a landscape or species in bug mode.
