import { useEffect, useRef, useState, type ReactNode } from "react";

type TokCls = "k" | "s" | "c" | "f" | "warn" | "good";
type Tok = { t: string; c?: TokCls };
type Line = { ln: number; tokens: Tok[] };

const PROGRAM: Line[] = [
  {
    ln: 86,
    tokens: [
      { c: "k", t: "export function" },
      { t: " " },
      { c: "f", t: "verify" },
      { t: "(token) {" },
    ],
  },
  {
    ln: 87,
    tokens: [
      { t: "  " },
      { c: "k", t: "const" },
      { t: " data: " },
      { c: "k", t: "any" },
      { t: " = decode(token);" },
    ],
  },
  {
    ln: 88,
    tokens: [
      { t: "  " },
      { c: "k", t: "return" },
      { t: " data.user;" },
    ],
  },
  { ln: 89, tokens: [{ t: "}" }] },
];

const PROGRAM_BLOCK_L87: Line = {
  ln: 87,
  tokens: [
    { t: "  " },
    { c: "k", t: "const" },
    { t: " data: " },
    { c: "warn", t: "any" },
    { t: " = decode(token);" },
  ],
};

const PATCH: Line[] = [
  {
    ln: 87,
    tokens: [
      { t: "  " },
      { c: "k", t: "const" },
      { t: " data: " },
      { c: "good", t: "SessionToken | " },
      { c: "good", t: "null" },
      { t: " = decode(token);" },
    ],
  },
  {
    ln: 88,
    tokens: [
      { t: "  " },
      { c: "k", t: "if" },
      { t: " (!data) " },
      { c: "k", t: "throw new" },
      { t: " AuthError(" },
      { c: "s", t: '"invalid token"' },
      { t: ");" },
    ],
  },
  {
    ln: 89,
    tokens: [
      { t: "  " },
      { c: "k", t: "return" },
      { t: " data.user;" },
    ],
  },
  { ln: 90, tokens: [{ t: "}" }] },
];

const PATCH_CLEAN: Line[] = [
  {
    ln: 87,
    tokens: [
      { t: "  " },
      { c: "k", t: "const" },
      { t: " data: SessionToken | " },
      { c: "k", t: "null" },
      { t: " = decode(token);" },
    ],
  },
  PATCH[1],
  PATCH[2],
  PATCH[3],
];

function lineLen(line: Line): number {
  return line.tokens.reduce((s, t) => s + t.t.length, 0);
}

function partialTokens(line: Line, chars: number): Tok[] {
  if (chars <= 0) return [];
  const out: Tok[] = [];
  let remaining = chars;
  for (const tok of line.tokens) {
    if (remaining <= 0) break;
    if (tok.t.length <= remaining) {
      out.push(tok);
      remaining -= tok.t.length;
    } else {
      out.push({ ...tok, t: tok.t.slice(0, remaining) });
      remaining = 0;
    }
  }
  return out;
}

function renderTokens(tokens: Tok[]): ReactNode {
  return tokens.map((t, i) =>
    t.c ? (
      <span key={i} className={`scene-tok-${t.c}`}>
        {t.t}
      </span>
    ) : (
      <span key={i}>{t.t}</span>
    ),
  );
}

const TOTAL_TYPE = PROGRAM.reduce((s, l) => s + lineLen(l), 0);

const PHASES = [
  { id: "draft", snapStart: 0.0, snapEnd: 0.22 },
  { id: "block", snapStart: 0.34, snapEnd: 0.5 },
  { id: "fix", snapStart: 0.62, snapEnd: 0.78 },
  { id: "clean", snapStart: 0.88, snapEnd: 1.0 },
] as const;

type PhaseId = (typeof PHASES)[number]["id"];

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function resolvePhase(p: number): { phase: PhaseId; tween: number } {
  for (let i = 0; i < PHASES.length; i++) {
    const ph = PHASES[i];
    if (p <= ph.snapEnd) {
      if (p >= ph.snapStart) return { phase: ph.id, tween: 1 };
      const prev = PHASES[i - 1];
      if (!prev)
        return { phase: ph.id, tween: easeInOut(p / ph.snapStart) };
      const span = ph.snapStart - prev.snapEnd;
      const local = (p - prev.snapEnd) / span;
      return { phase: ph.id, tween: easeInOut(local) };
    }
  }
  return { phase: "clean", tween: 1 };
}

type RenderLine = {
  key: string;
  ln: number;
  tokens: Tok[];
  caret?: boolean;
  dim?: boolean;
};

function Note({ phase }: { phase: PhaseId }) {
  if (phase === "draft") return null;
  if (phase === "block") {
    return (
      <div className="scene-note scene-note-warn">
        <span className="scene-note-arrow">↖</span>
        any can be null — narrow it
      </div>
    );
  }
  if (phase === "fix") {
    return (
      <div className="scene-note scene-note-warn">
        <span className="scene-note-arrow">↖</span>
        narrowed + guarded
      </div>
    );
  }
  return (
    <div className="scene-note scene-note-good">
      all clear
      <span className="scene-note-check">✓</span>
    </div>
  );
}

export function ScrollScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const pinHeight = vh - 60;
      const total = el.offsetHeight;
      const scrolled = -rect.top;
      const span = total - pinHeight;
      let q = scrolled / span;
      if (q < 0) q = 0;
      if (q > 1) q = 1;
      setP(q);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const { phase, tween } = resolvePhase(p);

  const typingFrac = phase === "draft" ? tween : 1;
  const charsTyped = Math.floor(typingFrac * TOTAL_TYPE);

  const typedLines: { line: Line; partial: Tok[]; started: boolean; done: boolean }[] = [];
  let remaining = charsTyped;
  for (const l of PROGRAM) {
    const len = lineLen(l);
    if (remaining <= 0) {
      typedLines.push({ line: l, partial: [], started: false, done: false });
    } else if (remaining >= len) {
      typedLines.push({ line: l, partial: l.tokens, started: true, done: true });
      remaining -= len;
    } else {
      typedLines.push({
        line: l,
        partial: partialTokens(l, remaining),
        started: true,
        done: false,
      });
      remaining = 0;
    }
  }

  let activeIdx = -1;
  for (let i = 0; i < typedLines.length; i++) {
    if (typedLines[i].started && !typedLines[i].done) {
      activeIdx = i;
      break;
    }
  }

  const fixFrac = phase === "fix" ? tween : phase === "clean" ? 1 : 0;
  const patchedCount = Math.round(fixFrac * PATCH.length);

  const renderLines: RenderLine[] = [];
  renderLines.push({ key: "k86", ln: 86, tokens: PROGRAM[0].tokens });

  if (phase === "draft") {
    for (let i = 1; i < PROGRAM.length; i++) {
      const l = typedLines[i];
      if (!l.started) continue;
      renderLines.push({
        key: "k" + l.line.ln,
        ln: l.line.ln,
        tokens: l.partial,
        caret: i === activeIdx,
      });
    }
  } else if (phase === "block") {
    renderLines.push({ key: "k87", ln: 87, tokens: PROGRAM_BLOCK_L87.tokens });
    renderLines.push({ key: "k88", ln: 88, tokens: PROGRAM[2].tokens, dim: true });
    renderLines.push({ key: "k89", ln: 89, tokens: PROGRAM[3].tokens, dim: true });
  } else if (phase === "fix") {
    if (patchedCount >= 1)
      renderLines.push({ key: "p0", ln: 87, tokens: PATCH[0].tokens });
    else
      renderLines.push({ key: "k87", ln: 87, tokens: PROGRAM_BLOCK_L87.tokens });

    if (patchedCount >= 2)
      renderLines.push({ key: "p1", ln: 88, tokens: PATCH[1].tokens });

    const oldRetLn = patchedCount >= 2 ? 89 : 88;
    if (patchedCount >= 3)
      renderLines.push({ key: "p2", ln: 89, tokens: PATCH[2].tokens });
    else
      renderLines.push({ key: "k88", ln: oldRetLn, tokens: PROGRAM[2].tokens });

    const oldCloseLn = patchedCount >= 3 ? 90 : patchedCount >= 2 ? 90 : 89;
    if (patchedCount >= 4)
      renderLines.push({ key: "p3", ln: 90, tokens: PATCH[3].tokens });
    else
      renderLines.push({ key: "k89", ln: oldCloseLn, tokens: PROGRAM[3].tokens });
  } else {
    renderLines.push({ key: "f0", ln: 87, tokens: PATCH_CLEAN[0].tokens });
    renderLines.push({ key: "f1", ln: 88, tokens: PATCH_CLEAN[1].tokens });
    renderLines.push({ key: "f2", ln: 89, tokens: PATCH_CLEAN[2].tokens });
    renderLines.push({ key: "f3", ln: 90, tokens: PATCH_CLEAN[3].tokens });
  }

  let foot: ReactNode;
  if (phase === "draft")
    foot = (
      <>
        <span className="pill">draft</span>
        <span>agent typing diff</span>
      </>
    );
  else if (phase === "block")
    foot = (
      <>
        <span className="pill bad">blocked</span>
        <span>
          auth/session.ts:87 / unsafe <code>any</code>
        </span>
      </>
    );
  else if (phase === "fix")
    foot = (
      <>
        <span className="pill warn">patching</span>
        <span>narrowing type / adding null guard</span>
      </>
    );
  else
    foot = (
      <>
        <span className="pill good">cleared</span>
        <span>tests / types / lint all green / 312ms</span>
      </>
    );

  const sp = (s: PhaseId, cls = "") => (phase === s ? `on ${cls}` : "");

  return (
    <section className="scene-section" ref={sectionRef}>
      <div className="scene-pin">
        <div className="scene-head">
          <div>
            <div className="kicker">turn lifecycle</div>
            <h2>Scroll to walk one agent turn through the system.</h2>
          </div>
          <div className="hint">scroll to advance</div>
        </div>
        <div className="scene">
          <div className="scene-bar">
            <div className="stage-pills">
              <span className={sp("draft")}>draft</span>
              <span className={sp("block", "bad")}>block</span>
              <span className={sp("fix", "warn")}>fix</span>
              <span className={sp("clean", "good")}>clean</span>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.round(p * 100)}%` }} />
            </div>
          </div>
          <div className="scene-body">
            {renderLines.map((l) => (
              <div
                className={"scene-line" + (l.dim ? " dim" : "")}
                key={l.key}
              >
                <span className="ln">{l.ln}</span>
                <span>
                  {renderTokens(l.tokens)}
                  {l.caret ? <span className="caret" /> : null}
                </span>
              </div>
            ))}
            <Note phase={phase} />
          </div>
          <div className="scene-foot">{foot}</div>
        </div>
      </div>
    </section>
  );
}
