import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, loadUser } from '../store/authSlice';
import { ArrowLeft, LogOut, Trophy, Swords, Target, TrendingUp, Crown } from 'lucide-react';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center gap-1">
        <Icon size={16} style={{ color }} />
        <span className="text-lg font-black text-slate-100">{value}</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
);

const ProfileScreen = ({ onBack }) => {
    const dispatch = useDispatch();
    const { user, token } = useSelector(s => s.auth);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!user?._id) return;
        fetch(`${API}/api/leaderboard/profile/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setProfile(d.profile)).catch(() => { });
    }, [user, token]);

    const p = profile || user || {};
    const winRate = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden select-none" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-200 transition-colors"><ArrowLeft size={20} /></button>
                <h2 className="cinzel-font text-amber-400 font-bold text-sm tracking-widest uppercase">Profile</h2>
                <button onClick={() => dispatch(logout())} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-2xl mb-2">
                        {p.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <h3 className="text-slate-100 font-bold text-lg">{p.username}</h3>
                    <p className="text-amber-500 text-xs font-mono">{p.uniqueTag}</p>
                    {profile?.rank && (
                        <div className="flex items-center gap-1 mt-1">
                            <Crown size={12} className="text-amber-400" />
                            <span className="text-amber-400 text-xs font-bold">Rank #{profile.rank}</span>
                        </div>
                    )}
                </div>

                {/* MMR Bar */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Rating</p>
                    <span className="text-2xl font-black text-amber-400">{p.mmr || 1000}</span>
                    <span className="text-xs text-slate-500 ml-1">MMR</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    <StatCard icon={Trophy} label="Wins" value={p.wins || 0} color="#22c55e" />
                    <StatCard icon={Swords} label="Losses" value={p.losses || 0} color="#ef4444" />
                    <StatCard icon={Target} label="Captures" value={p.captures || 0} color="#3b82f6" />
                    <StatCard icon={TrendingUp} label="Win %" value={`${winRate}%`} color="#facc15" />
                </div>

                {/* Match History */}
                <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Recent Matches</p>
                    {(p.matchHistory || []).length === 0 ? (
                        <p className="text-slate-600 text-xs text-center py-4">No matches yet</p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {(p.matchHistory || []).slice(0, 10).map((m, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${m.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="text-xs text-slate-300">{m.opponent}</span>
                                    </div>
                                    <span className={`text-xs font-bold ${m.mmrChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {m.mmrChange > 0 ? '+' : ''}{m.mmrChange} MMR
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileScreen;
