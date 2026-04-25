import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TokCls = "k" | "s" | "c" | "f" | "warn" | "good";
type Tok = { t: string; c?: TokCls };
type Line = { ln: number; tokens: Tok[] };

type LangScene = {
  id: "ts" | "js" | "py" | "go" | "rs";
  label: string;
  file: string;
  violation: string;
  logo: ReactNode;
  program: Line[];
  programBlockL87: Line;
  patch: Line[];
  patchCleanL87: Line;
};

function MonoLogo({
  bg,
  fg,
  label,
}: {
  bg: string;
  fg: string;
  label: string;
}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill={bg} />
      <text
        x="12"
        y="17"
        fontFamily="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial"
        fontSize="11"
        fontWeight="800"
        textAnchor="middle"
        fill={fg}
        letterSpacing="-0.04em"
      >
        {label}
      </text>
    </svg>
  );
}

function PythonLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#1a1612" />
      <path
        d="M11.6 3.2c-2.4 0-2.2 1-2.2 1v1h2.3v.4H8.4s-1.6.2-1.6 2.5c0 2.4 1.4 2.5 1.4 2.5h1.1v-1.1s-.1-1.4 1.4-1.4h2.3s1.3 0 1.3-1.3v-2.6s.2-1-2.7-1zm-1.3 1c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z"
        fill="#3776AB"
      />
      <path
        d="M12.4 20.8c2.4 0 2.2-1 2.2-1v-1h-2.3v-.4h3.3s1.6-.2 1.6-2.5c0-2.4-1.4-2.5-1.4-2.5h-1.1v1.1s.1 1.4-1.4 1.4h-2.3s-1.3 0-1.3 1.3v2.6s-.2 1 2.7 1zm1.3-1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z"
        fill="#FFD43B"
      />
    </svg>
  );
}

function RustLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#1a1612" />
      <path
        d="M12 4 L13.2 5.6 L15 5 L15.4 7 L17.4 7.4 L16.8 9.2 L18.4 10.4 L17.2 12 L18.4 13.6 L16.8 14.8 L17.4 16.6 L15.4 17 L15 19 L13.2 18.4 L12 20 L10.8 18.4 L9 19 L8.6 17 L6.6 16.6 L7.2 14.8 L5.6 13.6 L6.8 12 L5.6 10.4 L7.2 9.2 L6.6 7.4 L8.6 7 L9 5 L10.8 5.6 Z"
        fill="none"
        stroke="#FF6F3C"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="15.5"
        fontFamily="ui-serif, Georgia"
        fontSize="9"
        fontWeight="900"
        textAnchor="middle"
        fill="#FF6F3C"
      >
        R
      </text>
    </svg>
  );
}

const SCENES: LangScene[] = [
  {
    id: "ts",
    label: "TypeScript",
    file: "auth/session.ts:87",
    violation: "unsafe any",
    logo: <MonoLogo bg="#3178C6" fg="#fff" label="TS" />,
    program: [
      { ln: 86, tokens: [
        { c: "k", t: "export function" }, { t: " " },
        { c: "f", t: "verify" }, { t: "(token) {" },
      ] },
      { ln: 87, tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data: " },
        { c: "k", t: "any" }, { t: " = decode(token);" },
      ] },
      { ln: 88, tokens: [
        { t: "  " }, { c: "k", t: "return" }, { t: " data.user;" },
      ] },
      { ln: 89, tokens: [{ t: "}" }] },
    ],
    programBlockL87: {
      ln: 87,
      tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data: " },
        { c: "warn", t: "any" }, { t: " = decode(token);" },
      ],
    },
    patch: [
      { ln: 87, tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data: " },
        { c: "good", t: "SessionToken | null" }, { t: " = decode(token);" },
      ] },
      { ln: 88, tokens: [
        { t: "  " }, { c: "k", t: "if" }, { t: " (!data) " },
        { c: "k", t: "throw new" }, { t: " AuthError(" },
        { c: "s", t: '"invalid token"' }, { t: ");" },
      ] },
      { ln: 89, tokens: [
        { t: "  " }, { c: "k", t: "return" }, { t: " data.user;" },
      ] },
      { ln: 90, tokens: [{ t: "}" }] },
    ],
    patchCleanL87: {
      ln: 87,
      tokens: [
        { t: "  " }, { c: "k", t: "const" },
        { t: " data: SessionToken | " }, { c: "k", t: "null" },
        { t: " = decode(token);" },
      ],
    },
  },
  {
    id: "py",
    label: "Python",
    file: "auth/session.py:87",
    violation: "no type / no None check",
    logo: <PythonLogo />,
    program: [
      { ln: 86, tokens: [
        { c: "k", t: "def" }, { t: " " },
        { c: "f", t: "verify" }, { t: "(token):" },
      ] },
      { ln: 87, tokens: [
        { t: "    " }, { t: "data = " },
        { c: "f", t: "decode" }, { t: "(token)" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { c: "k", t: "return" }, { t: " data[" },
        { c: "s", t: '"user"' }, { t: "]" },
      ] },
      { ln: 89, tokens: [{ t: "" }] },
    ],
    programBlockL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { c: "warn", t: "data = decode(token)" },
      ],
    },
    patch: [
      { ln: 87, tokens: [
        { t: "    " },
        { c: "good", t: "data: SessionToken | None" },
        { t: " = " }, { c: "f", t: "decode" }, { t: "(token)" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { c: "k", t: "if" }, { t: " data " },
        { c: "k", t: "is None" }, { t: ":" },
      ] },
      { ln: 89, tokens: [
        { t: "        " }, { c: "k", t: "raise" },
        { t: " AuthError(" }, { c: "s", t: '"invalid token"' }, { t: ")" },
      ] },
      { ln: 90, tokens: [
        { t: "    " }, { c: "k", t: "return" }, { t: " data.user" },
      ] },
    ],
    patchCleanL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { t: "data: SessionToken | " },
        { c: "k", t: "None" }, { t: " = " },
        { c: "f", t: "decode" }, { t: "(token)" },
      ],
    },
  },
  {
    id: "js",
    label: "JavaScript",
    file: "auth/session.js:87",
    violation: "unchecked decode",
    logo: <MonoLogo bg="#F7DF1E" fg="#000" label="JS" />,
    program: [
      { ln: 86, tokens: [
        { c: "k", t: "export function" }, { t: " " },
        { c: "f", t: "verify" }, { t: "(token) {" },
      ] },
      { ln: 87, tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data = " },
        { c: "f", t: "decode" }, { t: "(token);" },
      ] },
      { ln: 88, tokens: [
        { t: "  " }, { c: "k", t: "return" }, { t: " data.user;" },
      ] },
      { ln: 89, tokens: [{ t: "}" }] },
    ],
    programBlockL87: {
      ln: 87,
      tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data = " },
        { c: "warn", t: "decode(token)" }, { t: ";" },
      ],
    },
    patch: [
      { ln: 87, tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data = " },
        { c: "good", t: "decode(token)" }, { t: ";" },
      ] },
      { ln: 88, tokens: [
        { t: "  " }, { c: "k", t: "if" }, { t: " (!data) " },
        { c: "k", t: "throw new" }, { t: " AuthError(" },
        { c: "s", t: '"invalid token"' }, { t: ");" },
      ] },
      { ln: 89, tokens: [
        { t: "  " }, { c: "k", t: "return" }, { t: " data.user;" },
      ] },
      { ln: 90, tokens: [{ t: "}" }] },
    ],
    patchCleanL87: {
      ln: 87,
      tokens: [
        { t: "  " }, { c: "k", t: "const" }, { t: " data = " },
        { c: "f", t: "decode" }, { t: "(token);" },
      ],
    },
  },
  {
    id: "go",
    label: "Go",
    file: "auth/session.go:87",
    violation: "dropped error",
    logo: <MonoLogo bg="#00ADD8" fg="#fff" label="Go" />,
    program: [
      { ln: 86, tokens: [
        { c: "k", t: "func" }, { t: " " }, { c: "f", t: "Verify" },
        { t: "(token " }, { c: "k", t: "string" }, { t: ") User {" },
      ] },
      { ln: 87, tokens: [
        { t: "    " }, { t: "data := " },
        { c: "f", t: "Decode" }, { t: "(token)" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { c: "k", t: "return" }, { t: " data.User" },
      ] },
      { ln: 89, tokens: [{ t: "}" }] },
    ],
    programBlockL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { c: "warn", t: "data := Decode(token)" },
      ],
    },
    patch: [
      { ln: 87, tokens: [
        { t: "    " },
        { c: "good", t: "data, err := Decode(token)" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { c: "k", t: "if" }, { t: " err != " },
        { c: "k", t: "nil" }, { t: " { " },
        { c: "k", t: "return" }, { t: " User{}, err }" },
      ] },
      { ln: 89, tokens: [
        { t: "    " }, { c: "k", t: "return" }, { t: " data.User, " },
        { c: "k", t: "nil" },
      ] },
      { ln: 90, tokens: [{ t: "}" }] },
    ],
    patchCleanL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { t: "data, err := " },
        { c: "f", t: "Decode" }, { t: "(token)" },
      ],
    },
  },
  {
    id: "rs",
    label: "Rust",
    file: "auth/session.rs:87",
    violation: ".unwrap() can panic",
    logo: <RustLogo />,
    program: [
      { ln: 86, tokens: [
        { c: "k", t: "pub fn" }, { t: " " }, { c: "f", t: "verify" },
        { t: "(token: &" }, { c: "k", t: "str" }, { t: ") -> User {" },
      ] },
      { ln: 87, tokens: [
        { t: "    " }, { c: "k", t: "let" }, { t: " data = " },
        { c: "f", t: "decode" }, { t: "(token)." },
        { c: "f", t: "unwrap" }, { t: "();" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { t: "data.user" },
      ] },
      { ln: 89, tokens: [{ t: "}" }] },
    ],
    programBlockL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { c: "k", t: "let" }, { t: " data = decode(token)." },
        { c: "warn", t: "unwrap()" }, { t: ";" },
      ],
    },
    patch: [
      { ln: 87, tokens: [
        { t: "    " }, { c: "k", t: "let" }, { t: " data = " },
        { c: "good", t: "decode(token)?" }, { t: ";" },
      ] },
      { ln: 88, tokens: [
        { t: "    " }, { c: "k", t: "let" }, { t: " user = data.user." },
        { c: "f", t: "ok_or" }, { t: "(AuthError::InvalidToken)?;" },
      ] },
      { ln: 89, tokens: [
        { t: "    " }, { c: "k", t: "Ok" }, { t: "(user)" },
      ] },
      { ln: 90, tokens: [{ t: "}" }] },
    ],
    patchCleanL87: {
      ln: 87,
      tokens: [
        { t: "    " }, { c: "k", t: "let" }, { t: " data = " },
        { c: "f", t: "decode" }, { t: "(token)?;" },
      ],
    },
  },
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
  marker?: "add" | "del";
};

type Anchor = { x: number; y: number; w: number; h: number };

function HandNote({
  phase,
  anchor,
  containerW,
}: {
  phase: PhaseId;
  anchor: Anchor | null;
  containerW: number;
}) {
  if (phase === "draft") return null;

  if (phase === "clean") {
    return (
      <div className="scene-hand scene-hand-good" key="clean">
        <div className="scene-hand-label scene-hand-clean">all clear ✓</div>
      </div>
    );
  }

  if (!anchor || containerW === 0) return null;

  const labelMargin = 28;

  if (phase === "block") {
    const labelW = 180;
    const labelX = Math.max(
      anchor.x + anchor.w + 80,
      containerW - labelW - labelMargin,
    );
    const labelY = anchor.y - 4;

    const sx = labelX - 6;
    const sy = labelY + 14;
    const ex = anchor.x + anchor.w + 6;
    const ey = anchor.y + anchor.h - 1;
    const midX = (sx + ex) / 2 + 24;
    const midY = Math.max(sy, ey) + 18;

    const linePath = `M ${sx} ${sy} Q ${midX} ${midY}, ${ex} ${ey}`;
    const headPath = `M ${ex} ${ey} l 9 -3 M ${ex} ${ey} l 7 5`;

    return (
      <div className="scene-hand scene-hand-warn" key="block">
        <svg className="scene-hand-svg" aria-hidden="true">
          <path d={linePath} className="scene-hand-line" pathLength={100} />
          <path d={headPath} className="scene-hand-head" />
        </svg>
        <div
          className="scene-hand-label"
          style={{ left: labelX, top: labelY, maxWidth: labelW }}
        >
          law violation
        </div>
      </div>
    );
  }

  const labelW = 240;
  const labelX = Math.max(
    anchor.x + anchor.w + 80,
    containerW - labelW - labelMargin,
  );
  const labelY = anchor.y - 4;

  const sx = labelX - 6;
  const sy = labelY + 14;
  const ex = anchor.x + anchor.w + 6;
  const ey = anchor.y + anchor.h + 2;
  const midX = ex + (sx - ex) * 0.45;
  const midY = Math.max(sy, ey) + 26;

  const linePath = `M ${sx} ${sy} Q ${midX} ${midY}, ${ex} ${ey}`;
  const headPath = `M ${ex} ${ey} l 10 -2 M ${ex} ${ey} l 7 5`;

  return (
    <div className="scene-hand scene-hand-fix" key="fix">
      <svg className="scene-hand-svg" aria-hidden="true">
        <path d={linePath} className="scene-hand-line" pathLength={100} />
        <path d={headPath} className="scene-hand-head" />
      </svg>
      <div
        className="scene-hand-label"
        style={{ left: labelX, top: labelY, maxWidth: labelW }}
      >
        narrowed + guarded
      </div>
    </div>
  );
}

function LangPicker({
  current,
  onChange,
}: {
  current: LangScene;
  onChange: (id: LangScene["id"]) => void;
}) {
  return (
    <div className="scene-lang">
      <span className="scene-lang-name">{current.label}</span>
      <div className="scene-lang-pick">
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={
              "scene-lang-btn" + (s.id === current.id ? " on" : "")
            }
            onClick={() => onChange(s.id)}
            title={s.label}
            aria-label={s.label}
            aria-pressed={s.id === current.id}
          >
            {s.logo}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScrollScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneBodyRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [langId, setLangId] = useState<LangScene["id"]>("ts");

  const scene = useMemo(
    () => SCENES.find((s) => s.id === langId) ?? SCENES[0],
    [langId],
  );

  const totalType = useMemo(
    () => scene.program.reduce((s, l) => s + lineLen(l), 0),
    [scene],
  );

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
  const charsTyped = Math.floor(typingFrac * totalType);

  const typedLines: { line: Line; partial: Tok[]; started: boolean; done: boolean }[] = [];
  let remaining = charsTyped;
  for (const l of scene.program) {
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
  const patchedCount = Math.round(fixFrac * scene.patch.length);

  const renderLines: RenderLine[] = [];
  renderLines.push({ key: "k86", ln: 86, tokens: scene.program[0].tokens });

  if (phase === "draft") {
    for (let i = 1; i < scene.program.length; i++) {
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
    renderLines.push({ key: "k87", ln: 87, tokens: scene.programBlockL87.tokens, marker: "del" });
    if (scene.program[2])
      renderLines.push({ key: "k88", ln: 88, tokens: scene.program[2].tokens, dim: true });
    if (scene.program[3])
      renderLines.push({ key: "k89", ln: 89, tokens: scene.program[3].tokens, dim: true });
  } else if (phase === "fix") {
    renderLines.push({ key: "k87-del", ln: 87, tokens: scene.programBlockL87.tokens, marker: "del" });

    if (patchedCount >= 1)
      renderLines.push({ key: "p0", ln: 87, tokens: scene.patch[0].tokens, marker: "add" });

    if (patchedCount >= 2)
      renderLines.push({ key: "p1", ln: 88, tokens: scene.patch[1].tokens, marker: "add" });

    const ctxOffset = patchedCount >= 2 ? 1 : 0;
    if (scene.program[2])
      renderLines.push({ key: "ctx-ret", ln: 88 + ctxOffset, tokens: scene.program[2].tokens });
    if (scene.program[3])
      renderLines.push({ key: "ctx-close", ln: 89 + ctxOffset, tokens: scene.program[3].tokens });
  } else {
    renderLines.push({ key: "f0", ln: 87, tokens: scene.patchCleanL87.tokens, marker: "add" });
    renderLines.push({ key: "f1", ln: 88, tokens: scene.patch[1].tokens, marker: "add" });
    renderLines.push({ key: "f2", ln: 89, tokens: scene.patch[2].tokens });
    renderLines.push({ key: "f3", ln: 90, tokens: scene.patch[3].tokens });
  }

  useLayoutEffect(() => {
    const el = sceneBodyRef.current;
    if (!el) return;
    const measure = () => {
      const preferGood = phase === "fix" || phase === "clean";
      const warn = el.querySelector(".scene-tok-warn") as HTMLElement | null;
      const good = el.querySelector(".scene-tok-good") as HTMLElement | null;
      const target = preferGood ? (good ?? warn) : (warn ?? good);
      const cRect = el.getBoundingClientRect();
      setContainerW(cRect.width);
      if (!target) {
        setAnchor(null);
        return;
      }
      const tRect = target.getBoundingClientRect();
      setAnchor({
        x: tRect.left - cRect.left,
        y: tRect.top - cRect.top,
        w: tRect.width,
        h: tRect.height,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, patchedCount, langId]);

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
          {scene.file} / {scene.violation}
        </span>
      </>
    );
  else if (phase === "fix")
    foot = (
      <>
        <span className="pill warn">patching</span>
        <span>narrowing type / adding guard</span>
      </>
    );
  else
    foot = (
      <>
        <span className="pill good">cleared</span>
        <span>tests / types / lint all green</span>
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
          <div className="scene-body" ref={sceneBodyRef}>
            {renderLines.map((l) => (
              <div
                className={
                  "scene-line" +
                  (l.dim ? " dim" : "") +
                  (l.marker === "add" ? " diff-add" : "") +
                  (l.marker === "del" ? " diff-del" : "")
                }
                key={l.key}
              >
                <span className="ln">
                  <span
                    className={
                      "diff-mark" +
                      (l.marker === "add" ? " add" : "") +
                      (l.marker === "del" ? " del" : "")
                    }
                  >
                    {l.marker === "add" ? "+" : l.marker === "del" ? "−" : " "}
                  </span>
                  <span className="ln-num">{l.ln}</span>
                </span>
                <span>
                  {renderTokens(l.tokens)}
                  {l.caret ? <span className="caret" /> : null}
                </span>
              </div>
            ))}
            <HandNote phase={phase} anchor={anchor} containerW={containerW} />
            <LangPicker current={scene} onChange={setLangId} />
          </div>
          <div className="scene-foot">{foot}</div>
        </div>
      </div>
    </section>
  );
}
