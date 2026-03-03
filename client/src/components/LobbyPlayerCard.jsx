/**
 * LobbyPlayerCard.jsx — Premium player card for the game lobby
 *
 * Shows avatar, username, rank badge, MMR, and ready status.
 * Inspired by BGMI/Valorant lobby player slots.
 */
import React from 'react';

// ─── Rank System ─────────────────────────────────────────────────────────────
const RANKS = [
    { name: 'Bronze', min: 0, color: '#cd7f32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)', icon: '🥉' },
    { name: 'Silver', min: 1100, color: '#c0c0c0', bg: 'rgba(192,192,192,0.15)', border: 'rgba(192,192,192,0.4)', icon: '🥈' },
    { name: 'Gold', min: 1300, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', icon: '🥇' },
    { name: 'Platinum', min: 1500, color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.4)', icon: '💎' },
    { name: 'Diamond', min: 1700, color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)', icon: '💠' },
    { name: 'Master', min: 2000, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.4)', icon: '👑' },
];

export const getRank = (mmr = 1000) => {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (mmr >= RANKS[i].min) return RANKS[i];
    }
    return RANKS[0];
};

// ─── Player Colors ───────────────────────────────────────────────────────────
const PLAYER_COLORS = { p1: '#ef4444', p2: '#3b82f6', p3: '#facc15', p4: '#22c55e' };
const PLAYER_LABELS = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };

// ─── Filled Player Card ──────────────────────────────────────────────────────
const FilledCard = ({ player, isYou, isHost, isReady, onViewProfile }) => {
    const rank = getRank(player.mmr || 1000);
    const roleColor = PLAYER_COLORS[player.role] || '#94a3b8';

    return (
        <div className={`relative group overflow-hidden rounded-2xl border transition-all duration-300 ${onViewProfile && !isYou && !player.isBot ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            onClick={() => { if (onViewProfile && !isYou && !player.isBot) onViewProfile(player); }}
            style={{
                background: `linear-gradient(135deg, ${rank.bg}, rgba(15,23,42,0.9))`,
                borderColor: isReady ? '#22c55e' : rank.border,
                boxShadow: isReady
                    ? '0 0 20px rgba(34,197,94,0.3), inset 0 0 20px rgba(34,197,94,0.05)'
                    : `0 0 20px ${rank.bg}, inset 0 0 20px ${rank.bg}`,
            }}>

            {/* Ready pulse ring */}
            {isReady && (
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 border-2 border-emerald-400 pointer-events-none"
                    style={{ animationDuration: '2s' }} />
            )}

            {/* Role color strip */}
            <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ background: roleColor }} />

            <div className="p-4 flex flex-col items-center gap-2 relative z-10">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black border-2 transition-colors"
                        style={{
                            background: `linear-gradient(135deg, ${roleColor}30, ${roleColor}10)`,
                            borderColor: roleColor,
                            color: roleColor,
                            boxShadow: `0 0 15px ${roleColor}40`
                        }}>
                        {player.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-800 bg-emerald-500" />
                    {/* Host crown */}
                    {isHost && (
                        <span className="absolute -top-2 -right-2 text-sm">👑</span>
                    )}
                </div>

                {/* Name + Tag */}
                <div className="text-center">
                    <p className="text-sm font-bold text-slate-100 leading-tight truncate max-w-[120px]">
                        {player.username} {isYou && <span className="text-[9px] text-amber-400">(You)</span>}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono">{PLAYER_LABELS[player.role]}</p>
                </div>

                {/* Rank Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
                    style={{ background: rank.bg, borderColor: rank.border }}>
                    <span className="text-xs">{rank.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rank.color }}>
                        {rank.name}
                    </span>
                </div>

                {/* MMR */}
                <p className="text-lg font-black tabular-nums" style={{ color: rank.color }}>
                    {player.mmr || 1000}
                    <span className="text-[8px] text-slate-500 ml-1 font-medium">MMR</span>
                </p>

                {/* Ready Status */}
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${isReady ? 'text-emerald-400' : 'text-slate-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    {isReady ? 'Ready' : 'Not Ready'}
                </div>
            </div>
        </div>
    );
};

// ─── Empty Slot Card ─────────────────────────────────────────────────────────
const EmptyCard = ({ index, onInvite }) => (
    <div className="rounded-2xl border-2 border-dashed border-slate-700/50 bg-slate-800/20 backdrop-blur-sm flex flex-col items-center justify-center gap-3 min-h-[220px] transition-all hover:border-slate-600/50">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
            <span className="text-slate-600 text-2xl">+</span>
        </div>
        <p className="text-slate-600 text-xs font-medium animate-pulse">Waiting for player…</p>
        {onInvite && (
            <button onClick={onInvite}
                className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-all">
                Invite Friend
            </button>
        )}
    </div>
);

// ─── Main Export ─────────────────────────────────────────────────────────────
const LobbyPlayerCard = ({ player, isYou, isHost, isReady, isEmpty, index, onInvite, onViewProfile }) => {
    if (isEmpty || !player) return <EmptyCard index={index} onInvite={onInvite} />;
    return <FilledCard player={player} isYou={isYou} isHost={isHost} isReady={isReady} onViewProfile={onViewProfile} />;
};

export default LobbyPlayerCard;
