import { useEffect, useRef, useState, type ReactNode } from "react";

type Feat = { tag: string; title: string; body: string; icon: ReactNode };
type Stat = { num: string; unit: string; lbl: string };

const STATS: Stat[] = [
  { num: "94.2", unit: "%", lbl: "turn pass rate" },
  { num: "$0.004", unit: "/turn", lbl: "avg. token cost" },
  { num: "2.1M", unit: "", lbl: "turns checked" },
  { num: "37", unit: "", lbl: "checkpoints supported" },
];

const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const FEATS: Feat[] = [
  {
    tag: "01 frugal",
    title: "No structured-coding-tool token bills",
    body: "Linters do the heavy lifting. Frontier models only see the diff when they must.",
    icon: (
      <svg {...ICON} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5c-.6-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2 0 2.4 6.4 1.6 6.4 4.2 0 1.4-1.5 2.3-3.4 2.3-1.5 0-2.7-.6-3.3-1.7" />
        <path d="M11 5.5v2M11 16.5v2" />
      </svg>
    ),
  },
  {
    tag: "02 streamed",
    title: "Verdicts as the diff lands",
    body: "Results stream back the instant a check finishes. No 30‑second stalls.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M4 7l5 5-5 5" />
        <path d="M11 7l5 5-5 5" />
        <path d="M19 6v12" opacity="0.5" />
      </svg>
    ),
  },
  {
    tag: "03 editor-native",
    title: "Hooks into your agent",
    body: "One CLI. Drops in as a pre‑tool hook in Cursor, Claude Code, and Codex.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M9 4v4M15 4v4" />
        <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
  {
    tag: "04 verifiable",
    title: "Every pass is signed",
    body: "Each cleared turn ships with a manifest of what ran and what was patched.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8.5 14l2 2 4.5-4.5" />
      </svg>
    ),
  },
  {
    tag: "05 policy as code",
    title: "Your standards, enforced",
    body: "Write house rules in TS, Python, or Cue. CHP runs them with lint and types.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M9 4H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2" />
        <path d="M15 4h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2" />
      </svg>
    ),
  },
  {
    tag: "06 quiet",
    title: "Silent on green, loud on red",
    body: "Stays out of the way when turns pass. You only hear from CHP when one fails.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M11 5L6 9H3v6h3l5 4z" />
        <path d="M16 9l6 6M22 9l-6 6" />
      </svg>
    ),
  },
];

export function Features() {
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
      className={`s s-feats${visible ? " is-visible" : ""}`}
      id="features"
    >
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">features</div>
          <div>
            <h2>Six things CHP does that a coding agent will not do alone.</h2>
            <p className="s-sub">
              Most teams already document their conventions in AGENTS.md or a
              skill, but those documents only describe the rules. No
              programmatic check verifies the agent actually followed them on
              any given turn — that is what CHP runs, on every turn.
            </p>
          </div>
        </div>

        <ul className="feats" aria-label="Features">
          {FEATS.map((f, i) => (
            <li
              className="feat"
              key={f.tag}
              style={{ ["--i" as string]: i }}
            >
              <div className="feat-icon" aria-hidden>
                {f.icon}
              </div>
              <div className="feat-tag">{f.tag}</div>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <span className="feat-bar" aria-hidden />
            </li>
          ))}
        </ul>

        <div className="roster roster-attached">
          {STATS.map((s) => (
            <div className="roster-cell" key={s.lbl}>
              <div className="num">
                {s.num}
                <span className="unit">{s.unit}</span>
              </div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
