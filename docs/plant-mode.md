# Plant mode (planned, not built)

Players choose a side on the menu: **Bug** (the current game) or **Plant**, a defend-the-base mode. Real carnivorous
plants grow in nutrient-poor bogs and get their nitrogen from insects, so nutrients are the plant side's currency.

## Core loop

1. A landscape is shown with fixed planting plots (empty soil patches) between the bottom and the top.
2. Waves of AI bugs (ants, beetles, flies, using the existing `BUGS` stats) try to cross from bottom to top.
3. Each bug eaten gives **nutrients**. The player spends them to plant on a plot or upgrade an existing plant.
4. Each bug that reaches the top drains the bog's health (the "castle"). Health at 0 means a loss. Survive all waves to win.

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

- Fixed plots or free placement? Fixed plots are recommended first, because they are easier to balance and to use on a phone.
- Should plant upgrades carry over between runs, like bug evolution? Recommended: in-run upgrades, plus permanent
  unlocks (new species, starting nutrients) bought with a separate currency.
- Should anything link the two sides? For example, a plant-mode win could unlock a landscape or species in bug mode.
