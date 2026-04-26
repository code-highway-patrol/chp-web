import { useEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  walkLineRanges,
  materializeLineRange,
} from "@chenglou/pretext";

// 3D spinning donut, riffing on Andy Sloane's classic donut.c. A torus is
// sampled in (theta, phi), pitch/yaw rotated, projected to the grid, then
// rasterized through a brightness-gated character pick. The visible (lit)
// surface is textured with real bash from chp/core/dispatcher.sh so the
// donut spins with CHP source code wrapped onto its skin. Pretext handles
// font-width sanity (filtering zero-width chars) and per-row layout
// normalization, matching the rest of the site's ASCII components.

const FONT = '13px "Geist Mono", ui-monospace, Menlo, monospace';

const COLS = 62;
const ROWS = 36;

const R1 = 1.0;
const R2 = 2.0;
const K2 = 5.0;
const K1 = 34;
const ASPECT = 14 / 7.5;

const THETA_STEP = 0.1;
const PHI_STEP = 0.025;

const SPIN_A_RATE = 0.55;
const SPIN_B_RATE = 0.95;

const REPULSE_R = 8.5;
const REPULSE_K = 12;
const REPULSE_FADE_PER_SEC = 6;

// Real bash, lifted from chp/core/dispatcher.sh.
const SOURCE_RAW = [
  '#!/usr/bin/env bash',
  'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
  'source "$SCRIPT_DIR/common.sh"',
  'source "$SCRIPT_DIR/hook-registry.sh"',
  'source "$SCRIPT_DIR/verifier.sh"',
  'source "$SCRIPT_DIR/check-runner.sh"',
  'source "$SCRIPT_DIR/law-mutate.sh"',
  'get_hook_context() {',
  '  local hook_type="$1"',
  '  case "$hook_type" in',
  '    pre-commit) echo "git diff --cached --name-only" ;;',
  '    pre-push)   echo "git diff --name-only HEAD @{u}" ;;',
  '    commit-msg) echo ".git/COMMIT_EDITMSG" ;;',
  '    pre-tool)   echo "tool_context" ;;',
  '  esac',
  '}',
  '_record_check_failures() {',
  '  local law_name="$1" stdout="$2"',
  '  while IFS= read -r line; do',
  '    check_id=$(echo "$line" | jq -r ".check_id")',
  '    status=$(echo "$line" | jq -r ".status")',
  '    if [[ "$status" == "FAIL" ]]; then',
  '      record_failure "$law_name" "$check_id"',
  '    fi',
  '  done <<< "$stdout"',
  '}',
]
  .join(" ")
  .replace(/\s+/g, " ")
  .trim();

// Drop any chars pretext reports as zero-width — those don't render as a
// single cell in the chosen font and would break alignment. Spaces stay so
// the donut surface can rest on whitespace where the source has it.
function buildSourceString(font: string): string {
  let out = "";
  for (const ch of SOURCE_RAW) {
    if (ch === " ") {
      out += ch;
      continue;
    }
    const prepared = prepareWithSegments(ch, font);
    const w = prepared.widths[0] ?? 0;
    if (w > 0) out += ch;
  }
  return out || SOURCE_RAW;
}

function pretextRoundTrip(rawRow: string, font: string): string {
  if (!rawRow.trim()) return rawRow;
  const prepared = prepareWithSegments(rawRow, font, { whiteSpace: "pre-wrap" });
  let materialized = "";
  walkLineRanges(prepared, 99999, (line) => {
    if (!materialized) materialized = materializeLineRange(prepared, line).text;
  });
  return materialized || rawRow;
}

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
  const [source, setSource] = useState<string>(SOURCE_RAW);
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
    const calibrate = () => setSource(buildSourceString(FONT));
    calibrate();
    if (document.fonts?.ready) void document.fonts.ready.then(calibrate);
  }, []);

  useEffect(() => {
    if (!source) return;
    const sourceLen = source.length;

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
      st.repulse +=
        (target - st.repulse) * Math.min(1, dt * REPULSE_FADE_PER_SEC);

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

      let tIdx = 0;
      for (let theta = 0; theta < TWO_PI; theta += THETA_STEP, tIdx++) {
        const cT = Math.cos(theta);
        const sT = Math.sin(theta);
        const circleX = R2 + R1 * cT;
        const ringZ = R1 * sT;
        const upperHalf = sT > 0;

        let pIdx = 0;
        for (let phi = 0; phi < TWO_PI; phi += PHI_STEP, pIdx++) {
          const cP = Math.cos(phi);
          const sP = Math.sin(phi);

          const px = circleX * cP;
          const py = circleX * sP;
          const pz = ringZ;

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

          const nly = cT * sP;
          const nlz = sT;
          const ny1 = nly * cosA - nlz * sinA;
          const nz1 = nly * sinA + nlz * cosA;
          const nz2 = -(cT * cP) * sinB + nz1 * cosB;
          const L = (ny1 - nz2) * INV_SQRT2;
          if (L <= 0) continue;

          // Brightness-gated char: dim rim falls back to a small ramp, lit
          // surface samples the bash source so the donut "wears" CHP code.
          // Code flows along phi (the major ring) so consecutive cells along
          // the donut's long axis are consecutive source chars, leaving
          // recognizable runs of bash visible on the surface.
          let ch: string;
          if (L < 0.12) ch = ".";
          else if (L < 0.22) ch = ",";
          else if (L < 0.32) ch = "~";
          else {
            const codeIdx = (tIdx * 7 + pIdx) % sourceLen;
            const sc = source[codeIdx];
            ch = sc === " " || !sc ? ":" : sc;
          }

          zbuf[idx] = ooz;
          charBuf[idx] = ch;
          klassBuf[idx] = upperHalf ? "donut-frosting" : "donut-dough";
        }
      }

      // Sprinkles overlay — front-facing only, must land on a body cell.
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
        const nz2 = -(cT * cP) * sinB + nz1 * cosB;
        if (nz2 >= 0) continue;

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
          cells[x] = {
            ch: charBuf[rowBase + x],
            klass: klassBuf[rowBase + x],
          };
        }
        // Pretext round-trip on the plain text so the row's measured layout
        // matches what the rest of the site uses; carry chars back if the
        // measured length lines up cell-for-cell.
        const plain = cells.map((c) => c.ch).join("");
        const measured = pretextRoundTrip(plain, FONT);
        if (measured.length === cells.length) {
          for (let i = 0; i < cells.length; i++) {
            cells[i] = { ch: measured[i], klass: cells[i].klass };
          }
        }
        out[y] = cells;
      }
      setRows(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [source]);

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
