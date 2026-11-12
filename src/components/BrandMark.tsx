/**
 * The Solo Books mark: a single, clean S, drawn from the outline of Libre
 * Caslon Display (the brand's wordmark face), so the mark and the name read as
 * one family. Authored as vector paths, not live text, so it is crisp at any
 * size and does not depend on the font having loaded. Takes a `color` so the
 * same mark works on the dark/light site (passed a palette token) and in the
 * app's sidebar (passed the app's gold token). The favicon and the phone
 * icons are this S on a near-black square (public/favicon.svg, pwa-*.png).
 */
const S_PATH =
  'M493 185Q493 237 470.5 272.5Q448 308 411.5 332.0Q375 356 315 383Q248 414 211.5 436.0Q175 458 154.5 488.0Q134 518 134 562Q134 623 171.0 658.5Q208 694 270 694Q373 694 423 591Q448 540 464 473L474 476L464 694H451L427 646Q386 678 350.5 692.0Q315 706 274 706Q215 706 168.5 681.5Q122 657 95.5 613.5Q69 570 69 515Q69 461 93.5 423.5Q118 386 155.0 362.5Q192 339 247 315Q314 286 351.0 264.0Q388 242 409.5 211.0Q431 180 431 135Q431 71 390.5 33.5Q350 -4 278 -4Q194 -4 143 53Q118 81 102.5 119.0Q87 157 72 225L63 223L76 -16H89L110 39Q141 13 185.0 -1.5Q229 -16 276 -16Q338 -16 387.5 10.0Q437 36 465.0 81.5Q493 127 493 185Z'

// Libre Caslon Display's S is a high-contrast face: its hairlines get thin at
// small sizes. A round-joined stroke of the same color, in font units, thickens
// every stroke evenly so the mark stays bold and legible down to a favicon.
const WEIGHT = 40

export function BrandMark({ color = 'currentColor', size = 24 }: { color?: string; size?: number }) {
  // The outlined glyph is (430 + WEIGHT) x (722 + WEIGHT) font units (y up).
  // Scaled to 82% of the box height, centered, with the y axis flipped for SVG.
  const w = 430 + WEIGHT
  const h = 722 + WEIGHT
  const s = 82 / h
  const left = 63 - WEIGHT / 2
  const top = 706 + WEIGHT / 2
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path
        d={S_PATH}
        fill={color}
        stroke={color}
        strokeWidth={WEIGHT}
        strokeLinejoin="round"
        transform={`translate(${(100 - w * s) / 2 - left * s} ${(100 - h * s) / 2 + top * s}) scale(${s} ${-s})`}
      />
    </svg>
  )
}
