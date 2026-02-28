import React from 'react';
import { EXPORTED_SAFE_CELLS as SAFE_CELLS } from '../store/gameSlice';

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
    21: { color: '#ef4444', arrow: '↑' }, // p1 gateway → inner at 16
    19: { color: '#3b82f6', arrow: '←' }, // p2 gateway → inner at 18
    3: { color: '#facc15', arrow: '↓' }, // p3 gateway → inner at 8
    5: { color: '#22c55e', arrow: '→' }, // p4 gateway → inner at 6
};

// ── Inner ring personal ENTRY cells ───────────────────────────────────────
const INNER_ENTRIES = {
    16: '#ef4444', // p1
    18: '#3b82f6', // p2
    8: '#facc15', // p3
    6: '#22c55e', // p4
};

// ── Last inner ring cell before center (near-win) ─────────────────────────
const INNER_FINALS = new Set([17, 13, 7, 11]);

// ── Home (start) cells ────────────────────────────────────────────────────
const HOME_CELLS = {
    22: { color: '#ef4444', bg: 'rgba(239,68,68,0.14)', rotate: 0 }, // bottom → roof up
    14: { color: '#3b82f6', bg: 'rgba(59,130,246,0.14)', rotate: -90 }, // right  → roof left
    2: { color: '#facc15', bg: 'rgba(250,204,21,0.18)', rotate: 180 }, // top    → roof down
    10: { color: '#22c55e', bg: 'rgba(34,197,94,0.14)', rotate: 90 }, // left   → roof right
};

const INNER_RING = new Set([6, 7, 8, 11, 13, 16, 17, 18]);

// ─────────────────────────────────────────────────────────────────────────────
const Cell = ({ cellIndex }) => {
    const isSafe = SAFE_CELLS.includes(cellIndex);
    const isCenter = cellIndex === 12;
    const isInner = INNER_RING.has(cellIndex);
    const homeData = HOME_CELLS[cellIndex];
    const gateway = GATEWAYS[cellIndex];
    const entryColor = INNER_ENTRIES[cellIndex];
    const isFinal = INNER_FINALS.has(cellIndex);
    const outerArrow = OUTER_FLOW[cellIndex];
    const innerArrow = INNER_FLOW[cellIndex];

    // Background
    let bgClass = 'bg-white';
    let bgStyle = {};
    if (isCenter) bgClass = 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500';
    else if (homeData) { bgClass = ''; bgStyle = { background: homeData.bg }; }
    else if (gateway) { bgClass = ''; bgStyle = { background: `${gateway.color}10` }; }
    else if (isInner) bgClass = 'bg-amber-50';

    return (
        <div className={`relative w-full h-full overflow-hidden box-border ${bgClass}`} style={bgStyle}>

            {/* Warm wash on inner ring */}
            {isInner && !isCenter && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-transparent pointer-events-none" />
            )}

            {/* ── CENTER: 4 triangles (two diagonals), each player's color ── */}
            {isCenter && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        {/* Top triangle → p3 yellow */}
                        <polygon points="0,0 100,0 50,50" fill="#facc15" />
                        {/* Right triangle → p2 blue */}
                        <polygon points="100,0 100,100 50,50" fill="#3b82f6" />
                        {/* Bottom triangle → p1 red */}
                        <polygon points="0,100 100,100 50,50" fill="#ef4444" />
                        {/* Left triangle → p4 green */}
                        <polygon points="0,0 0,100 50,50" fill="#22c55e" />
                        {/* Center dot */}
                        <circle cx="50" cy="50" r="6" fill="white" opacity="0.8" />
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
                        <span className="text-lg md:text-2xl font-black leading-none animate-[pulse_2s_ease-in-out_infinite]"
                            style={{ color: gateway.color }}>
                            {gateway.arrow}
                        </span>
                    </div>
                </>
            )}





            {/* ── SAFE CELL: subtle X marks (non-home, non-center) ── */}
            {isSafe && !isCenter && !homeData && (
                <>
                    <div className="absolute w-[75%] h-[1.5px] bg-slate-400/35 transform rotate-45 pointer-events-none rounded" />
                    <div className="absolute w-[75%] h-[1.5px] bg-slate-400/35 transform -rotate-45 pointer-events-none rounded" />
                </>
            )}

            {/* ── OUTER RING flow arrow (corner, small, barely visible) ── */}
            {outerArrow && !homeData && !gateway && !isCenter && (
                <div className="absolute bottom-[1px] right-[2px] font-black leading-none select-none pointer-events-none"
                    style={{ fontSize: '8px', color: '#94a3b8', opacity: 0.4 }}>
                    {outerArrow}
                </div>
            )}

            {/* ── INNER RING flow arrow (amber, small, corner) ── */}
            {innerArrow && !isCenter && !entryColor && (
                <div className="absolute bottom-[1px] right-[2px] font-black leading-none select-none pointer-events-none"
                    style={{ fontSize: '8px', color: '#d97706', opacity: 0.55 }}>
                    {innerArrow}
                </div>
            )}
        </div>
    );
};

export default Cell;
