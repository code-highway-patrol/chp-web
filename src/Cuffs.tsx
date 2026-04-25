import { AsciiPhysicsArt } from "./AsciiPhysicsArt";

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
  O: 0.55,
  w: 0.55,
};

const LITERAL_CHARS = new Set(["O", "w"]);

// CSS rotates the rendered art by -50°. The shared physics component rotates
// mouse coords by the inverse to recover unrotated cell coords for repulsion.
const ROTATION_DEG = -50;

export function Cuffs() {
  return (
    <AsciiPhysicsArt
      art={ART}
      brightnessMap={BRIGHTNESS_MAP}
      literalChars={LITERAL_CHARS}
      rotationDeg={ROTATION_DEG}
      artClassName="cuffs-art"
      rowClassName="cuffs-row"
    />
  );
}
