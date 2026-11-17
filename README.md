# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/genahjasa/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/genahjasa/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

LUMENKEEPER — defend the last lighthouse through ten waves of night in a complete offline arcade survival game: canvas 2D, WebAudio synth sound, blessings drafted between waves, two bosses, and a fixed-step simulation.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=maqpwds7&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

- **Move** with WASD or the arrow keys. **Aim** with the mouse.
- **Hold click or Space** to fire bolts of light.
- **F** unleashes the **nova** once your ember meter is full (embers drop from
  fallen shades) — a blast that clears the dark around you.
- **P** pauses, **M** mutes, **R** restarts after the end.

## The game

Shades march on the lighthouse from the dark sea — drifters, weaving wisps,
stone brutes and spitters that lob gloom orbs. Some hunt you; most chew the
lighthouse itself. Kill them to score, chain kills for a combo multiplier,
and gather their embers.

Clear a wave and the dawn offers a **blessing**: choose one of three
(faster fire, heavier bolts, twin lanterns, piercing rays, a mended heart,
a repaired lighthouse, a stronger nova…). Wave 5 brings the **Gloom
Herald**; wave 10 brings **the Hollow Star**. Fell it, and dawn breaks.

- 10 waves with a rising mix of 4 enemy kinds + 2 bosses
- 10 blessings to draft between waves
- Combo multiplier, best score saved locally
- Particles, screen shake, floating score text, hit flashes
- Synthesized sound effects and a slow ambient music loop
- Title, pause, blessing draft, game-over and victory screens

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with the
vendored `vendor/makefun-game.ts` library, as the best-game-01 kit requires:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game's own code, staged deterministically
with `?shot=title|play|upgrade|win&seed=1` (see `game/src/shots.js` and
`shots.json`).

## License

MIT — see `LICENSE`.
