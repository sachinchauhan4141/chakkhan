/**
 * GameOverlays — Exit confirmation, Pause overlay, and Victory screen
 * Extracted from App.jsx for modularity.
 */
import React from 'react';
import { useDispatch } from 'react-redux';
import { togglePause } from '../store/gameSlice';
import { Play } from 'lucide-react';
import { PLAYER_NAMES, PLAYER_COLORS } from '../store/boardConstants';

// ─── Exit Confirmation Dialog ────────────────────────────────────────────────
export const ExitConfirm = ({ onStay, onExit }) => (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-xs w-full mx-4 shadow-2xl">
            <div className="text-3xl mb-3">🚪</div>
            <h3 className="cinzel-font text-slate-100 font-bold text-base mb-2">Exit Game?</h3>
            <p className="text-slate-400 text-sm mb-6">Your progress will be lost.</p>
            <div className="flex gap-3">
                <button onClick={onStay} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-all">Stay</button>
                <button onClick={onExit} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all">Exit</button>
            </div>
        </div>
    </div>
);

// ─── Pause Overlay ───────────────────────────────────────────────────────────
export const PauseOverlay = ({ pauseCount }) => {
    const dispatch = useDispatch();
    return (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <div className="mb-6 flex flex-col items-center gap-1">
                <span className="text-slate-500 text-xs uppercase tracking-widest">Times Resumed</span>
                <span className="text-6xl font-black text-amber-400 tabular-nums" style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>{pauseCount}</span>
                <span className="text-slate-500 text-[10px] text-center max-w-[180px] leading-relaxed">
                    Remember this number — it goes up each time someone unpauses
                </span>
            </div>
            <div className="text-slate-400 text-sm mb-8 uppercase tracking-widest animate-pulse">Game Paused</div>
            <button onClick={() => dispatch(togglePause())}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-slate-900 text-base tracking-wide uppercase transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #b45309, 0 6px 20px rgba(245,158,11,0.3)' }}>
                <Play size={20} fill="currentColor" /> Resume
            </button>
        </div>
    );
};

// ─── Victory Screen ──────────────────────────────────────────────────────────
export const VictoryScreen = ({ finishedPlayers = [], activePlayers = [], onPlayAgain }) => {
    // Generate full rankings: first push all finished players, then append any remaining active players
    const finalRankings = [...finishedPlayers];
    activePlayers.forEach(p => {
        if (!finalRankings.includes(p)) finalRankings.push(p);
    });

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center backdrop-blur-md">
            <div className="bg-slate-800 border-2 border-amber-500 rounded-3xl p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] max-w-sm w-full mx-4 flex flex-col items-center">
                <div className="text-5xl mb-4">🏆</div>
                <h1 className="cinzel-font text-4xl sm:text-5xl font-extrabold text-amber-400 mb-6 tracking-wide">Match Over</h1>

                <div className="w-full flex flex-col gap-2 mb-8">
                    {finalRankings.map((p, idx) => {
                        const isFirst = idx === 0;
                        return (
                            <div key={p} className={`flex items-center px-4 py-3 rounded-xl border ${isFirst ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-700/30 border-slate-700'}`}>
                                <span className={`w-8 text-left font-black ${isFirst ? 'text-amber-400 text-lg' : 'text-slate-500 text-sm'}`}>#{idx + 1}</span>
                                <span className="flex-1 text-center font-black uppercase tracking-widest text-lg drop-shadow-md" style={{ color: PLAYER_COLORS[p] }}>
                                    {PLAYER_NAMES[p]}
                                </span>
                                <span className="w-8"></span>
                            </div>
                        );
                    })}
                </div>

                <button onClick={onPlayAgain}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl uppercase tracking-widest text-sm transition-all shadow-[0_4px_0_#b45309] hover:-translate-y-1 hover:shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-none">
                    Play Again
                </button>
            </div>
        </div>
    );
};
