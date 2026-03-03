import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Crown, Medal } from 'lucide-react';
import ProfileScreen from './ProfileScreen';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const RANK_COLORS = { 1: '#fbbf24', 2: '#94a3b8', 3: '#d97706' };

const LeaderboardScreen = ({ onBack, isEmbedded }) => {
    const { user } = useSelector(s => s.auth);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState(null);
    const [viewProfileId, setViewProfileId] = useState(null);

    useEffect(() => {
        // Fetch top 100
        fetch(`${API}/api/leaderboard`)
            .then(r => r.json())
            .then(d => { setLeaderboard(d.leaderboard || []); setLoading(false); })
            .catch(() => setLoading(false));

        // Fetch my specific rank if logged in
        if (user && user._id) {
            fetch(`${API}/api/leaderboard/profile/${user._id}`)
                .then(r => r.json())
                .then(d => { if (d.profile) setMyRank(d.profile.rank); })
                .catch(() => { });
        }
    }, [user]);

    const isMeInTop100 = user ? leaderboard.some(p => p.uniqueTag === user.uniqueTag) : false;

    return (
        <div className={isEmbedded ? "flex-1 flex flex-col font-sans select-none" : "fixed inset-0 bg-slate-50 flex flex-col overflow-hidden select-none font-sans"} style={isEmbedded ? {} : { height: '100dvh' }}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 border-b border-slate-200 bg-white ${isEmbedded ? 'pt-6 pb-2' : 'py-3'}`}>
                {isEmbedded ? (
                    <div className="w-5" /> // Spacer
                ) : (
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-700"><ArrowLeft size={20} /></button>
                )}
                <h2 className={`cinzel-font text-indigo-600 font-bold tracking-widest uppercase flex items-center gap-2 ${isEmbedded ? 'text-xl' : 'text-sm'}`}>
                    <Crown size={isEmbedded ? 24 : 16} /> Leaderboard
                </h2>
                <div className="w-5" />
            </div>

            {/* Table Header */}
            <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-slate-100 text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                <span className="w-10 text-center">#</span>
                <span className="flex-1">Player</span>
                <span className="w-16 text-center">MMR</span>
                <span className="w-12 text-center">W</span>
                <span className="w-12 text-center">Win%</span>
            </div>

            {/* Scrollable list */}
            <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'pb-20 bg-white' : 'bg-white'}`}>
                {loading ? (
                    <p className="text-slate-400 text-xs text-center py-12 animate-pulse">Loading…</p>
                ) : leaderboard.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-12">No ranked players yet. Play a game!</p>
                ) : (
                    leaderboard.map(p => {
                        const isMe = user && p.uniqueTag === user.uniqueTag;
                        const topColor = RANK_COLORS[p.rank];
                        return (
                            <div key={p.rank}
                                onClick={() => setViewProfileId(p._id)}
                                className={`flex items-center px-4 py-2.5 border-b border-slate-100 transition-colors cursor-pointer ${isMe ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                                    }`}>
                                <span className="w-10 text-center font-black text-sm" style={{ color: topColor || '#94a3b8' }}>
                                    {p.rank <= 3 ? <Medal size={16} style={{ color: topColor, display: 'inline' }} /> : p.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-600' : 'text-slate-800'}`}>
                                        {p.username} {isMe && <span className="text-[9px] text-indigo-500 ml-1">(You)</span>}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-mono">{p.uniqueTag}</p>
                                </div>
                                <span className="w-16 text-center text-sm font-bold text-indigo-500">{p.mmr}</span>
                                <span className="w-12 text-center text-xs font-bold text-emerald-500">{p.wins}</span>
                                <span className="w-12 text-center text-xs font-bold text-slate-500">{p.winRate}%</span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Persistent My Rank Banner */}
            {user && !loading && !isMeInTop100 && myRank && (
                <div className="bg-indigo-600 text-white shadow-[0_-10px_40px_rgba(79,70,229,0.2)] border-t border-indigo-500 z-10 shrink-0 cursor-pointer hover:bg-indigo-500 transition-colors"
                    onClick={() => setViewProfileId(user._id)}>
                    <div className="flex items-center px-4 py-3">
                        <span className="w-10 text-center font-black text-sm text-indigo-200">{myRank}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{user.username} <span className="text-[9px] text-indigo-300 ml-1">(You)</span></p>
                            <p className="text-[9px] text-indigo-300 font-mono">{user.uniqueTag}</p>
                        </div>
                        <span className="w-16 text-center text-sm font-bold text-white">{user.mmr || 1000}</span>
                        <span className="w-12 text-center text-xs font-bold text-emerald-300">{user.stats?.wins || 0}</span>
                        <span className="w-12 text-center text-xs font-bold text-indigo-200">
                            {user.stats?.totalGames > 0 ? Math.round((user.stats.wins / user.stats.totalGames) * 100) : 0}%
                        </span>
                    </div>
                </div>
            )}

            {viewProfileId && <ProfileScreen onClose={() => setViewProfileId(null)} viewUserId={viewProfileId} />}
        </div>
    );
};

export default LeaderboardScreen;
