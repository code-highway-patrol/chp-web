<h1 align="center">🚦 chp-web</h1>

<p align="center"><i>Marketing site for Code Highway Patrol.</i></p>

<p align="center">
  <a href="https://pinkdonut.work"><b>Live site &rarr; pinkdonut.work</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-F2C94C?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/status-public%20beta-3FB950?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/built%20at-LA%20Hacks%202026-1F6FEB?style=for-the-badge" alt="LA Hacks 2026" />
</p>

###

<p align="center">
  <a href="https://pinkdonut.work">
    <img src=".github/preview.png" alt="Code Highway Patrol landing page" width="900" />
  </a>
</p>

###

<div align="center">
  <img src="https://skillicons.dev/icons?i=ts" height="48" alt="typescript" />
  <img width="10" />
  <img src="https://skillicons.dev/icons?i=react" height="48" alt="react" />
  <img width="10" />
  <img src="https://skillicons.dev/icons?i=vite" height="48" alt="vite" />
  <img width="10" />
  <img src="https://skillicons.dev/icons?i=bun" height="48" alt="bun" />
  <img width="10" />
  <img src="https://skillicons.dev/icons?i=vercel" height="48" alt="vercel" />
</div>

###

## About

The public landing page for [Code Highway Patrol](https://github.com/code-highway-patrol). Single page React app, deployed on Vercel. The cuffs in the hero are real-time ASCII rendered from a 3D torus on canvas; the scroll-pinned scene walks through one full agent turn (draft, block, fix, clean) with hand-drawn arrow annotations.

## How it works

CHP is the patrol; this site explains it. The story the page tells:

1. Your agent starts a turn and writes a diff.
2. CHP intercepts before commit, runs deterministic checks (types, lint, tests, custom rules), and grades the output.
3. Cheap, fast violations get auto-patched. The agent sees the fix in-line.
4. The diff that survives is production-ready and cites every rule that fired.

The page is hand-styled in plain CSS, no UI kit. ASCII art is computed each frame from a torus projection routed through `@chenglou/pretext` for measurement. The scroll scene uses an SVG bezier with `stroke-dasharray` animation to draw arrows live as you scrub through phases.

## Stack

- React 19 + TypeScript
- Vite (dev server, build)
- Bun (package manager, lockfile)
- Cloudinary (`@cloudinary/react`, `@cloudinary/url-gen`)
- Vercel (deploy)

## Quick start

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # tsc -b && vite build
bun run lint     # eslint
```

###

<p align="center">Built at <a href="https://lahacks.com">LA Hacks 2026</a> 🐻</p>
