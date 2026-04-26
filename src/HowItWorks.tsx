import { useEffect, useRef, useState, type ReactNode } from "react";

type Step = { n: string; title: string; body: string; icon: ReactNode };

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const STEPS: Step[] = [
  {
    n: "01",
    title: "Model proposes a turn",
    body: "Your agent drafts a diff and asks to commit.",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M14.5 4.5l5 5L8 21H3v-5z" />
        <path d="M13 6l5 5" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "CHP intercepts",
    body:
      "The diff is held at the editor or hook layer before it touches disk.",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6z" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Checks run in parallel",
    body:
      "Lint, types, tests, security and policy all run against the proposed change set.",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
      </svg>
    ),
  },
  {
    n: "04",
    title: "Pass or correct",
    body:
      "Cleared turns commit. Failed turns return a structured ticket back to the agent.",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l3 3 5-6" />
      </svg>
    ),
  },
];

export function HowItWorks() {
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
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`s s-how${visible ? " is-visible" : ""}`}
      id="how"
    >
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">how it works</div>
          <h2>Every turn gets a checkpoint.</h2>
        </div>
        <ol className="lanes" aria-label="How CHP processes a turn">
          {STEPS.map((s, i) => (
            <li
              className="lane"
              key={s.n}
              style={{ ["--i" as string]: i }}
            >
              <div className="lane-icon" aria-hidden>
                {s.icon}
              </div>
              <div className="lane-num">step / {s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <span className="lane-bar" aria-hidden />
              {i < STEPS.length - 1 && (
                <span className="lane-arrow" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
