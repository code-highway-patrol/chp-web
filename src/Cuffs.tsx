import { useEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  walkLineRanges,
  materializeLineRange,
} from "@chenglou/pretext";

const FONT = '13px "Geist Mono", ui-monospace, Menlo, monospace';
const ROWS = 22;
const COLS = 64;
const CANDIDATE_CHARS = " .,-_~:;!=+*#%@&$";

const K1 = COLS * 0.55;
const K2 = 5;

// World ↔ grid mapping. We render in world space then project with the same K1/K2
// the donut.c renderer used so the chain particles share the same coordinate system.
function projectX(wx: number): number {
  return ((COLS / 2 + (K1 / K2) * wx) | 0);
}
function projectY(wy: number): number {
  // Y stretch keeps the cuff a tall vertical C, not a flat saucer.
  return ((ROWS / 2 - (K1 / K2) * wy) | 0);
}

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

function splat(
  field: Float32Array,
  W: number,
  H: number,
  xp: number,
  yp: number,
  intensity: number,
): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = xp + dx;
      const y = yp + dy;
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const w = dx === 0 && dy === 0 ? 1.0 : dx === 0 || dy === 0 ? 0.55 : 0.32;
      const idx = y * W + x;
      field[idx] = Math.min(1, field[idx] + intensity * w);
    }
  }
}

// Paint an upright elliptical ring (cuff outline) into the brightness field.
// Tall aspect: Rb (vertical radius) > Ra (horizontal radius) → tall vertical C.
// Tube thickness given by inner/outer ellipse pair, sampled radially.
function paintRingOutline(
  field: Float32Array,
  cx: number,
  cy: number,
  Ra: number,
  Rb: number,
  thickness: number,
  phiStart: number,
  phiEnd: number,
  intensity: number,
): void {
  const angularSamples = 360;
  const radialSamples = 5; // outer-to-inner samples for tube thickness
  const span = phiEnd - phiStart;
  for (let i = 0; i <= angularSamples; i++) {
    const phi = phiStart + span * (i / angularSamples);
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    for (let j = 0; j < radialSamples; j++) {
      const t = j / (radialSamples - 1); // 0 = outer, 1 = inner
      const r = 1 - t * (thickness / Math.max(Ra, Rb));
      const wx = cx + r * Ra * cp;
      const wy = cy + r * Rb * sp;
      // Shading: brighter on outside ring, dimmer on inside (suggests 3D tube).
      const lum = intensity * (0.55 + 0.45 * (1 - t));
      const xp = projectX(wx);
      const yp = projectY(wy);
      splat(field, COLS, ROWS, xp, yp, lum);
    }
  }
}

const CUFF_RA = 0.42; // horizontal half-width
const CUFF_RB = 1.05; // vertical half-height (taller than wide → upright C)
const CUFF_THICKNESS = 0.28; // tube thickness in world units
const CUFF_X = 1.55;

// Left cuff opens RIGHT (chain side): skip phi near 0 (the +x of its local frame).
const LEFT_PHI = [Math.PI * 0.30, Math.PI * 1.70] as const;
// Right cuff opens LEFT: skip phi near π.
const RIGHT_PHI = [-Math.PI * 0.70, Math.PI * 0.70] as const;

type Particle = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  weight: number;
};

const CHAIN_LINKS = 5;
const PARTICLES_PER_LINK = 14;
const CHAIN_X_RANGE = 1.0;

function makeChainParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < CHAIN_LINKS; i++) {
    const t = (i + 1) / (CHAIN_LINKS + 1);
    const cx = -CHAIN_X_RANGE + t * 2 * CHAIN_X_RANGE;
    const linkRadius = 0.13;
    for (let j = 0; j < PARTICLES_PER_LINK; j++) {
      const angle = (j / PARTICLES_PER_LINK) * Math.PI * 2;
      const px = cx + Math.cos(angle) * linkRadius;
      const py = Math.sin(angle) * linkRadius * 0.6;
      particles.push({
        x: px,
        y: py,
        rx: px,
        ry: py,
        vx: 0,
        vy: 0,
        weight: 0.95,
      });
    }
  }
  return particles;
}

const SPRING_K = 14;
const DAMP = 3.4;
const REPULSE_STRENGTH = 4.2;
const REPULSE_RANGE = 1.6;

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

export function Cuffs() {
  const [ramp, setRamp] = useState<RampEntry[]>([]);
  const [rows, setRows] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    sep: 0,
    hoverActive: false,
    mouseWX: 0,
    mouseWY: 0,
    particles: makeChainParticles(),
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

      const hovering = st.hoverActive;
      const mouseInChain =
        hovering &&
        Math.abs(st.mouseWX) < CHAIN_X_RANGE + 0.3 &&
        Math.abs(st.mouseWY) < 0.45;
      st.sep += ((mouseInChain ? 0.15 : 0) - st.sep) * Math.min(1, dt * 4);

      for (const p of st.particles) {
        let fx = (p.rx - p.x) * SPRING_K - p.vx * DAMP;
        let fy = (p.ry - p.y) * SPRING_K - p.vy * DAMP;
        if (hovering) {
          const dx = p.x - st.mouseWX;
          const dy = p.y - st.mouseWY;
          const d2 = dx * dx + dy * dy + 0.05;
          if (d2 < REPULSE_RANGE * REPULSE_RANGE) {
            const mult = mouseInChain ? 2.4 : 0.45;
            const forceMag = (REPULSE_STRENGTH * mult) / d2;
            fx += dx * forceMag;
            fy += dy * forceMag;
          }
        }
        p.vx += fx * dt;
        p.vy += fy * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      const field = new Float32Array(COLS * ROWS);
      paintRingOutline(
        field,
        -CUFF_X - st.sep, 0,
        CUFF_RA, CUFF_RB, CUFF_THICKNESS,
        LEFT_PHI[0], LEFT_PHI[1],
        1,
      );
      paintRingOutline(
        field,
        CUFF_X + st.sep, 0,
        CUFF_RA, CUFF_RB, CUFF_THICKNESS,
        RIGHT_PHI[0], RIGHT_PHI[1],
        1,
      );

      for (const p of st.particles) {
        const xp = projectX(p.x);
        const yp = projectY(p.y);
        const drift = Math.hypot(p.x - p.rx, p.y - p.ry);
        const weight = p.weight * Math.max(0.25, 1 - drift * 0.5);
        splat(field, COLS, ROWS, xp, yp, weight);
      }

      const raw: string[] = [];
      for (let y = 0; y < ROWS; y++) {
        let row = "";
        for (let x = 0; x < COLS; x++) {
          row += pickChar(ramp, field[y * COLS + x]);
        }
        raw.push(row);
      }
      const measured = raw.map((r) => pretextRoundTrip(r, FONT, 99999));
      setRows(measured);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ramp]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const art = card.querySelector(".cuffs-art") as HTMLElement | null;
    if (!art) return;
    const artRect = art.getBoundingClientRect();
    const u = (e.clientX - artRect.left) / artRect.width;
    const v = (e.clientY - artRect.top) / artRect.height;
    const halfWX = ((COLS / 2) / (K1 / K2));
    const halfWY = ((ROWS / 2) / (K1 / K2));
    const wx = (u - 0.5) * 2 * halfWX;
    const wy = -(v - 0.5) * 2 * halfWY;
    const st = stateRef.current;
    st.mouseWX = wx;
    st.mouseWY = wy;
    st.hoverActive = localX >= 0 && localY >= 0 && localX <= rect.width && localY <= rect.height;
  };

  const onLeave = () => {
    stateRef.current.hoverActive = false;
  };

  return (
    <div
      className="cuffs-card"
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="cuffs-art" aria-hidden="true">
        {rows.map((row, i) => (
          <div className="cuffs-row" key={i}>
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
