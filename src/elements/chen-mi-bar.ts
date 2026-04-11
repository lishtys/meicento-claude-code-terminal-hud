/**
 * CHEN MI Braille Dot-Matrix Context Bar
 *
 * Renders "CHEN MI" as Braille dot-matrix glyphs inside a fill-progress bar.
 * Bar width: [ 2pad + 19 content + 2pad ] = 23 inner cells + dim brackets.
 *
 * Fill logic per cell:
 *   Filled + ink   -> cyan Braille char (stroke contrasts over fill)
 *   Filled + bg    -> tier-colored solid block
 *   Unfilled + ink -> bright-white Braille char (visible outline)
 *   Unfilled + bg  -> dim empty Braille (faint texture)
 */
import { C, getColorByPercent6Tier } from '../colors.js';

interface BrailleGlyph {
  readonly char: string;
  readonly ink: boolean;
}

// Braille character palette
const BCL = '\u28CF'; // ⣏  C-left: full left vert + serifs
const BSR = '\u28C9'; // ⣉  serifs: top+bottom bars
const BEP = '\u2800'; // ⠀  empty braille
const BLV = '\u2847'; // ⡇  left vertical
const BRV = '\u28B8'; // ⢸  right vertical
const BCR = '\u2836'; // ⠶  double crossbar
const BEM = '\u28DB'; // ⣛  E middle: top+mid+bot bars
const BND = '\u28A3'; // ⢣  N diagonal
const BML = '\u2819'; // ⠙  M peak-left
const BMR = '\u280B'; // ⠋  M peak-right

// "CHEN MI" glyph sequence: C(3) H(3) E(3) N(3) space(1) M(4) I(2) = 19
const GLYPHS: readonly BrailleGlyph[] = [
  // C: ⣏⣉⠀
  { char: BCL, ink: true },
  { char: BSR, ink: true },
  { char: BEP, ink: false },
  // H: ⡇⠶⢸
  { char: BLV, ink: true },
  { char: BCR, ink: true },
  { char: BRV, ink: true },
  // E: ⡇⣛⠀
  { char: BLV, ink: true },
  { char: BEM, ink: true },
  { char: BEP, ink: false },
  // N: ⡇⢣⢸
  { char: BLV, ink: true },
  { char: BND, ink: true },
  { char: BRV, ink: true },
  // space
  { char: BEP, ink: false },
  // M: ⡇⠙⠋⢸
  { char: BLV, ink: true },
  { char: BML, ink: true },
  { char: BMR, ink: true },
  { char: BRV, ink: true },
  // I: ⣉⠶
  { char: BSR, ink: true },
  { char: BCR, ink: true },
];

const PADDING = 2;
const CONTENT_WIDTH = GLYPHS.length; // 19
const BAR_WIDTH = PADDING + CONTENT_WIDTH + PADDING; // 23

export function renderChenMiBar(percent: number): string {
  const tierColor = getColorByPercent6Tier(percent);
  const filledCells = Math.round((percent / 100) * BAR_WIDTH);

  const parts: string[] = [];
  parts.push(C.dim('['));

  for (let i = 0; i < BAR_WIDTH; i++) {
    const isFilled = i < filledCells;
    const contentIdx = i - PADDING;

    if (contentIdx < 0 || contentIdx >= CONTENT_WIDTH) {
      // Padding zone
      parts.push(isFilled ? tierColor('\u2588') : ' ');
    } else {
      const glyph = GLYPHS[contentIdx];
      if (isFilled) {
        parts.push(glyph.ink ? C.cyan(glyph.char) : tierColor('\u2588'));
      } else {
        parts.push(glyph.ink ? C.brightWhite(glyph.char) : C.dim(glyph.char));
      }
    }
  }

  parts.push(C.dim(']'));
  return parts.join('');
}
