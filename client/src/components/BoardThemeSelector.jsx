/**
 * BoardThemeSelector.jsx — Visual board theme picker for the lobby
 *
 * Shows 3 selectable theme cards with mini board previews.
 * Each card has a unique color palette and ambient glow.
 */
import React from 'react';

const BOARD_THEMES = [
    {
        key: 'light',
        name: 'Light (High Vis)',
        desc: 'Crisp & high contrast',
        colors: {
            board: '#ffffff',
            cell: '#f1f5f9',
            accent: '#3b82f6',
            glow: 'rgba(59,130,246,0.3)',
        },
        preview: ['#ffffff', '#f1f5f9', '#3b82f6', '#e2e8f0'],
    },
    {
        key: 'dark',
        name: 'Dark (Neon Vis)',
        desc: 'Sleek & vibrant',
        colors: {
            board: '#0f172a',
            cell: '#1e293b',
            accent: '#8b5cf6',
            glow: 'rgba(139,92,246,0.4)',
        },
        preview: ['#0f172a', '#1e293b', '#8b5cf6', '#020617'],
    },
];

/** Mini 3×3 board preview using theme colors */
const MiniBoard = ({ colors }) => (
    <div className="grid grid-cols-3 gap-0.5 w-16 h-16 rounded-lg overflow-hidden border border-white/10"
        style={{ background: colors[3] }}>
        {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-sm transition-colors"
                style={{
                    background: i === 4 ? colors[2] : i % 2 === 0 ? colors[0] : colors[1],
                    boxShadow: i === 4 ? `0 0 8px ${colors[2]}60` : 'none',
                }} />
        ))}
    </div>
);

const BoardThemeSelector = ({ selectedTheme, onSelect }) => (
    <div className="flex flex-col gap-2">
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">
            🎨 Board Theme
        </p>
        {BOARD_THEMES.map(theme => {
            const isSelected = selectedTheme === theme.key;
            return (
                <button key={theme.key} onClick={() => onSelect(theme.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${isSelected
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
                        }`}
                    style={isSelected ? { boxShadow: `0 0 20px ${theme.colors.glow}` } : {}}>
                    <MiniBoard colors={theme.preview} />
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                            {theme.name}
                        </p>
                        <p className="text-[10px] text-slate-500">{theme.desc}</p>
                    </div>
                    {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-slate-900 font-black shrink-0">
                            ✓
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

export { BOARD_THEMES };
export default BoardThemeSelector;
