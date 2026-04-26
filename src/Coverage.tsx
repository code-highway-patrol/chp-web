import { useEffect, useRef, useState, type ReactNode } from "react";

type Lane = {
  tag: string;
  title: string;
  body: string;
  hooks: string[];
  icon: ReactNode;
};

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

const LANES: Lane[] = [
  {
    tag: "in your editor",
    title: "Before every tool call",
    body: "Drops in as a hook in Claude Code, Codex, and Windsurf. CHP runs before the model touches your working tree.",
    hooks: [
      "pre-tool",
      "post-tool",
      "pre-prompt",
      "post-prompt",
      "pre-response",
      "post-response",
    ],
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M9 4v4M15 4v4" />
        <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
  {
    tag: "in your repo",
    title: "Before every commit and push",
    body: "Standard git hooks. The same laws that gate edits gate commits, merges, and pushes.",
    hooks: [
      "pre-commit",
      "commit-msg",
      "pre-push",
      "pre-merge-commit",
      "post-commit",
      "post-merge",
    ],
    icon: (
      <svg {...ICON} aria-hidden>
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="12" r="2.4" />
        <path d="M6 8.4v7.2" />
        <path d="M8.4 6h4a3 3 0 0 1 3 3v.6" />
      </svg>
    ),
  },
  {
    tag: "in your pipeline",
    title: "Before every build and deploy",
    body: "Wires into CI. A failed law fails the build. A signed pass clears the deploy.",
    hooks: ["pre-build", "post-build", "pre-deploy", "post-deploy"],
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M3 7h18" />
        <path d="M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
        <path d="M9 11l2 2 4-4" />
      </svg>
    ),
  },
];

export function Coverage() {
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
      className={`s s-cov${visible ? " is-visible" : ""}`}
      id="coverage"
    >
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">coverage</div>
          <div>
            <h2>Every place an agent can write, CHP gets a turn first.</h2>
            <p className="s-sub">
              The same laws run at the editor, the repo, and the pipeline.
              Define a rule once and it fires on every intercept that matters.
            </p>
          </div>
        </div>

        <ul className="cov" aria-label="Where CHP runs">
          {LANES.map((lane, i) => (
            <li
              className="cov-lane"
              key={lane.tag}
              style={{ ["--i" as string]: i }}
            >
              <div className="cov-icon" aria-hidden>
                {lane.icon}
              </div>
              <div className="cov-tag">{lane.tag}</div>
              <h3>{lane.title}</h3>
              <p>{lane.body}</p>
              <ul className="cov-chips" aria-label={`${lane.tag} hooks`}>
                {lane.hooks.map((h) => (
                  <li key={h} className="cov-chip">
                    {h}
                  </li>
                ))}
              </ul>
              <span className="cov-bar" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
