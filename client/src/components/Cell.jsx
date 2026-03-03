import React from 'react';
import { EXPORTED_SAFE_CELLS as SAFE_CELLS, EXPORTED_FRONT_OF_HOUSE as FRONT_OF_HOUSE } from '../store/gameSlice';

// ── Outer ring flow arrows (direction piece moves FROM each cell) ──────────
const OUTER_FLOW = {
    22: '→', 23: '→',
    24: '↑', 19: '↑', 14: '↑', 9: '↑',
    4: '←', 3: '←', 2: '←', 1: '←',
    0: '↓', 5: '↓', 10: '↓', 15: '↓',
    20: '→', 21: '→'
};

// ── Inner ring flow arrows ────────────────────────────────────────────────
const INNER_FLOW = {
    16: '↑', 11: '↑',
    6: '→', 7: '→',
    8: '↓', 13: '↓',
    18: '←', 17: '←'
};

// ── Gateway cells: last outer cell before inner ring (pivot point) ────────
// Shows a bigger colored inward arrow
const GATEWAYS = {
    21: { color: '#fb7185', arrow: '↑' }, // p1 gateway → inner at 16 (Rose)
    19: { color: '#818cf8', arrow: '←' }, // p2 gateway → inner at 18 (Indigo)
    3: { color: '#fbbf24', arrow: '↓' }, // p3 gateway → inner at 8 (Amber)
    5: { color: '#34d399', arrow: '→' }, // p4 gateway → inner at 6 (Emerald)
};

// ── Inner ring personal ENTRY cells ───────────────────────────────────────
const INNER_ENTRIES = {
    16: '#fb7185', // p1
    18: '#818cf8', // p2
    8: '#fbbf24', // p3
    6: '#34d399', // p4
};

// ── Last inner ring cell before center (near-win) ─────────────────────────
const INNER_FINALS = new Set([17, 13, 7, 11]);

// ── Home (start) cells ────────────────────────────────────────────────────
const HOME_CELLS = {
    22: { color: '#fb7185', bg: 'rgba(251,113,133,0.15)', rotate: 0 }, // bottom → roof up
    14: { color: '#818cf8', bg: 'rgba(129,140,248,0.15)', rotate: -90 }, // right  → roof left
    2: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', rotate: 180 }, // top    → roof down
    10: { color: '#34d399', bg: 'rgba(52,211,153,0.15)', rotate: 90 }, // left   → roof right
};

// ── Strictly highlighted colored cells (per user request) ─────────────────
// Only 2, 7, 10, 11, 12(Center), 13, 14, 17, 22 are filled.
const HIGHLIGHT_COLORS = {
    22: '#fb7185', 17: '#fb7185', // p1 (bottom-up)
    14: '#818cf8', 13: '#818cf8', // p2 (right-left)
    2: '#fbbf24', 7: '#fbbf24',  // p3 (top-down)
    10: '#34d399', 11: '#34d399', // p4 (left-right)
};

const INNER_RING = new Set([6, 7, 8, 11, 13, 16, 17, 18]);

// Reverse lookup: globalCell → player color for front-of-house shields (transparent)
const FRONT_OF_HOUSE_INFO = {};
Object.entries(FRONT_OF_HOUSE).forEach(([player, cell]) => {
    const colors = { p1: '#fb7185', p2: '#818cf8', p3: '#fbbf24', p4: '#34d399' };
    FRONT_OF_HOUSE_INFO[cell] = colors[player];
});

// ─────────────────────────────────────────────────────────────────────────────
const Cell = ({ cellIndex, theme }) => {
    const isSafe = SAFE_CELLS.includes(cellIndex);
    const isCenter = cellIndex === 12;
    const homeData = HOME_CELLS[cellIndex];
    const gateway = GATEWAYS[cellIndex];
    const outerArrow = OUTER_FLOW[cellIndex];
    const innerArrow = INNER_FLOW[cellIndex];
    const frontOfHouseColor = FRONT_OF_HOUSE_INFO[cellIndex];

    // Strict Highlight Colors
    const highlightColor = HIGHLIGHT_COLORS[cellIndex];

    // Background Setup
    let bgClass = 'transition-colors duration-500';
    let bgStyle = { backgroundColor: theme?.colors?.cell || '#ffffff' };

    if (isCenter) {
        bgClass += ' bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500';
        bgStyle = {};
    } else if (highlightColor) {
        // Apply a gentle solid fill for the requested highlighted cells
        bgStyle = { background: `${highlightColor}33` }; // Adding some transparency for aesthetics, but strongly colored
    }

    return (
        <div className={`relative w-full h-full overflow-hidden box-border border-2 ${bgClass}`} style={{ ...bgStyle, borderColor: theme?.colors?.accent || 'rgba(255,255,255,0.1)' }}>

            {/* ── CENTER: 4 triangles (two diagonals), each player's color ── */}
            {isCenter && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        {/* Top triangle → p3 amber */}
                        <polygon points="0,0 100,0 50,50" fill="#fbbf24" />
                        {/* Right triangle → p2 indigo */}
                        <polygon points="100,0 100,100 50,50" fill="#818cf8" />
                        {/* Bottom triangle → p1 rose */}
                        <polygon points="0,100 100,100 50,50" fill="#fb7185" />
                        {/* Left triangle → p4 emerald */}
                        <polygon points="0,0 0,100 50,50" fill="#34d399" />
                        {/* Center dot */}
                        <circle cx="50" cy="50" r="12" fill="white" className="drop-shadow-sm" />
                    </svg>
                </div>
            )}

            {/* ── HOME CELL: colored tint + SVG house icon (roof toward center) ── */}
            {homeData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <svg
                        viewBox="0 0 24 24"
                        className="w-[55%] h-[55%] drop-shadow-sm"
                        fill={homeData.color}
                        opacity="0.82"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ transform: `rotate(${homeData.rotate}deg)` }}
                    >
                        {/* Roof */}
                        <polygon points="12,3 22,11 2,11" />
                        {/* Walls */}
                        <rect x="4" y="11" width="16" height="10" />
                        {/* Door — white cutout */}
                        <rect x="9.5" y="15" width="5" height="6" fill="white" opacity="0.6" />
                    </svg>
                </div>
            )}

            {/* ── GATEWAY: player-colored arrow pointing inward (bigger, pulsing) ── */}
            {gateway && (
                <>
                    {/* Small outer-ring flow arrow, faded */}
                    {outerArrow && (
                        <div className="absolute top-[1px] left-[2px] font-black leading-none pointer-events-none select-none"
                            style={{ fontSize: '8px', color: gateway.color, opacity: 0.3 }}>
                            {outerArrow}
                        </div>
                    )}
                    {/* Big inner-pivot arrow */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                        <span className="text-lg md:text-2xl font-black leading-none animate-[pulse_2s_ease-in-out_infinite] drop-shadow-sm"
                            style={{ color: gateway.color }}>
                            {gateway.arrow}
                        </span>
                    </div>
                </>
            )}





            {/* ── SAFE CELL: subtle X marks (non-home, non-center) ── */}
            {isSafe && !isCenter && !homeData && (
                <>
                    <div className="absolute w-[75%] h-[1.5px] bg-slate-300 transform rotate-45 pointer-events-none rounded" />
                    <div className="absolute w-[75%] h-[1.5px] bg-slate-300 transform -rotate-45 pointer-events-none rounded" />
                </>
            )}

            {/* ── FRONT-OF-HOUSE: player-colored shield icon (safe for that player) ── */}
            {frontOfHouseColor && !gateway && (
                <div className="absolute top-[2px] left-[2px] pointer-events-none select-none" style={{ opacity: 0.65 }}>
                    <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]" fill={frontOfHouseColor} xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5z" />
                    </svg>
                </div>
            )}

            {/* ── OUTER RING flow arrow (corner, small, barely visible) ── */}
            {outerArrow && !homeData && !gateway && !isCenter && (
                <div className="absolute bottom-[2px] right-[4px] font-black leading-none select-none pointer-events-none"
                    style={{ fontSize: '10px', color: '#cbd5e1', opacity: 0.6 }}>
                    {outerArrow}
                </div>
            )}

            {/* ── INNER RING flow arrow (amber, small, corner) ── */}
            {innerArrow && !isCenter && (
                <div className="absolute bottom-[2px] right-[4px] font-black leading-none select-none pointer-events-none"
                    style={{ fontSize: '10px', color: '#fbbf24', opacity: 0.7 }}>
                    {innerArrow}
                </div>
            )}
        </div>
    );
};

export default Cell;
