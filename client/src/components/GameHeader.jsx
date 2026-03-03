/**
 * GameHeader — Top bar during gameplay showing current turn, available moves,
 * last roll result, and the hamburger menu (pause/exit).
 */
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { togglePause } from '../store/gameSlice';
import { LogOut, Pause, Play, Maximize, Minimize } from 'lucide-react';

const GameHeader = ({
    availableMoves, playerLabel, accentColor,
    rollResult, isPaused, onExit, currentTurnRolls
}) => {
    const dispatch = useDispatch();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initial check for fullscreen state
    React.useEffect(() => {
        const checkFullscreen = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', checkFullscreen);
        checkFullscreen();
        return () => document.removeEventListener('fullscreenchange', checkFullscreen);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Error toggling fullscreen", err);
        }
        setMenuOpen(false);
    };

    return (
        <header className="w-full flex items-center justify-between px-4 py-3 border-b-2 border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl shrink-0 relative z-40">
            {/* Current Turn Indicator - Super Prominent */}
            <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest font-bold">Current Turn</span>
                <span className="text-xl sm:text-2xl font-black uppercase tracking-widest drop-shadow-md animate-pulse" style={{ color: accentColor }}>
                    {playerLabel}
                </span>
            </div>

            {/* Central Info: Moves & Rolls */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-2 overflow-hidden">
                {/* Available Moves */}
                {availableMoves.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:inline mr-1">Moves Left:</span>
                        {availableMoves.filter(m => m !== 'CAPTURE_BONUS').map((m, i) => (
                            <span key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-500 border-2 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] text-xs sm:text-sm font-black flex items-center justify-center">
                                {m}
                            </span>
                        ))}
                        {availableMoves.length === 0 && <span className="text-xs text-slate-500 font-bold px-2 py-1">None</span>}
                    </div>
                )}

                {/* Roll History */}
                {currentTurnRolls && currentTurnRolls.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full max-w-[250px] sm:max-w-md scrollbar-none justify-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest shrink-0 font-bold hidden sm:inline">Priors:</span>
                        <div className="flex gap-1.5">
                            {currentTurnRolls.map((val, idx) => (
                                <span key={idx} className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-md border-b-2 shrink-0 shadow-sm ${val === 4 || val === 8
                                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 border-amber-700 text-white'
                                    : 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-900 text-slate-200'}`}>
                                    {val === 8 ? '8' : val === 4 ? '4' : val}
                                </span>
                            ))}
                        </div>
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
                            <button onClick={toggleFullscreen}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-indigo-300 hover:bg-slate-700 transition-colors">
                                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                                {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
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
