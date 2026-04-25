type Stat = { num: string; unit: string; lbl: string };

const STATS: Stat[] = [
  { num: "94.2", unit: "%", lbl: "turn pass rate" },
  { num: "$0.004", unit: "/turn", lbl: "avg. token cost" },
  { num: "2.1M", unit: "", lbl: "turns checked" },
  { num: "37", unit: "", lbl: "checkpoints supported" },
];

export function Stats() {
  return (
    <section className="s" style={{ paddingTop: 72, paddingBottom: 72 }}>
      <div className="wrap">
        <div className="mile">
          <div className="marker">M</div>
          <span>signed manifest</span>
        </div>
        <div className="roster" style={{ marginTop: 24 }}>
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
