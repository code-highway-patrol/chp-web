import { useEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  walkLineRanges,
  materializeLineRange,
} from "@chenglou/pretext";

const FONT = '13px "Geist Mono", ui-monospace, Menlo, monospace';
const CANDIDATE_CHARS = " .,-_~:;!=+*#%@&$";

// Hand-authored handcuff art. Each meta-char is a brightness level looked up
// in BRIGHTNESS_MAP and run through the donut.c-style ramp at render time, so
// the final output is a luminance-matched ASCII rendering of a fixed silhouette.
//
//   ' ' empty   '.' faint   '-' dim   '~' soft   '+' medium
//   '*' bright  '#' strong  '$' near-max  '@' max
//
// Top: closed ring + lock body. Middle: 6 chain links. Bottom: small lock body
// + asymmetric swing-arm hook that curves down-left, around, and ends in teeth.
const ART = [
  "                                ",
  "                                ",
  "          ~=#$@$$$@$#=~         ",
  "        +$@$#+~   ~+#$@$+       ",
  "      +$@$+         +$@$+       ",
  "     *@%               %@*      ",
  "    *@%                 %@*     ",
  "    $@                   @$     ",
  "    $@                   @$     ",
  "    $@                   @$     ",
  "    *@%                 %@*     ",
  "     *@%               %@*      ",
  "      +$@$+         +$@$+       ",
  "        +$@$#+~   ~+#$@$+       ",
  "          ~=#$@$$$@$#=~         ",
  "                                ",
  "          $$$$$$$$$$$$$         ",
  "          $@@@-:O:-@@@$         ",
  "          $@@@@@@@@@@@$         ",
  "          $$$$$$$$$$$$$         ",
  "                                ",
  "                $               ",
  "               $@$              ",
  "                $               ",
  "             =$$@@$$=           ",
  "                $               ",
  "               $@$              ",
  "                $               ",
  "             =$$@@$$=           ",
  "                $               ",
  "               $@$              ",
  "                $               ",
  "             =$$@@$$=           ",
  "                                ",
  "            ~$$$$$$$~           ",
  "            $@@:O:@@$           ",
  "            $@@@@@@@$           ",
  "            ~$$$$$$$~           ",
  "            $@%~                ",
  "           $@%                  ",
  "          $@%                   ",
  "         $@%                    ",
  "         $@%                    ",
  "         $@%                    ",
  "          %@%                   ",
  "           %@%~                 ",
  "             ~%@%~              ",
  "                ~%@%~ww         ",
  "                    ~%@$ww      ",
  "                                ",
  "                                ",
];

const ROWS = ART.length;
const COLS = ART[0].length;

const BRIGHTNESS_MAP: Record<string, number> = {
  " ": 0,
  ".": 0.18,
  "-": 0.30,
  "~": 0.36,
  ":": 0.42,
  "=": 0.48,
  "+": 0.54,
  "*": 0.62,
  "%": 0.70,
  "#": 0.78,
  "$": 0.88,
  "@": 1.0,
  // Detail chars rendered literally as themselves (force their own brightness):
  O: 0.55,
  w: 0.55,
};

const LITERAL_CHARS = new Set(["O", "w"]);

// CSS rotates the rendered art by -50°. Mouse events arrive in screen space,
// so to find which cell the cursor sits over we rotate the cursor by +50°
// around the art's visual center to recover unrotated cell coords.
const ROTATION_DEG = -50;
const INV_ROTATION_RAD = (-ROTATION_DEG * Math.PI) / 180;

// Approximate cell pixel size at 13px Geist Mono with line-height 14px.
// Used only for the inverse mapping; small inaccuracies are fine since
// repulsion is radial and forgiving.
const CELL_W = 7.5;
const CELL_H = 14;

// Smash-physics tuning. Weak spring + low damping lets particles keep flying
// after the cursor pushes them; strong repulsion gives the initial blast.
// MAX_V caps runaway velocity for particles deep inside the kernel.
const SPRING_K = 6;
const DAMP = 2.6;
const REPULSE_RADIUS_CELLS = 10;
const REPULSE_K = 230;
const MAX_V = 32;

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
};

function makeParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let y = 0; y < ROWS; y++) {
    const row = ART[y];
    for (let x = 0; x < COLS; x++) {
      const ch = row[x] ?? " ";
      if (ch === " ") continue;
      const literal = LITERAL_CHARS.has(ch);
      const intensity = BRIGHTNESS_MAP[ch] ?? 0;
      if (intensity <= 0) continue;
      particles.push({
        rx: x,
        ry: y,
        x,
        y,
        vx: 0,
        vy: 0,
        intensity,
        literal: literal ? ch : null,
        // Random phase so the brightness shuffle isn't synchronized.
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return particles;
}

export function Cuffs() {
  const [ramp, setRamp] = useState<RampEntry[]>([]);
  const [rows, setRows] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    hoverActive: false,
    mouseX: 0,
    mouseY: 0,
    particles: makeParticles(),
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
        // Cap velocity so particles deep inside the kernel don't tunnel through
        // the grid in one frame.
        const v = Math.hypot(p.vx, p.vy);
        if (v > MAX_V) {
          p.vx *= MAX_V / v;
          p.vy *= MAX_V / v;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      const field = new Float32Array(ROWS * COLS);
      const literalGrid: (string | null)[] = new Array(ROWS * COLS).fill(null);
      const tSec = now / 1000;
      for (const p of st.particles) {
        const cx = Math.round(p.x);
        const cy = Math.round(p.y);
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const idx = cy * COLS + cx;
        // Far-from-rest particles render dimmer — reads as "breaking off"
        // instead of just relocating intact. Recovers as the particle springs
        // back toward its rest cell.
        const drift = Math.hypot(p.x - p.rx, p.y - p.ry);
        const fade = Math.max(0.35, 1 - drift * 0.07);
        // Idle shuffle: small per-particle brightness oscillation. With the
        // ramp's quantization, ±~7% jitter is enough for chars to occasionally
        // swap with their ramp neighbors → the cuffs look alive at rest.
        const shuffle = 1 + 0.075 * Math.sin(tSec * 1.2 + p.phase);
        field[idx] = Math.min(1, field[idx] + p.intensity * fade * shuffle);
        if (p.literal && literalGrid[idx] === null) literalGrid[idx] = p.literal;
      }

      const raw: string[] = [];
      for (let y = 0; y < ROWS; y++) {
        let row = "";
        for (let x = 0; x < COLS; x++) {
          const idx = y * COLS + x;
          const lit = literalGrid[idx];
          if (lit) row += lit;
          else row += pickChar(ramp, field[idx]);
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
    const art = artRef.current;
    if (!art) return;
    // Rotation pivots the un-rotated content around its visual center; the
    // bounding box of the rotated element is centered on the same point.
    const rect = art.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const ca = Math.cos(INV_ROTATION_RAD);
    const sa = Math.sin(INV_ROTATION_RAD);
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
      ref={cardRef}
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
      <div className="cuffs-art" ref={artRef} aria-hidden="true">
        {rows.map((row, i) => (
          <div className="cuffs-row" key={i}>
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
