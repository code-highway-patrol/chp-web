import { AsciiPhysicsArt } from "./AsciiPhysicsArt";

// Layered angled donut. Frosting (top layer with sprinkles + hole) sits on a
// dough body (lower layer). Region grid runs parallel to ART so frosting cells
// render pink while dough cells render in --ink. Sprinkle literals carry their
// own per-char color class.
const ART = [
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "         ri$$######$$O$         ",
  "       $@$#+        +#$@\\       ",
  "     i$@$#~          ~#$@$$     ",
  "    #$r@$#~          ~#$@/$O    ",
  "   +#\\$o@$#+        +#$@@$$#+   ",
  "  ~~+#$\\o@@$$######$$@@@r$#+~~  ",
  "  +#$$++#$$$rr@ri@@$ii$#++$$#+  ",
  "  +#$@@@@@~+++####+++~@@@@@$#+  ",
  "  +#$@@@@@@@@@@@@@@@@@@@@@@$#+  ",
  "  +#$$@@@@@@@@@@@@@@@@@@@@$$#+  ",
  "  ~#$$@@@@@@@@@@@@@@@@@@@@$$#~  ",
  "   +#$$@@@@@@@@@@@@@@@@@@$$#+   ",
  "    +#$$$@@@@@@@@@@@@@@$$$#+    ",
  "     ~+#$$$@@@@@@@@@@$$$#+~     ",
  "       ++##$$$$$$$$$$##++       ",
  "         ~++########++~         ",
  "                                ",
  "                                ",
  "                                ",
];

const REGIONS = [
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "         FFFFFFFFFFFFFF         ",
  "       FFFFF        FFFFF       ",
  "     FFFFFF          FFFFFF     ",
  "    FFFFFFF          FFFFFFF    ",
  "   FFFFFFFFF        FFFFFFFFF   ",
  "  DFFFFFFFFFFFFFFFFFFFFFFFFFFD  ",
  "  DDDDFFFFFFFFFFFFFFFFFFFFDDDD  ",
  "  DDDDDDDDFFFFFFFFFFFFDDDDDDDD  ",
  "  DDDDDDDDDDDDDDDDDDDDDDDDDDDD  ",
  "  DDDDDDDDDDDDDDDDDDDDDDDDDDDD  ",
  "  DDDDDDDDDDDDDDDDDDDDDDDDDDDD  ",
  "   DDDDDDDDDDDDDDDDDDDDDDDDDD   ",
  "    DDDDDDDDDDDDDDDDDDDDDDDD    ",
  "     DDDDDDDDDDDDDDDDDDDDDD     ",
  "       DDDDDDDDDDDDDDDDDD       ",
  "         DDDDDDDDDDDDDD         ",
  "                                ",
  "                                ",
  "                                ",
];

const BRIGHTNESS_MAP: Record<string, number> = {
  " ": 0,
  "~": 0.36,
  "+": 0.54,
  "*": 0.62,
  "%": 0.70,
  "#": 0.78,
  "$": 0.88,
  "@": 1.0,
  "/": 0.55,
  "\\": 0.55,
  o: 0.55,
  i: 0.55,
  O: 0.55,
  r: 0.55,
};

const LITERAL_CHARS = new Set(["/", "\\", "o", "i", "O", "r"]);

const REGION_CLASS = {
  F: "donut-frosting",
  D: "donut-dough",
};

const LITERAL_CLASS = {
  "/": "donut-s-red",
  "\\": "donut-s-blue",
  o: "donut-s-yellow",
  i: "donut-s-orange",
  O: "donut-s-green",
  r: "donut-s-purple",
};

const ROTATION_DEG = 0;

export function Donut() {
  return (
    <AsciiPhysicsArt
      art={ART}
      regions={REGIONS}
      brightnessMap={BRIGHTNESS_MAP}
      literalChars={LITERAL_CHARS}
      regionClass={REGION_CLASS}
      literalClass={LITERAL_CLASS}
      rotationDeg={ROTATION_DEG}
      artClassName="donut-art"
      rowClassName="donut-row"
    />
  );
}
