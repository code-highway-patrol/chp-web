# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@.claude/rules/cloudinary-patterns.md

## What this is

`chp-web` is **Code Highway Patrol** (CHP) — a hackathon entry built on Cloudinary's React AI Starter Kit. The product premise: AI-generated *media* (images, video, marketing assets) ships with the same problems as AI-generated code — half-baked compositions, watermark artifacts, "AI tells," over-decorated output. CHP patrols and cleans it.

Because CHP exists to enforce production-readiness, **this codebase must be exemplary**. Treat every change as a representative sample of what CHP-supervised work looks like.

## Stack

- React 19 + TypeScript (Vite, not Next.js — required by the hackathon starter)
- `@cloudinary/react` (`AdvancedImage`, `placeholder`, `lazyload`)
- `@cloudinary/url-gen` for transformation URLs
- Cloudinary Upload Widget (browser-side, unsigned)
- Bun (runtime + package manager + lockfile)
- Deployed on Vercel

`src/` is the React root. `src/cloudinary/` holds the Cloudinary instance config and the upload widget; treat that directory as the integration boundary. Use the exported `cld` from `src/cloudinary/config.ts` everywhere — never instantiate a second `Cloudinary({...})`.

## Commands

```bash
bun install            # install deps (use bun, not npm/pnpm — bun.lock is canonical)
bun run dev            # vite dev server (default http://localhost:5173)
bun run build          # tsc -b && vite build (must pass before merge)
bun run lint           # eslint
bun run preview        # vite preview the production build
```

There is no test runner configured. If you add one, use Vitest — it's the natural fit for a Vite project.

## Environment

- `VITE_CLOUDINARY_CLOUD_NAME` (required) — set in `.env` at scaffold time, gitignored.
- `VITE_CLOUDINARY_UPLOAD_PRESET` (required for uploads) — name of an **unsigned** preset created in the Cloudinary console.
- Vite only exposes vars prefixed `VITE_` to client code. Don't put secrets in there. Server-side signing (if we add it) lives under `server/.env`, which is also gitignored.
- All Cloudinary patterns and gotchas live in `.claude/rules/cloudinary-patterns.md` — that file is imported into this CLAUDE.md and authoritative.

## House rules for AI contributors

These are non-negotiable. They exist because the product itself is about enforcing them.

### No decoration

- **No emoji** in source, copy, comments, or commit messages we author. The starter ships with some emoji in `src/App.tsx`; when we replace that view with the CHP UI, strip them.
- **No ASCII art, no banner comments, no horizontal rules** made of `=`/`-`/`*`.
- **No "AI signature" tells**: don't write "Certainly!", "I've added...", "Here's a clean implementation of...". The diff speaks for itself.

### No speculative code

- Don't add abstractions, generics, or config knobs for hypothetical future requirements. Three similar lines beats a premature factory.
- Don't add error handling for paths that can't happen. Trust framework guarantees; only validate at real boundaries (user input, network, fs).
- Don't add fallbacks ("just in case"), feature flags, or backwards-compat shims unless something actually needs them.
- No half-finished implementations. If a feature isn't done, don't ship a stub of it.

### No noise comments

Default to **zero comments**. Add one only when the *why* is non-obvious — a hidden constraint, a workaround for a known bug, a subtle invariant. If a future reader could delete the comment without losing information, it shouldn't be there.

The starter scaffold ships with explanatory comments inside `App.tsx` and `UploadWidget.tsx`; these are fine as scaffold pedagogy but must be deleted when we replace those files with real CHP code.

Banned comment styles:
- `// added X` / `// removed Y` / `// TODO: refactor later`
- Restating what the code obviously does
- Referencing the task that prompted the change ("for the landing page redo")
- Multi-line docstrings on small internal functions

### Copy and content

- Sentence case for headings, not Title Case.
- No exclamation points in body copy. One per page max in a CTA, and only if it's earned.
- No "Lorem ipsum" left in committed code — if you need a placeholder, make it intentional and obvious.

### Components and styling

- Single-page app. Routing is unnecessary unless we explicitly add it (we won't for the hackathon).
- Co-locate components with their consumer until reuse is real. Don't pre-emptively make a `components/` folder.
- Accessibility is a hard requirement, not a polish step: semantic HTML, alt text, focus states, contrast.
- Respect `prefers-color-scheme`. Don't ship a light-only or dark-only site.

### Cloudinary specifics

- Always use the shared `cld` from `src/cloudinary/config.ts`.
- For images, prefer `<AdvancedImage>` from `@cloudinary/react` with `placeholder({ mode: 'blur' })` and `lazyload()` plugins — that's the production path.
- For uploads, the existing `UploadWidget` covers unsigned uploads. Don't reinvent it. If we need signed uploads, add a `server/` Express endpoint per the patterns file, never expose the API secret to the browser.
- For transformations, follow the import paths in `.claude/rules/cloudinary-patterns.md` exactly. The `@cloudinary/url-gen` API has non-obvious module locations (`text`/`image` overlays come from `qualifiers/source`, not `actions/overlay`); guessing breaks the build.

### Dependencies

- Justify every new dependency in the commit body. If it replaces 30 lines of trivial code, don't add it.
- Don't add a UI kit unless we hit a wall with handwritten styles. The starter's `App.css` is plenty for the hackathon.

## Commits

Match the existing style (currently minimal — `Initial Commit`, `Add README`, `Initial scaffold`, etc.). Keep subjects under 60 chars, imperative mood, no emoji, no scope prefixes (`feat:`, `chore:`) unless the convention is added later by a human.

Never `--no-verify`. If a hook fails, fix the underlying issue.

## What to do when unsure

If a request would force you to violate any rule above, push back in plain text before writing the code. Better to ask one clarifying question than to ship a diff that has to be reverted.
