import type { ReactNode } from "react";

type State = "yes" | "partial" | "no";
type Cell = { state: State; note?: string };
type Row = { l: string; desc: string; icon: ReactNode; gsd: Cell; chp: Cell };

const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ROWS: Row[] = [
  {
    l: "Auditable verdicts",
    desc:
      "Every check that ran is logged. You can replay it and see exactly why a change passed or failed.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8.5 14l2 2 4.5-4.5" />
      </svg>
    ),
    gsd: { state: "no", note: "no record" },
    chp: { state: "yes", note: "every check signed" },
  },
  {
    l: "Cites which rule fired",
    desc:
      "When a check fails, CHP names the specific law from your codebase, not just 'looks bad'.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M4 19h16" />
        <path d="M9 4l11 11-3 3L6 7z" />
        <path d="M6 7l-2 2" />
      </svg>
    ),
    gsd: { state: "no" },
    chp: { state: "yes" },
  },
  {
    l: "Auto-patches small fixes",
    desc:
      "Mechanical fixes like formatting and missing imports get patched in place, without re-prompting the agent.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M14.5 4.5l5 5L8 21H3v-5z" />
        <path d="M13 6l5 5" />
      </svg>
    ),
    gsd: { state: "partial", note: "if asked" },
    chp: { state: "yes", note: "by default" },
  },
  {
    l: "Works on huge repos",
    desc:
      "CHP only re-runs checks against the diff, so it stays fast even on million-line codebases.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M3 12h6M15 12h6" />
        <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
      </svg>
    ),
    gsd: { state: "partial", note: "slow" },
    chp: { state: "yes", note: "only re-checks the diff" },
  },
  {
    l: "Open spec",
    desc:
      "The rule format and check protocol are MIT-licensed. Fork it, audit it, swap implementations.",
    icon: (
      <svg {...ICON} aria-hidden>
        <path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2z" />
        <path d="M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </svg>
    ),
    gsd: { state: "no" },
    chp: { state: "yes", note: "MIT" },
  },
];

function Mark({ state }: { state: State }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (state === "yes") {
    return (
      <svg {...common} className="cmp-icon yes" aria-label="yes">
        <circle cx="9" cy="9" r="7.5" />
        <path d="M5.5 9.2l2.4 2.4 4.6-5" />
      </svg>
    );
  }
  if (state === "partial") {
    return (
      <svg {...common} className="cmp-icon partial" aria-label="partial">
        <circle cx="9" cy="9" r="7.5" />
        <path d="M5.5 9h7" />
      </svg>
    );
  }
  return (
    <svg {...common} className="cmp-icon no" aria-label="no">
      <circle cx="9" cy="9" r="7.5" />
      <path d="M6 6l6 6M12 6l-6 6" />
    </svg>
  );
}

function CmpCell({ cell, chp = false }: { cell: Cell; chp?: boolean }) {
  return (
    <div className={`val cmp-cell${chp ? " chp" : ""}`}>
      <Mark state={cell.state} />
      {cell.note && <span className="cmp-note">{cell.note}</span>}
    </div>
  );
}

function CapLabel({ row }: { row: Row }) {
  return (
    <div className="cmp-label">
      <button className="cmp-label-btn" type="button">
        {row.l}
        <svg
          className="cmp-info"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
          <path
            d="M6 5.2v3.3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="6" cy="3.6" r="0.6" fill="currentColor" />
        </svg>
      </button>
      <div className="cmp-tip" role="tooltip">
        <div className="cmp-tip-icon" aria-hidden>
          {row.icon}
        </div>
        <div className="cmp-tip-body">{row.desc}</div>
      </div>
    </div>
  );
}

export function Compare() {
  return (
    <section className="s" id="compare">
      <div className="wrap">
        <div className="s-head">
          <div className="kicker">comparison</div>
          <h2>What you trade when you let the model police itself.</h2>
        </div>
        <div className="compare">
          <div className="compare-head">
            <div>Capability</div>
            <div>Asking the model</div>
            <div className="col-chp">CHP</div>
          </div>
          {ROWS.map((r) => (
            <div className="compare-row" key={r.l}>
              <div className="label">
                <CapLabel row={r} />
              </div>
              <CmpCell cell={r.gsd} />
              <CmpCell cell={r.chp} chp />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
