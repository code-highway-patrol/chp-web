# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`chp-web` is the marketing site for **Code Highway Patrol** (CHP) — a system that enforces production-grade conventions on AI-generated code. This repo is the public-facing landing site, deployed on Vercel.

Because CHP exists to keep AI output production-ready, **this codebase must be exemplary**. Treat every change as a representative sample of what CHP-supervised code looks like.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Bun (runtime + package manager + lockfile)
- Deployed on Vercel

`src/app/` is the App Router root. There is no `pages/` directory; do not create one.

## Commands

```bash
bun install            # install deps (use bun, not npm/pnpm — bun.lock is canonical)
bun run dev            # local dev server at http://localhost:3000
bun run build          # production build (must pass before merge)
bun run lint           # eslint
bunx tsc --noEmit      # typecheck
```

There is no test runner configured yet. If you add one, use `bun test` (Vitest is fine if Bun's runner doesn't fit).

## House rules for AI contributors

These are non-negotiable. They exist because the product itself is about enforcing them.

### No decoration

- **No emoji** in source, copy, comments, or commit messages. Not even one. Marketing copy stays text-only.
- **No ASCII art, no banner comments, no horizontal rules** made of `=`/`-`/`*`.
- **No "AI signature" tells**: don't write "Certainly!", "I've added...", "Here's a clean implementation of...". The diff speaks for itself.

### No speculative code

- Don't add abstractions, generics, or config knobs for hypothetical future requirements. Three similar lines beats a premature factory.
- Don't add error handling for paths that can't happen. Trust framework guarantees; only validate at real boundaries (user input, network, fs).
- Don't add fallbacks ("just in case"), feature flags, or backwards-compat shims unless something actually needs them.
- No half-finished implementations. If a feature isn't done, don't ship a stub of it.

### No noise comments

Default to **zero comments**. Add one only when the *why* is non-obvious — a hidden constraint, a workaround for a known bug, a subtle invariant. If a future reader could delete the comment without losing information, it shouldn't be there.

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

- Use Tailwind utility classes; do not author CSS files except `globals.css`.
- Co-locate components under `src/app/` for route-scoped UI, or `src/components/` for shared. Don't make a `components/` until you have a second usage.
- Prefer Server Components by default. Add `"use client"` only when you actually need state, effects, or browser APIs.
- Accessibility is a hard requirement, not a polish step: semantic HTML, alt text, focus states, contrast.
- Respect `prefers-color-scheme`. Don't ship a light-only or dark-only site.

### Dependencies

- Justify every new dependency in the commit body. If it replaces 30 lines of trivial code, don't add it.
- No UI kits beyond Tailwind + shadcn/ui (when added). No Material, no Chakra, no Bootstrap.

## Commits

Match the existing style (currently minimal — `Initial Commit`, `Add README`). Keep subjects under 60 chars, imperative mood, no emoji, no scope prefixes (`feat:`, `chore:`) unless the convention is added later by a human.

Never `--no-verify`. If a hook fails, fix the underlying issue.

## What to do when unsure

If a request would force you to violate any rule above, push back in plain text before writing the code. Better to ask one clarifying question than to ship a diff that has to be reverted.
