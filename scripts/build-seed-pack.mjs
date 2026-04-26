// Builds the "programming-best-practices" law-pack statue and appends
// (or replaces) it in src/marketplace/statues.json. No backend involved —
// the marketplace is a static catalog. Run locally:
//
//   bun scripts/build-seed-pack.mjs
//
// Idempotent: deletes any prior entry with slug "programming-best-practices".

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUES_PATH = join(__dirname, "../src/marketplace/statues.json");

const SLUG = "programming-best-practices";
const TITLE = "Programming Best Practices";
const DESCRIPTION =
  "Concrete CHP laws curated from dereknguyen269/programing-best-practices — the most check-able rules across JS/TS, distilled into pre-commit + pre-tool enforcement.";
const TAGS = ["javascript", "typescript", "best-practices", "security"];
const AUTHOR_NAME = "dereknguyen269";
const AUTHOR_ID = "gh:dereknguyen269";

const LAWS = [
  {
    name: "ts-no-any",
    intent: "Block `: any` and `as any` in TypeScript — defeats the type system.",
    severity: "error",
    pattern: "(:\\s*any\\b|\\bas\\s+any\\b)",
    message:
      "TypeScript `any` defeats type checking — use a real type or `unknown`.",
    agentPrompt:
      "RULE: Never use `any` in TypeScript. Use a concrete type, `unknown`, or generic constraints. If the shape is unknown at the boundary, use `unknown` and narrow with type guards.",
    guidance: `# ts-no-any

**Severity:** error
**Source:** dereknguyen269/programing-best-practices

## Why

\`any\` opts a value out of every TypeScript safety guarantee. Once a value is \`any\`, every property access compiles, every method call compiles, and the runtime is a coin flip. \`any\` spreads — every return value, every passed argument, every destructure infects more code.

## Acceptable alternatives

- **\`unknown\`** when the shape really is unknown at the boundary (network responses, JSON.parse). Narrow with type guards before use.
- **Generic constraints** (\`<T extends ...>\`) when a function is reused across types.
- **Discriminated unions** for "this could be one of N shapes" — far better than \`any\`.

## What this law catches

The pattern \`(:\\s*any\\b|\\bas\\s+any\\b)\` matches type annotations (\`const x: any\`) and assertions (\`thing as any\`). Word boundaries prevent false positives inside identifiers, comments, and strings.
`,
  },
  {
    name: "js-no-var",
    intent: "Block `var` declarations — function-scoped, hoisted, easy to misuse.",
    severity: "error",
    pattern: "(^|[^A-Za-z0-9_])var\\s+[A-Za-z_$]",
    message: "Use `let` (mutable) or `const` (immutable) instead of `var`.",
    agentPrompt:
      "RULE: Never write `var`. Use `const` for values that don't change after assignment, `let` for ones that do.",
    guidance: `# js-no-var

**Severity:** error

## Why

\`var\` is function-scoped (not block-scoped) and gets hoisted. \`let\` and \`const\` are block-scoped and the temporal dead zone catches use-before-declare at runtime. There is no remaining good reason to write \`var\` in modern JS or TS.

## Comply

- \`const\` if the binding never gets reassigned.
- \`let\` if it does.
`,
  },
  {
    name: "no-double-equals",
    intent: "Require strict equality (=== / !==) instead of == / !=.",
    severity: "error",
    pattern: "([^=!])(==|!=)([^=])",
    message:
      "Use === / !== for strict equality. == coerces types and causes surprises.",
    agentPrompt:
      "RULE: Never use == or != in JS/TS. Always use === / !==. Loose equality coerces types in non-obvious ways.",
    guidance: `# no-double-equals

**Severity:** error

## Why

Loose equality coerces operands. Some of the resulting truths:

\`\`\`js
0 == ""           // true
null == undefined // true
[] == false       // true
"0" == false      // true
\`\`\`

Strict equality (\`===\`) compares without coercion and is what almost every linter recommends by default.
`,
  },
  {
    name: "no-eval-call",
    intent: "Block eval() — arbitrary code execution risk.",
    severity: "error",
    pattern: "\\beval\\s*\\(",
    message: "eval() runs arbitrary code with the caller's scope. Don't use it.",
    agentPrompt:
      "RULE: Never call eval(). It's a top vector for code injection. Use JSON.parse for data, function references for dispatch, dynamic imports for code-splitting.",
    guidance: `# no-eval-call

**Severity:** error

## Why

\`eval()\` executes its string argument as code, with full access to the calling scope. If any part of that string ever derives from user input — directly or transitively — the page is one bug away from arbitrary code execution. The same applies to \`Function(...)\`, \`setTimeout(string)\`, \`setInterval(string)\`.

## Comply

- Parsing data: \`JSON.parse\`.
- Dynamic dispatch: a lookup table of functions.
- Lazy code: dynamic \`import()\`.
`,
  },
  {
    name: "no-debugger",
    intent: "Block `debugger;` statements from being committed.",
    severity: "error",
    pattern: "\\bdebugger\\b\\s*;",
    message:
      "Remove debugger statements before committing — they freeze the page in prod when devtools are open.",
    agentPrompt:
      "RULE: Never commit `debugger;` statements. Use logger.debug() for persistent diagnostics.",
    guidance: `# no-debugger

**Severity:** error

## Why

A committed \`debugger;\` is a landmine: when a user (or an automated test) opens devtools, the page hangs at that line. It also signals an unfinished investigation got merged.

## Comply

- Editor breakpoints for live debugging — they don't get committed.
- \`logger.debug(...)\` for diagnostics that should persist.
- If a check truly belongs in production, throw a real error.
`,
  },
  {
    name: "no-document-write",
    intent: "Block document.write() — blocks parser, breaks async pages, security footgun.",
    severity: "error",
    pattern: "\\bdocument\\.write(?:ln)?\\s*\\(",
    message:
      "document.write() blocks the parser and is unsafe with user-supplied content. Use DOM APIs.",
    agentPrompt:
      "RULE: Never call document.write() or document.writeln(). Use DOM APIs (createElement / appendChild) or framework rendering.",
    guidance: `# no-document-write

**Severity:** error

## Why

\`document.write\` was a 1996 API. Calling it after \`DOMContentLoaded\` wipes the entire document. Any string concatenation that includes user input is an XSS vector. Browsers actively suppress it on slow connections.

## Comply

- DOM APIs: \`document.createElement\`, \`element.appendChild\`, \`element.textContent\`.
- A real templating layer (React, Vue, etc.).
- Streaming HTML from the server.
`,
  },
];

function verifyShellStub(name) {
  return `#!/usr/bin/env bash
# AUTO-GENERATED by CHP — uses atomic check runner
LAW_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CHP_BASE="$(cd "$LAW_DIR/../../../../" && pwd)"
source "$CHP_BASE/core/common.sh"
source "$CHP_BASE/core/check-runner.sh"
run_checks "${name}" "\${1:-pre-commit}"
exit $?
`;
}

function lawJsonContent(law) {
  return (
    JSON.stringify(
      {
        name: law.name,
        intent: law.intent,
        severity: law.severity,
        hooks: ["pre-commit", "pre-tool"],
        enabled: true,
        checks: [
          {
            id: `${law.name}-pattern`,
            type: "pattern",
            config: { pattern: law.pattern },
            severity: "block",
            message: law.message,
          },
          {
            id: `${law.name}-guidance`,
            type: "agent",
            config: { prompt: law.agentPrompt },
            severity: "block",
            message: law.message,
          },
        ],
      },
      null,
      2,
    ) + "\n"
  );
}

function buildFiles(laws) {
  const files = [];
  for (const l of laws) {
    const lawJson = lawJsonContent(l);
    const verify = verifyShellStub(l.name);
    const guidance = l.guidance;
    files.push({
      path: `${l.name}/law.json`,
      content: lawJson,
      size: Buffer.byteLength(lawJson, "utf8"),
    });
    files.push({
      path: `${l.name}/verify.sh`,
      content: verify,
      size: Buffer.byteLength(verify, "utf8"),
    });
    files.push({
      path: `${l.name}/guidance.md`,
      content: guidance,
      size: Buffer.byteLength(guidance, "utf8"),
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

function buildSummary(law) {
  return {
    name: law.name,
    hooks: ["pre-commit", "pre-tool"],
    severity: law.severity,
    intent: law.intent,
  };
}

const statue = {
  _id: `seed-${SLUG}`,
  slug: SLUG,
  title: TITLE,
  description: DESCRIPTION,
  tags: TAGS,
  authorId: AUTHOR_ID,
  authorName: AUTHOR_NAME,
  createdAt: new Date().toISOString(),
  stars: 0,
  files: buildFiles(LAWS),
  laws: LAWS.map(buildSummary).sort((a, b) => a.name.localeCompare(b.name)),
};

const existing = JSON.parse(readFileSync(STATUES_PATH, "utf8"));
const next = existing.filter((s) => s.slug !== SLUG);
next.unshift(statue);

writeFileSync(STATUES_PATH, JSON.stringify(next, null, 2) + "\n");
console.log(
  `Wrote ${SLUG} into ${STATUES_PATH} (${LAWS.length} laws, ${statue.files.length} files).`,
);
