import { AsciiPhysicsArt } from "./AsciiPhysicsArt";

// Big angled donut (62 cols x 36 rows) with a closed outer rim, closed hole
// rim, frosting filling the upper half, dough filling the lower half, and a
// few short drips bleeding from the frosting/dough boundary. Region grid is
// parallel to ART; sprinkles are literal chars carrying their own colors.
const ART = [
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                       $##############$                       ",
  "                 $###++++@@Or/@O@Or@@++++###$                 ",
  "              ##+++@r@@@@@@~~~~~~~~@@@@i@@@+++##              ",
  "           $#++@o@\\@@@~~+++##$$$$##+++~~@@o@@@@++#$           ",
  "         $#++@O\\o@@~~++#              #++~~@Oi@/o++#$         ",
  "       $#++/\\@@@@@~~+#                  #+~~@@@oO@i++#$       ",
  "      ##+oi@rrr@@@~++$                  $++~@@/@iO@@@+##      ",
  "     ##+Oi\\@\\@O@\\@~~+#                  #+~~@@@@@o@roo+##     ",
  "    $#+\\@@@i@\\@/@@@~~++#              #++~~@@@/@@@\\@@o@+#$    ",
  "    #+/i@@@@@@@/O@@o@@~~+++##$$$$##+++~~@@@@OO@@r@@i@@o@+#    ",
  "   $#+o@@o@@@@Oi/\\O@@r@@@@@~~~~~~~~@@@@@@@@O@OO@@\\i@i@r\\+#$   ",
  "   #++@Or/@@@@@i@Oi@i@O@\\r@O@O\\@@@\\@i@\\r@\\@@@r@@@O@O@/@@++#   ",
  "   #++O@i@i@@@//Oo@oooroi/@@@o/ir@@i@@O@@ii@@@O@ii@@@@i/++#   ",
  "   $#+######OO@@@@@ir@@@@@O@\\i@@@/@@@@r@@\\@@o@r@@@######+#$   ",
  "    #+$$$############################################$$$+#    ",
  "    $#+$$@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$+#$    ",
  "     ##+$$$$@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$+##     ",
  "      ##+$$$$@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$+##      ",
  "       $#++$$$$@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$++#$       ",
  "         $#++$$$$$@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$$++#$         ",
  "           $#++$$$$$$$@@@@@@@@@@@@@@@@@@$$$$$$$++#$           ",
  "              ##+++$$$$$$$$$$$$$$$$$$$$$$$$+++##              ",
  "                 $###++++$$$$$$$$$$$$++++###$                 ",
  "                       $##############$                       ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
];

const REGIONS = [
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                       FFFFFFFFFFFFFFFF                       ",
  "                 FFFFFFFFFFFFFFFFFFFFFFFFFFFF                 ",
  "              FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF              ",
  "           FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF           ",
  "         FFFFFFFFFFFFFFF              FFFFFFFFFFFFFFF         ",
  "       FFFFFFFFFFFFFFF                  FFFFFFFFFFFFFFF       ",
  "      FFFFFFFFFFFFFFFF                  FFFFFFFFFFFFFFFF      ",
  "     FFFFFFFFFFFFFFFFF                  FFFFFFFFFFFFFFFFF     ",
  "    FFFFFFFFFFFFFFFFFFFF              FFFFFFFFFFFFFFFFFFFF    ",
  "    FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF    ",
  "   FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF   ",
  "   FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF   ",
  "   FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF   ",
  "   FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF   ",
  "    DDDDDFFDDDDFFDDDDFFFFFFFFFFFFFFFFFFFFDDDDDDDFFDDDDDDDD    ",
  "    DDDDDFFDDDDFFDDDDDFFDDDDFFDDDDDFFDDDDDFFDDDDFFDDDDDDDD    ",
  "     DDDDDDDDDFFFFDDDDFFDDDFFFFDDDDFFDDDDFFFFDDDFFDDDDDDD     ",
  "      DDDDDDDDDFFDDDDDDDDDDFFFFDDDDFFDDDDFFFFDDDDDDDDDDD      ",
  "       DDDDDDDDFFDDDDDDDDDDFFFFDDDDDDDDDDFFFFDDDDDDDDDD       ",
  "         DDDDDDDDDDDDDDDDDDDFFDDDDDDDDDDDDFFDDDDDDDDD         ",
  "           DDDDDDDDDDDDDDDDDFFDDDDDDDDDDDDDDDDDDDDD           ",
  "              DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD              ",
  "                 DDDDDDDDDDDDDDDDDDDDDDDDDDDD                 ",
  "                       DDDDDDDDDDDDDDDD                       ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
  "                                                              ",
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
