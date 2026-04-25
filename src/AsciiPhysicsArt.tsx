import { useEffect, useMemo, useRef, useState } from "react";
import {
  prepareWithSegments,
  walkLineRanges,
  materializeLineRange,
} from "@chenglou/pretext";

const FONT = '13px "Geist Mono", ui-monospace, Menlo, monospace';
const CANDIDATE_CHARS = " .,-_~:;!=+*#%@&$";

const SPRING_K = 6;
const DAMP = 2.6;
const REPULSE_RADIUS_CELLS = 10;
const REPULSE_K = 230;
const MAX_V = 32;

const CELL_W = 7.5;
const CELL_H = 14;

let bCanvas: HTMLCanvasElement | null = null;
let bCtx: CanvasRenderingContext2D | null = null;

function brightness(ch: string, font: string): number {
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

type RampEntry = { ch: string; b: number; w: number };

function buildRamp(font: string): RampEntry[] {
  const entries: RampEntry[] = [];
  for (const ch of CANDIDATE_CHARS) {
    const prepared = prepareWithSegments(ch, font);
    const w = prepared.widths[0] ?? 0;
    if (w <= 0 && ch !== " ") continue;
    entries.push({ ch, b: brightness(ch, font), w });
  }
  entries.sort((a, b) => a.b - b.b);
  return entries.length ? entries : [{ ch: " ", b: 0, w: 0 }];
}

function pickChar(ramp: RampEntry[], lum: number): string {
  if (lum <= 0.04) return " ";
  const clamped = Math.max(0, Math.min(1, lum));
  const idx = Math.min(ramp.length - 1, Math.round(clamped * (ramp.length - 1)));
  return ramp[idx].ch;
}

function pretextRoundTrip(rawRow: string, font: string, maxWidth: number): string {
  if (!rawRow.trim()) return rawRow;
  const prepared = prepareWithSegments(rawRow, font, { whiteSpace: "pre-wrap" });
  let materialized = "";
  walkLineRanges(prepared, maxWidth, (line) => {
    if (!materialized) {
      materialized = materializeLineRange(prepared, line).text;
    }
  });
  return materialized || rawRow;
}

type Particle = {
  rx: number;
  ry: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  intensity: number;
  literal: string | null;
  phase: number;
  region: string;
};

function makeParticles(
  art: readonly string[],
  brightnessMap: Record<string, number>,
  literalChars: ReadonlySet<string>,
  regions: readonly string[] | null,
  rows: number,
  cols: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let y = 0; y < rows; y++) {
    const row = art[y];
    const regionRow = regions ? regions[y] : null;
    for (let x = 0; x < cols; x++) {
      const ch = row[x] ?? " ";
      if (ch === " ") continue;
      const literal = literalChars.has(ch);
      const intensity = brightnessMap[ch] ?? 0;
      if (intensity <= 0) continue;
      const region = regionRow?.[x] ?? "";
      particles.push({
        rx: x,
        ry: y,
        x,
        y,
        vx: 0,
        vy: 0,
        intensity,
        literal: literal ? ch : null,
        phase: Math.random() * Math.PI * 2,
        region,
      });
    }
  }
  return particles;
}

export type AsciiArtConfig = {
  art: readonly string[];
  brightnessMap: Record<string, number>;
  literalChars: ReadonlySet<string>;
  rotationDeg: number;
  artClassName: string;
  rowClassName: string;
  /** Per-cell region tag, parallel to `art`. Used to color brightness chars. */
  regions?: readonly string[];
  /** Map a region tag (e.g. 'F', 'D') to a CSS class for the span. */
  regionClass?: Record<string, string>;
  /** Map a literal char (e.g. '/') to its own CSS class for the span. */
  literalClass?: Record<string, string>;
};

type Cell = { ch: string; klass: string };

export function AsciiPhysicsArt({
  art,
  brightnessMap,
  literalChars,
  rotationDeg,
  artClassName,
  rowClassName,
  regions,
  regionClass,
  literalClass,
}: AsciiArtConfig) {
  const ROWS = art.length;
  const COLS = art[0].length;
  const invRotationRad = useMemo(
    () => (-rotationDeg * Math.PI) / 180,
    [rotationDeg],
  );

  const [ramp, setRamp] = useState<RampEntry[]>([]);
  const [rows, setRows] = useState<Cell[][]>([]);
  const artRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    hoverActive: false,
    mouseX: 0,
    mouseY: 0,
    particles: makeParticles(
      art,
      brightnessMap,
      literalChars,
      regions ?? null,
      ROWS,
      COLS,
    ),
  });

  useEffect(() => {
    const calibrate = () => setRamp(buildRamp(FONT));
    calibrate();
    if (document.fonts?.ready) void document.fonts.ready.then(calibrate);
  }, []);

  useEffect(() => {
    if (ramp.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;

      for (const p of st.particles) {
        let fx = (p.rx - p.x) * SPRING_K - p.vx * DAMP;
        let fy = (p.ry - p.y) * SPRING_K - p.vy * DAMP;
        if (st.hoverActive) {
          const dx = p.x - st.mouseX;
          const dy = p.y - st.mouseY;
          const d2 = dx * dx + dy * dy + 0.6;
          if (d2 < REPULSE_RADIUS_CELLS * REPULSE_RADIUS_CELLS) {
            const f = REPULSE_K / d2;
            fx += dx * f;
            fy += dy * f;
          }
        }
        p.vx += fx * dt;
        p.vy += fy * dt;
        const v = Math.hypot(p.vx, p.vy);
        if (v > MAX_V) {
          p.vx *= MAX_V / v;
          p.vy *= MAX_V / v;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      const field = new Float32Array(ROWS * COLS);
      const bestIntensity = new Float32Array(ROWS * COLS);
      const literalGrid: (string | null)[] = new Array(ROWS * COLS).fill(null);
      const regionGrid: string[] = new Array(ROWS * COLS).fill("");
      const literalKlass: string[] = new Array(ROWS * COLS).fill("");
      const tSec = now / 1000;
      for (const p of st.particles) {
        const cx = Math.round(p.x);
        const cy = Math.round(p.y);
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const idx = cy * COLS + cx;
        const drift = Math.hypot(p.x - p.rx, p.y - p.ry);
        const fade = Math.max(0.35, 1 - drift * 0.07);
        const shuffle = 1 + 0.075 * Math.sin(tSec * 1.2 + p.phase);
        const contribution = p.intensity * fade * shuffle;
        field[idx] = Math.min(1, field[idx] + contribution);
        if (contribution > bestIntensity[idx]) {
          bestIntensity[idx] = contribution;
          regionGrid[idx] = p.region;
          if (p.literal) {
            literalGrid[idx] = p.literal;
            literalKlass[idx] = literalClass?.[p.literal] ?? "";
          } else {
            literalGrid[idx] = null;
            literalKlass[idx] = "";
          }
        }
      }

      const out: Cell[][] = [];
      for (let y = 0; y < ROWS; y++) {
        const cells: Cell[] = [];
        for (let x = 0; x < COLS; x++) {
          const idx = y * COLS + x;
          const lit = literalGrid[idx];
          if (lit) {
            cells.push({ ch: lit, klass: literalKlass[idx] });
          } else {
            const ch = pickChar(ramp, field[idx]);
            const klass = regionClass?.[regionGrid[idx]] ?? "";
            cells.push({ ch, klass });
          }
        }
        // Run pretext on the row's plain text once for measurement, then carry
        // it back into per-cell chars when length matches; otherwise fall back
        // to the cell's char.
        const plain = cells.map((c) => c.ch).join("");
        const measured = pretextRoundTrip(plain, FONT, 99999);
        if (measured.length === cells.length) {
          for (let i = 0; i < cells.length; i++) {
            cells[i] = { ch: measured[i], klass: cells[i].klass };
          }
        }
        out.push(cells);
      }
      setRows(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ramp, ROWS, COLS, regionClass, literalClass]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = artRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const ca = Math.cos(invRotationRad);
    const sa = Math.sin(invRotationRad);
    const rdx = dx * ca - dy * sa;
    const rdy = dx * sa + dy * ca;
    const cellX = rdx / CELL_W + COLS / 2;
    const cellY = rdy / CELL_H + ROWS / 2;
    const st = stateRef.current;
    st.mouseX = cellX;
    st.mouseY = cellY;
    st.hoverActive = true;
  };

  const onLeave = () => {
    stateRef.current.hoverActive = false;
  };

  return (
    <div
      className="cuffs-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
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
      <div className={artClassName} ref={artRef} aria-hidden="true">
        {rows.map((cells, i) => (
          <div className={rowClassName} key={i}>
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
