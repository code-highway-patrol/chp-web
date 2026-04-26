import { useEffect, useRef, useState } from "react";

type File = {
  name: string;
  caption: string;
  lang: "json" | "bash" | "md";
  body: string;
};

const FILES: File[] = [
  {
    name: "law.json",
    caption: "What to enforce, and when.",
    lang: "json",
    body: `{
  "name": "no-ai-tells",
  "hooks": ["pre-tool", "pre-commit"],
  "description": "Reject AI-tell phrasings.",
  "severity": "error",
  "include": "**/*.{ts,tsx,md}"
}`,
  },
  {
    name: "verify.sh",
    caption: "The deterministic check.",
    lang: "bash",
    body: `#!/usr/bin/env bash
set -euo pipefail

PATTERNS='Certainly!|As an AI|I have added'
hits=$(rg -n "$PATTERNS" "$@" || true)

if [ -n "$hits" ]; then
  echo "$hits"
  exit 1
fi`,
  },
  {
    name: "guidance.md",
    caption: "What the agent reads before it writes.",
    lang: "md",
    body: `Do not write phrases that signal AI
authorship: "Certainly!", "I have added...",
"Here is a clean implementation".
The diff explains itself. Match the
surrounding code's voice.`,
  },
];

function highlight(body: string, lang: File["lang"]): string {
  let html = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === "json") {
    html = html
      .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="tk-key">$1</span>$2')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="tk-str">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="tk-num">$1</span>')
      .replace(/(?<![\w-])(-?\d+(?:\.\d+)?)(?![\w-])/g, '<span class="tk-num">$1</span>');
  } else if (lang === "bash") {
    html = html
      .replace(/(^|\n)(#[^\n]*)/g, '$1<span class="tk-com">$2</span>')
      .replace(/^(#![^\n]*)/g, '<span class="tk-com">$1</span>')
      .replace(/\b(set|if|then|fi|echo|exit|local|export)\b/g, '<span class="tk-key">$1</span>')
      .replace(/(\$\{?\w+\}?|"\$@")/g, '<span class="tk-num">$1</span>')
      .replace(/('[^']*')/g, '<span class="tk-str">$1</span>');
  } else if (lang === "md") {
    html = html.replace(/("[^"\n]+")/g, '<span class="tk-str">$1</span>');
  }
  return html;
}

export function Anatomy() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`s s-ana${visible ? " is-visible" : ""}`}
      id="anatomy"
    >
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">anatomy</div>
          <div>
            <h2>A law is three small files.</h2>
            <p className="s-sub">
              No DSL. No plugin API. A folder under{" "}
              <code className="s-code">docs/chp/laws/</code> with three files
              the agent and the verifier both read. Laws compose; you can
              install one from the marketplace and adapt it in place.
            </p>
          </div>
        </div>

        <ul className="ana" aria-label="A law is three small files">
          {FILES.map((f, i) => (
            <li
              className="ana-card"
              key={f.name}
              style={{ ["--i" as string]: i }}
            >
              <div className="ana-head">
                <span className="ana-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span className="ana-name">{f.name}</span>
              </div>
              <pre
                className="ana-code"
                dangerouslySetInnerHTML={{ __html: highlight(f.body, f.lang) }}
              />
              <p className="ana-cap">{f.caption}</p>
              <span className="ana-bar" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
