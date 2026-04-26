import { useEffect, useRef, useState } from "react";

type Agent = {
  badge: string;
  name: string;
  role: string;
  body: string;
};

const AGENTS: Agent[] = [
  {
    badge: "C",
    name: "Chief",
    role: "writes the laws",
    body: "Reads your repo's existing conventions and drafts new laws from them. The output is plain files you can edit, not a black box.",
  },
  {
    badge: "O",
    name: "Officer",
    role: "runs the verifier",
    body: "Fires on every intercept. Runs the deterministic check, writes a structured ticket back to the agent when something fails.",
  },
  {
    badge: "D",
    name: "Detective",
    role: "tightens the guidance",
    body: "When a law trips repeatedly, rewrites the guidance the model reads so the next turn does not repeat the same mistake.",
  },
  {
    badge: "F",
    name: "Fixer",
    role: "patches in place",
    body: "Closes the loop on small, mechanical failures. The diff lands cleared, no human turn required.",
  },
];

export function Agents() {
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
      className={`s s-ag${visible ? " is-visible" : ""}`}
      id="agents"
    >
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">the patrol</div>
          <div>
            <h2>Four agents do the work.</h2>
            <p className="s-sub">
              Each one is a Markdown prompt you can read and edit. Swap a model,
              rewrite a step, or take an agent out of the loop. Nothing is
              compiled away.
            </p>
          </div>
        </div>

        <ul className="ag" aria-label="The four CHP agents">
          {AGENTS.map((a, i) => (
            <li
              className="ag-card"
              key={a.name}
              style={{ ["--i" as string]: i }}
            >
              <div className="ag-badge" aria-hidden>
                {a.badge}
              </div>
              <div className="ag-name">
                <h3>{a.name}</h3>
                <span className="ag-role">{a.role}</span>
              </div>
              <p>{a.body}</p>
              <span className="ag-bar" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
