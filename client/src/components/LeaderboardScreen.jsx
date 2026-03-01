import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Crown, Medal } from 'lucide-react';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const RANK_COLORS = { 1: '#fbbf24', 2: '#94a3b8', 3: '#d97706' };

const LeaderboardScreen = ({ onBack }) => {
    const { user } = useSelector(s => s.auth);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/api/leaderboard`)
            .then(r => r.json())
            .then(d => { setLeaderboard(d.leaderboard || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden select-none" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-200"><ArrowLeft size={20} /></button>
                <h2 className="cinzel-font text-amber-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                    <Crown size={16} /> Leaderboard
                </h2>
                <div className="w-5" />
            </div>

            {/* Table Header */}
            <div className="flex items-center px-4 py-2 border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-widest">
                <span className="w-10 text-center">#</span>
                <span className="flex-1">Player</span>
                <span className="w-16 text-center">MMR</span>
                <span className="w-12 text-center">W</span>
                <span className="w-12 text-center">Win%</span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="text-slate-600 text-xs text-center py-12 animate-pulse">Loading…</p>
                ) : leaderboard.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-12">No ranked players yet. Play a game!</p>
                ) : (
                    leaderboard.map(p => {
                        const isMe = user && p.uniqueTag === user.uniqueTag;
                        const topColor = RANK_COLORS[p.rank];
                        return (
                            <div key={p.rank}
                                className={`flex items-center px-4 py-2.5 border-b border-slate-800/50 transition-colors ${isMe ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'
                                    }`}>
                                <span className="w-10 text-center font-black text-sm" style={{ color: topColor || '#64748b' }}>
                                    {p.rank <= 3 ? <Medal size={16} style={{ color: topColor, display: 'inline' }} /> : p.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {p.username} {isMe && <span className="text-[9px] text-amber-500">(You)</span>}
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-mono">{p.uniqueTag}</p>
                                </div>
                                <span className="w-16 text-center text-sm font-bold text-amber-400">{p.mmr}</span>
                                <span className="w-12 text-center text-xs text-emerald-400">{p.wins}</span>
                                <span className="w-12 text-center text-xs text-slate-400">{p.winRate}%</span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LeaderboardScreen;
