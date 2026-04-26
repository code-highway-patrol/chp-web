import { useEffect, useRef, useState } from "react";

// 3D spinning donut, riffing on Andy Sloane's classic donut.c. A torus is
// sampled in (theta, phi), rotated by two angles, projected to the grid, then
// rasterized through a luminance ramp. The frosting/dough split tracks the
// torus's local upper/lower hemisphere, so it spins with the donut. Sprinkles
// are fixed (theta, phi) points on the frosted face that ride along.

const COLS = 62;
const ROWS = 36;

const R1 = 1.0;
const R2 = 2.0;
const K2 = 5.0;
const K1 = 34;
const ASPECT = 14 / 7.5;

const THETA_STEP = 0.10;
const PHI_STEP = 0.025;

const SPIN_A_RATE = 0.55;
const SPIN_B_RATE = 0.95;

const RAMP = ".,-~:;=!*#$@";

const REPULSE_R = 8.5;
const REPULSE_K = 12;
const REPULSE_FADE_PER_SEC = 6;

const SPRINKLE_DEFS: { ch: string; klass: string }[] = [
  { ch: "/", klass: "donut-s-red" },
  { ch: "\\", klass: "donut-s-blue" },
  { ch: "o", klass: "donut-s-yellow" },
  { ch: "i", klass: "donut-s-orange" },
  { ch: "O", klass: "donut-s-green" },
  { ch: "r", klass: "donut-s-purple" },
];

type Sprinkle = {
  theta: number;
  phi: number;
  ch: string;
  klass: string;
};

function makeSprinkles(n: number): Sprinkle[] {
  const out: Sprinkle[] = [];
  for (let i = 0; i < n; i++) {
    // Frosted face is the upper torus hemisphere: sin(theta) > 0.
    // Concentrate near the crown (theta near pi/2) for a clean look.
    const theta = 0.22 * Math.PI + Math.random() * 0.56 * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    const def = SPRINKLE_DEFS[Math.floor(Math.random() * SPRINKLE_DEFS.length)];
    out.push({ theta, phi, ch: def.ch, klass: def.klass });
  }
  return out;
}

type Cell = { ch: string; klass: string };

export function Donut() {
  const [rows, setRows] = useState<Cell[][]>([]);
  const artRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    A: 0.4,
    B: 0,
    hoverActive: false,
    mouseX: 0,
    mouseY: 0,
    repulse: 0,
    sprinkles: makeSprinkles(34),
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const N = COLS * ROWS;
    const charBuf: string[] = new Array(N);
    const klassBuf: string[] = new Array(N);
    const zbuf = new Float32Array(N);
    const TWO_PI = Math.PI * 2;
    const INV_SQRT2 = 1 / Math.SQRT2;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      st.A += SPIN_A_RATE * dt;
      st.B += SPIN_B_RATE * dt;
      const target = st.hoverActive ? 1 : 0;
      st.repulse += (target - st.repulse) * Math.min(1, dt * REPULSE_FADE_PER_SEC);

      charBuf.fill(" ");
      klassBuf.fill("");
      zbuf.fill(0);

      const cosA = Math.cos(st.A);
      const sinA = Math.sin(st.A);
      const cosB = Math.cos(st.B);
      const sinB = Math.sin(st.B);
      const repulseOn = st.repulse > 0.01;
      const mx = st.mouseX;
      const my = st.mouseY;
      const repulseStr = REPULSE_K * st.repulse;
      const repulseR2 = REPULSE_R * REPULSE_R;

      for (let theta = 0; theta < TWO_PI; theta += THETA_STEP) {
        const cT = Math.cos(theta);
        const sT = Math.sin(theta);
        const circleX = R2 + R1 * cT;
        const ringZ = R1 * sT;
        const upperHalf = sT > 0;

        for (let phi = 0; phi < TWO_PI; phi += PHI_STEP) {
          const cP = Math.cos(phi);
          const sP = Math.sin(phi);

          // Local torus point: ring lies in XY plane, axis along Z.
          const px = circleX * cP;
          const py = circleX * sP;
          const pz = ringZ;

          // Pitch by A around X, then yaw by B around Y (donut.c convention).
          const y1 = py * cosA - pz * sinA;
          const z1 = py * sinA + pz * cosA;
          const x2 = px * cosB + z1 * sinB;
          const z2 = -px * sinB + z1 * cosB;

          const wz = z2 + K2;
          if (wz < 0.1) continue;
          const ooz = 1 / wz;

          let xp = COLS / 2 + K1 * ooz * x2;
          let yp = ROWS / 2 - (K1 * ooz * y1) / ASPECT;

          if (repulseOn) {
            const dx = xp - mx;
            const dy = yp - my;
            const d2 = dx * dx + dy * dy + 0.6;
            if (d2 < repulseR2) {
              const f = repulseStr / d2;
              xp += dx * f;
              yp += dy * f;
            }
          }

          const cx = Math.round(xp);
          const cy = Math.round(yp);
          if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
          const idx = cy * COLS + cx;
          if (ooz <= zbuf[idx]) continue;

          // Surface normal in local frame, rotated identically to the point.
          const nly = cT * sP;
          const nlz = sT;
          const ny1 = nly * cosA - nlz * sinA;
          const nz1 = nly * sinA + nlz * cosA;
          const nz2 = -(cT * cP) * sinB + nz1 * cosB;
          // Light direction (0, 1, -1) / sqrt(2).
          const L = (ny1 - nz2) * INV_SQRT2;
          if (L <= 0) continue;

          zbuf[idx] = ooz;
          const ridx = Math.min(
            RAMP.length - 1,
            Math.max(0, Math.floor(L * RAMP.length)),
          );
          charBuf[idx] = RAMP[ridx];
          klassBuf[idx] = upperHalf ? "donut-frosting" : "donut-dough";
        }
      }

      // Sprinkle overlay — only when on a front-facing surface point that the
      // body donut also rendered (zbuffer match within tolerance).
      for (const s of st.sprinkles) {
        const cT = Math.cos(s.theta);
        const sT = Math.sin(s.theta);
        const cP = Math.cos(s.phi);
        const sP = Math.sin(s.phi);
        const circleX = R2 + R1 * cT;
        const px = circleX * cP;
        const py = circleX * sP;
        const pz = R1 * sT;
        const y1 = py * cosA - pz * sinA;
        const z1 = py * sinA + pz * cosA;
        const x2 = px * cosB + z1 * sinB;
        const z2 = -px * sinB + z1 * cosB;
        const wz = z2 + K2;
        if (wz < 0.1) continue;
        const ooz = 1 / wz;

        const nly = cT * sP;
        const nlz = sT;
        const nz1 = nly * sinA + nlz * cosA;
        const nz2_world = -(cT * cP) * sinB + nz1 * cosB;
        // Camera looks toward -Z; front-facing means normal . (0,0,-1) > 0
        // i.e. nz2 < 0. Reject back-facing sprinkles.
        if (nz2_world >= 0) continue;

        let xp = COLS / 2 + K1 * ooz * x2;
        let yp = ROWS / 2 - (K1 * ooz * y1) / ASPECT;
        if (repulseOn) {
          const dx = xp - mx;
          const dy = yp - my;
          const d2 = dx * dx + dy * dy + 0.6;
          if (d2 < repulseR2) {
            const f = repulseStr / d2;
            xp += dx * f;
            yp += dy * f;
          }
        }
        const cx = Math.round(xp);
        const cy = Math.round(yp);
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const idx = cy * COLS + cx;
        if (zbuf[idx] === 0) continue;
        if (ooz < zbuf[idx] - 0.05) continue;
        charBuf[idx] = s.ch;
        klassBuf[idx] = s.klass;
      }

      const out: Cell[][] = new Array(ROWS);
      for (let y = 0; y < ROWS; y++) {
        const cells: Cell[] = new Array(COLS);
        const rowBase = y * COLS;
        for (let x = 0; x < COLS; x++) {
          cells[x] = { ch: charBuf[rowBase + x], klass: klassBuf[rowBase + x] };
        }
        out[y] = cells;
      }
      setRows(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = artRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    const st = stateRef.current;
    st.mouseX = (e.clientX - rect.left) / cellW;
    st.mouseY = (e.clientY - rect.top) / cellH;
    st.hoverActive = true;
  };

  const onLeave = () => {
    stateRef.current.hoverActive = false;
  };

  return (
    <div className="cuffs-card" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="cuffs-hint" aria-hidden="true">
        <span>hover me</span>
        <svg
          className="cuffs-hint-arrow"
          width="86"
          height="58"
          viewBox="0 0 86 58"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 4 50 Q 38 56 56 40 Q 70 30 72 10" />
          <path d="M 64 18 L 72 10 L 80 18" />
        </svg>
      </div>
      <div className="donut-art" ref={artRef} aria-hidden="true">
        {rows.map((cells, i) => (
          <div className="donut-row" key={i}>
            {cells.map((c, j) =>
              c.klass ? (
                <span className={c.klass} key={j}>
                  {c.ch}
                </span>
              ) : (
                c.ch
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
