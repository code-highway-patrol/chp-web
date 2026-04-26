type Row = { l: string; gsd: string; chp: string };

const ROWS: Row[] = [
  { l: "Deterministic checks", gsd: "sometimes", chp: "always" },
  { l: "Cites which rule fired", gsd: "no", chp: "yes" },
  { l: "Auto-patches small fixes", gsd: "with prompt", chp: "by default" },
  { l: "Works on huge repos", gsd: "slow", chp: "yes, only re-checks the diff" },
  { l: "Open spec", gsd: "closed", chp: "MIT" },
];

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
              <div className="label">{r.l}</div>
              <div className="val">{r.gsd}</div>
              <div className="val chp">{r.chp}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
