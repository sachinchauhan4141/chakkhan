/**
 * boardConstants.js — Board layout, paths, and safe cells
 *
 * Board cell layout (5×5 grid, cells 0-24):
 *  0  1  2  3  4
 *  5  6  7  8  9
 * 10 11 12 13 14
 * 15 16 17 18 19
 * 20 21 22 23 24
 *
 * Outer ring (16 cells, counter-clockwise):
 *   20→15→10→5→0→1→2→3→4→9→14→19→24→23→22→21
 *
 * Inner ring (8 cells, clockwise):
 *   16→11→6→7→8→13→18→17
 *
 * Center: cell 12 (WIN destination)
 */

// ─── Player IDs ──────────────────────────────────────────────────────────────
export const PLAYERS = ['p1', 'p2', 'p3', 'p4'];
export const PLAYER_NAMES = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };
export const PLAYER_COLORS = { p1: '#ef4444', p2: '#3b82f6', p3: '#facc15', p4: '#22c55e' };

// ─── Safe Cells ──────────────────────────────────────────────────────────────
/** Castle midpoints on each outer edge + center (cannot be captured here) */
export const SAFE_CELLS = [2, 10, 22, 14, 12];

/**
 * Per-player safe cells: the inner-ring cell directly in front of each home.
 * A piece on its OWN front-of-house cell is immune from capture.
 */
export const FRONT_OF_HOUSE = {
    p1: 17, // inner ring cell above p1's home (cell 22)
    p2: 13, // inner ring cell left of p2's home (cell 14)
    p3: 7,  // inner ring cell below p3's home (cell 2)
    p4: 11, // inner ring cell right of p4's home (cell 10)
};

// ─── Path positions ──────────────────────────────────────────────────────────
// Each path has 25 positions (indices 0–24):
//   pos 0       = HOME CASTLE (piece enters here on a 4 or 8 roll)
//   pos 1–15    = outer ring (clockwise around the board)
//   pos 16      = inner ring ENTRY (gateway from outer → inner)
//   pos 17–23   = remaining inner ring cells
//   pos 24      = CENTER cell 12 (WIN — must land exactly)

const PATH_P1 = [
    22,  // Home
    23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5, 10, 15, 20, 21,  // Outer ring
    16, 11, 6, 7, 8, 13, 18, 17,  // Inner ring
    12   // Center — WIN
];

const PATH_P2 = [
    14,
    9, 4, 3, 2, 1, 0, 5, 10, 15, 20, 21, 22, 23, 24, 19,
    18, 17, 16, 11, 6, 7, 8, 13,
    12
];

const PATH_P3 = [
    2,
    1, 0, 5, 10, 15, 20, 21, 22, 23, 24, 19, 14, 9, 4, 3,
    8, 13, 18, 17, 16, 11, 6, 7,
    12
];

const PATH_P4 = [
    10,
    15, 20, 21, 22, 23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5,
    6, 7, 8, 13, 18, 17, 16, 11,
    12
];

export const PLAYER_PATHS = { p1: PATH_P1, p2: PATH_P2, p3: PATH_P3, p4: PATH_P4 };

// ─── Ring boundaries ─────────────────────────────────────────────────────────
export const OUTER_RING_END = 15;    // pos 15 is the last outer ring cell (gateway)
export const INNER_RING_START = 16;  // pos 16–23 are the inner ring

// ─── Turn order ──────────────────────────────────────────────────────────────
/** Full anticlockwise visual turn order: p1(0) → p4(3) → p3(2) → p2(1) */
export const FULL_TURN_ORDER = [0, 3, 2, 1];
