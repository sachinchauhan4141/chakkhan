/**
 * GameHeader — Top bar during gameplay showing current turn, available moves,
 * last roll result, and the hamburger menu (pause/exit).
 */
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { togglePause } from '../store/gameSlice';
import { LogOut, Pause, Play } from 'lucide-react';

const GameHeader = ({
    availableMoves, playerLabel, accentColor,
    rollResult, isPaused, onExit
}) => {
    const dispatch = useDispatch();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="w-full flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-slate-800/60 backdrop-blur-md shrink-0 relative z-40">
            {/* Available moves chips */}
            <div className="flex items-center gap-1 min-w-[60px]">
                {availableMoves.filter(m => m !== 'CAPTURE_BONUS').map((m, i) => (
                    <span key={i} className="w-6 h-6 rounded-full bg-slate-700 border border-slate-500 text-white text-[10px] font-bold flex items-center justify-center">{m}</span>
                ))}
            </div>

            {/* Current turn + last roll */}
            <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] uppercase tracking-widest hidden sm:inline">Turn</span>
                    <span className="text-sm sm:text-base font-black uppercase tracking-widest" style={{ color: accentColor }}>{playerLabel}</span>
                </div>
                {rollResult && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">Last roll</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${rollResult.value === 4 || rollResult.value === 8
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-700 border-slate-600 text-slate-200'}`}>
                            {rollResult.value === 8 ? '8 — Changa!' : rollResult.value === 4 ? '4 — Chakkhan!' : rollResult.value}
                        </span>
                    </div>
                )}
            </div>

            {/* Hamburger menu */}
            <div className="relative">
                <button onClick={() => setMenuOpen(o => !o)}
                    className="flex flex-col gap-[5px] p-2 rounded-lg hover:bg-slate-700 transition-colors">
                    <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                    <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                    <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                </button>
                {menuOpen && (
                    <>
                        <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                            <button onClick={() => { dispatch(togglePause()); setMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors">
                                {isPaused ? <Play size={15} /> : <Pause size={15} />}
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <div className="h-px bg-slate-700" />
                            <button onClick={() => { setMenuOpen(false); onExit(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors">
                                <LogOut size={15} /> Exit Game
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

export default GameHeader;
