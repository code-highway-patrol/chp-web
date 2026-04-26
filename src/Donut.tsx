import { useEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  walkLineRanges,
  materializeLineRange,
} from "@chenglou/pretext";
import dispatcherSrc from "./donut-source/dispatcher.sh?raw";
import checkRunnerSrc from "./donut-source/check-runner.sh?raw";
import commonSrc from "./donut-source/common.sh?raw";

// 3D spinning donut, riffing on Andy Sloane's classic donut.c. A torus is
// sampled in (theta, phi), pitch/yaw rotated, projected to the grid, then
// rasterized through a brightness-gated character pick. The visible (lit)
// surface is textured with the real bash that ships in chp/core (the same
// dispatcher.sh, check-runner.sh, and common.sh that route every CHP hook),
// vendored as ?raw so the donut wears actual production source on its skin.
// Pretext handles font-width sanity (filtering zero-width chars) and per-row
// layout normalization, matching the rest of the site's ASCII components.

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

const SPIN_A_RATE = 0.22;
const SPIN_B_RATE = 0.38;

// Hover ejects chars off the donut surface like sparks. Newly spawned chars
// inherit their color from the cell they came from and arc outward under
// gravity until their lifespan runs out or they leave the grid.
const EJECT_RADIUS = 3.5;
const EJECT_PER_FRAME = 5;
const EJECT_SPEED_MIN = 18;
const EJECT_SPEED_MAX = 32;
const EJECT_TANGENT = 6;
const EJECT_LIFETIME = 0.55;
const EJECT_GRAVITY = 12;
const EJECT_DRAG = 0.7;

// Real bash from chp/core, vendored under ./donut-source/ and imported at
// build time. Strip shebangs/comments so the surface is textured with code
// (function bodies, conditionals, jq pipelines) rather than English prose,
// then collapse all whitespace into single spaces, since the donut maps each
// (theta, phi) cell to one char of this string, so multi-line indentation
// would just waste cells on invisible characters.
const SOURCE_RAW = [dispatcherSrc, checkRunnerSrc, commonSrc]
  .join("\n")
  .replace(/^\s*#.*$/gm, "")
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

// Canvas-measured ink density per char — the visual "brightness" of a
// glyph. Combined with pretext's width check, drives the luminance ramp
// that maps every surface point to its character.
let bCanvas: HTMLCanvasElement | null = null;
let bCtx: CanvasRenderingContext2D | null = null;

function inkDensity(ch: string, font: string): number {
  if (!bCanvas) {
    bCanvas = document.createElement("canvas");
    bCanvas.width = 28;
    bCanvas.height = 28;
    bCtx = bCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!bCtx) return 0;
  bCtx.clearRect(0, 0, 28, 28);
  bCtx.font = font;
  bCtx.fillStyle = "#fff";
  bCtx.textBaseline = "middle";
  bCtx.fillText(ch, 1, 14);
  const { data } = bCtx.getImageData(0, 0, 28, 28);
  let sum = 0;
  for (let i = 3; i < data.length; i += 4) sum += data[i];
  return sum / (255 * 28 * 28);
}

type RampEntry = { ch: string; b: number };

const RAMP_BASE = " .,-_~:;!=+*#%@&$";

function buildCandidates(): string {
  const set = new Set<string>(RAMP_BASE);
  for (const ch of SOURCE_RAW) set.add(ch);
  set.delete("\n");
  return Array.from(set).join("");
}

// Build the full ramp: width-validate every candidate via pretext, ink-
// measure via canvas, sort ascending by ink. The donut surface is then
// drawn entirely by indexing this ramp with computed luminance.
function buildRamp(font: string): {
  ramp: RampEntry[];
  brightnessOf: Map<string, number>;
} {
  const candidates = buildCandidates();
  const entries: RampEntry[] = [];
  const map = new Map<string, number>();
  for (const ch of candidates) {
    const prepared = prepareWithSegments(ch, font);
    const w = prepared.widths[0] ?? 0;
    if (w <= 0 && ch !== " ") continue;
    const b = inkDensity(ch, font);
    entries.push({ ch, b });
    map.set(ch, b);
  }
  entries.sort((a, b) => a.b - b.b);
  if (!entries.length) entries.push({ ch: " ", b: 0 });
  return { ramp: entries, brightnessOf: map };
}

function pickFromRamp(ramp: RampEntry[], lum: number): string {
  if (lum <= 0.04) return " ";
  const clamped = lum >= 1 ? 1 : lum;
  const idx = Math.min(
    ramp.length - 1,
    Math.round(clamped * (ramp.length - 1)),
  );
  return ramp[idx].ch;
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

type Ejected = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  klass: string;
  life: number;
};

type Calibration = {
  source: string;
  ramp: RampEntry[];
  brightnessOf: Map<string, number>;
};

export function Donut() {
  const [rows, setRows] = useState<Cell[][]>([]);
  const [calib, setCalib] = useState<Calibration | null>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    A: 0.4,
    B: 0,
    hoverActive: false,
    mouseX: 0,
    mouseY: 0,
    selecting: false,
    sprinkles: makeSprinkles(34),
    ejected: [] as Ejected[],
  });

  useEffect(() => {
    const onUp = () => {
      stateRef.current.selecting = false;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    const calibrate = () => {
      const { ramp, brightnessOf } = buildRamp(FONT);
      const source = buildSourceString(FONT);
      setCalib({ source, ramp, brightnessOf });
    };
    calibrate();
    if (document.fonts?.ready) void document.fonts.ready.then(calibrate);
  }, []);

  useEffect(() => {
    if (!calib) return;
    const { source, ramp, brightnessOf } = calib;
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

      // Freeze every frame-mutating step while the user is selecting text
      // inside the donut — otherwise the per-frame DOM replace tears down
      // the selection's anchor node mid-drag and you can never actually
      // highlight a span of bash. We freeze on mousedown (selecting flag)
      // and stay frozen as long as the resulting selection is non-collapsed
      // inside the donut. RAF keeps ticking so we resume the instant the
      // selection collapses or the mouse releases without a selection.
      const sel =
        typeof document !== "undefined" ? document.getSelection() : null;
      const artEl = artRef.current;
      const stateNow = stateRef.current;
      const hasSelection =
        !!sel &&
        sel.rangeCount > 0 &&
        !sel.isCollapsed &&
        !!sel.anchorNode &&
        !!artEl &&
        artEl.contains(sel.anchorNode);
      if (stateNow.selecting || hasSelection) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const st = stateRef.current;
      st.A += SPIN_A_RATE * dt;
      st.B += SPIN_B_RATE * dt;

      charBuf.fill(" ");
      klassBuf.fill("");
      zbuf.fill(0);

      const cosA = Math.cos(st.A);
      const sinA = Math.sin(st.A);
      const cosB = Math.cos(st.B);
      const sinB = Math.sin(st.B);
      const mx = st.mouseX;
      const my = st.mouseY;

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

          const xp = COLS / 2 + K1 * ooz * x2;
          const yp = ROWS / 2 - (K1 * ooz * y1) / ASPECT;

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

          // Pretext-driven char pick: every cell's char comes from the
          // ink-measured luminance ramp. If the bash source's char at this
          // (theta, phi) happens to match the surface luminance closely
          // enough, the donut "wears" that source char instead — so the
          // skin is real bash where it visually fits, and ramp chars
          // everywhere else, all measured by pretext + canvas.
          const lumNorm = L >= 1.414 ? 1 : L * 0.7071;
          const codeIdx = (tIdx * 7 + pIdx) % sourceLen;
          const sc = source[codeIdx];
          const scB = sc ? (brightnessOf.get(sc) ?? -1) : -1;
          const fits =
            sc !== undefined &&
            sc !== " " &&
            scB >= 0 &&
            Math.abs(scB - lumNorm) < 0.18;
          const ch = fits ? sc : pickFromRamp(ramp, lumNorm);

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

        const xp = COLS / 2 + K1 * ooz * x2;
        const yp = ROWS / 2 - (K1 * ooz * y1) / ASPECT;
        const cx = Math.round(xp);
        const cy = Math.round(yp);
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const idx = cy * COLS + cx;
        if (zbuf[idx] === 0) continue;
        if (ooz < zbuf[idx] - 0.05) continue;
        charBuf[idx] = s.ch;
        klassBuf[idx] = s.klass;
      }

      // Step 1: spawn new ejected chars by stealing from cells under the
      // cursor. Picking *after* the donut raster means we always grab the
      // freshest visible char from each cell, including sprinkles.
      // Velocity points outward from the donut's center through the cursor
      // so sparks fly off the donut's rim away from the camera plane,
      // instead of radiating around the cursor and arcing back across the
      // far side of the surface.
      if (st.hoverActive) {
        const ox = mx - COLS / 2;
        const oy = my - ROWS / 2;
        const od = Math.sqrt(ox * ox + oy * oy) || 1;
        const outX = ox / od;
        const outY = oy / od;
        const tanX = -outY;
        const tanY = outX;
        for (let i = 0; i < EJECT_PER_FRAME; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * EJECT_RADIUS;
          const sx = mx + Math.cos(ang) * r;
          const sy = my + Math.sin(ang) * r;
          const ccx = Math.round(sx);
          const ccy = Math.round(sy);
          if (ccx < 0 || ccx >= COLS || ccy < 0 || ccy >= ROWS) continue;
          const idx = ccy * COLS + ccx;
          const ch = charBuf[idx];
          if (!ch || ch === " " || ch === "." || ch === ",") continue;
          const klass = klassBuf[idx];
          const speed =
            EJECT_SPEED_MIN +
            Math.random() * (EJECT_SPEED_MAX - EJECT_SPEED_MIN);
          const tan = (Math.random() - 0.5) * EJECT_TANGENT;
          const vx = outX * speed + tanX * tan;
          const vy = outY * speed + tanY * tan;
          st.ejected.push({ x: sx, y: sy, vx, vy, ch, klass, life: 1 });
        }
      }

      // Step 2: integrate ejected chars and drop dead ones.
      const live: Ejected[] = [];
      for (const p of st.ejected) {
        p.life -= dt / EJECT_LIFETIME;
        if (p.life <= 0) continue;
        const drag = 1 - dt * EJECT_DRAG;
        p.vx *= drag;
        p.vy *= drag;
        p.vy += EJECT_GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -1 || p.x > COLS + 1 || p.y > ROWS + 1) continue;
        live.push(p);
      }
      st.ejected = live;

      // Step 3: render ejected chars on top of the donut. As life decays,
      // step each spark down through the pretext-calibrated ramp so it
      // fades through the same brightness gradient the donut surface uses.
      for (const p of st.ejected) {
        const cx = Math.round(p.x);
        const cy = Math.round(p.y);
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const idx = cy * COLS + cx;
        const ch = p.life > 0.7 ? p.ch : pickFromRamp(ramp, p.life * 0.55);
        charBuf[idx] = ch;
        klassBuf[idx] = p.klass;
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
  }, [calib]);

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

  const onMouseDown = () => {
    stateRef.current.selecting = true;
  };

  return (
    <div
      className="cuffs-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseDown={onMouseDown}
    >
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
