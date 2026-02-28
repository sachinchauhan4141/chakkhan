import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMultiplayerState, setSettings } from '../store/gameSlice';
import socketService from '../services/socket';

// ─── Design Tokens ──────────────────────────────────────────────────────────
// bg:      #0f172a  slate-900
// surface: #1e293b  slate-800
// border:  #334155  slate-700
// accent:  #f59e0b  amber-500
// text:    #f1f5f9  slate-100
// muted:   #64748b  slate-500

const RULES = [
    { icon: '🎲', text: 'Roll 4 or 8 to enter the board' },
    { icon: '↻', text: 'Complete the full outer ring first' },
    { icon: '⚔️', text: 'Capture an opponent before entering inner ring' },
    { icon: '🏠', text: 'Enter inner ring from your gateway after capture' },
    { icon: '✨', text: '4 (Chakkhan) or 8 (Changa) = bonus roll' },
    { icon: '3×', text: 'Three consecutive high rolls = forfeit turn' },
    { icon: '🎯', text: 'Land exactly on center to win!' },
];

const Toggle = ({ value, onChange }) => (
    <button onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${value ? 'bg-amber-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${value ? 'left-6' : 'left-1'}`} />
    </button>
);

const MainMenu = () => {
    const dispatch = useDispatch();
    const bonusOnCapture = useSelector(s => s.game.bonusOnCapture);
    const bonusOnEntry = useSelector(s => s.game.bonusOnEntry);
    const [activePlayers, setActivePlayers] = useState(0);
    const [username, setUsername] = useState('');
    const [sheet, setSheet] = useState(null); // null | 'rules' | 'settings'

    useEffect(() => {
        socketService.connect();
        socketService.on('active_players_count', setActivePlayers);
        return () => socketService.off('active_players_count');
    }, []);

    const go = (mode) => {
        const name = username.trim() || 'Player';
        const online = mode === 'ONLINE' || mode === 'FRIENDS';
        if (online && !username.trim()) { alert('Enter a username to play online!'); return; }
        dispatch(setMultiplayerState({ gameMode: mode, isOnline: online, localUsername: name, localPlayerRole: 'p1' }));
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center bg-slate-900 overflow-hidden select-none">

            {/* subtle radial glow — amber only */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

            {/* ── TITLE ── */}
            <div className="mt-20 sm:mt-24 mb-2 text-center z-10 px-4">
                <h1 className="cinzel-font font-extrabold tracking-widest text-amber-400 leading-none"
                    style={{
                        fontSize: 'clamp(2.6rem,11vw,4.5rem)',
                        textShadow: '0 0 40px rgba(245,158,11,0.35), 0 2px 0 rgba(0,0,0,0.5)',
                    }}>
                    CHAKKHAN
                </h1>
                <p className="text-amber-600 tracking-[0.5em] text-xs mt-1.5 font-semibold uppercase">Changa</p>
            </div>

            {/* online count */}
            <div className="z-10 flex items-center gap-1.5 mb-10 text-xs text-slate-500 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {activePlayers} online
            </div>

            {/* ── USERNAME ── */}
            <div className="z-10 w-full max-w-xs px-6 mb-6">
                <input
                    type="text" maxLength={16}
                    placeholder="Your name…"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500
                        text-center text-sm font-semibold rounded-full px-5 py-3
                        outline-none focus:border-amber-500 transition-colors"
                />
            </div>

            {/* ── BUTTONS ── */}
            <div className="z-10 w-full max-w-xs px-6 flex flex-col gap-3 mb-10">
                {/* Primary */}
                <button onClick={() => go('BOTS')}
                    className="w-full py-4 rounded-2xl font-black text-slate-900 text-base tracking-wide uppercase transition-all active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                        boxShadow: '0 4px 0 #b45309, 0 6px 20px rgba(245,158,11,0.3)'
                    }}>
                    🤖  Play vs Bots
                </button>

                <button onClick={() => go('LOCAL')}
                    className="w-full py-3.5 rounded-2xl font-semibold text-slate-300 text-sm tracking-wide uppercase
                        bg-slate-800 border border-slate-700 hover:border-slate-600 hover:bg-slate-750 transition-all active:scale-95">
                    🎮  Pass &amp; Play
                </button>

                <div className="h-px bg-slate-700 mx-4" />

                <button onClick={() => go('ONLINE')}
                    className="w-full py-3.5 rounded-2xl font-semibold text-slate-300 text-sm tracking-wide uppercase
                        bg-slate-800 border border-slate-700 hover:border-amber-600/50 transition-all active:scale-95">
                    🌐  Matchmaking
                </button>
                <button onClick={() => go('FRIENDS')}
                    className="w-full py-3.5 rounded-2xl font-semibold text-slate-300 text-sm tracking-wide uppercase
                        bg-slate-800 border border-slate-700 hover:border-amber-600/50 transition-all active:scale-95">
                    👥  Play with Friends
                </button>
            </div>

            {/* ── ICON BUTTONS ── */}
            <div className="z-10 flex gap-8 mb-6">
                {[
                    { key: 'settings', icon: '⚙️', label: 'Settings' },
                    { key: 'rules', icon: '📖', label: 'How to Play' },
                ].map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setSheet(s => s === key ? null : key)}
                        className={`flex flex-col items-center gap-1.5 transition-opacity ${sheet === key ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-800 border border-slate-700">
                            {icon}
                        </div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
                    </button>
                ))}
            </div>

            {/* ── BOTTOM SHEET ── */}
            <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${sheet ? 'translate-y-0' : 'translate-y-full'}`}>
                {sheet && <div className="fixed inset-0 z-[-1] bg-slate-900/60" onClick={() => setSheet(null)} />}
                <div className="rounded-t-3xl px-6 pt-5 pb-10 max-w-sm mx-auto bg-slate-800 border-t border-slate-700"
                    style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
                    <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

                    {sheet === 'settings' && (
                        <>
                            <h2 className="cinzel-font text-slate-100 font-bold text-sm mb-5 uppercase tracking-widest">Settings</h2>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-200 font-semibold">Bonus Roll on Capture</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Extra roll after killing a piece</p>
                                    </div>
                                    <Toggle value={bonusOnCapture} onChange={() => dispatch(setSettings({ bonusOnCapture: !bonusOnCapture }))} />
                                </div>
                                <div className="h-px bg-slate-700" />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-200 font-semibold">Bonus Roll on Destination</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Extra roll when a piece reaches center</p>
                                    </div>
                                    <Toggle value={bonusOnEntry} onChange={() => dispatch(setSettings({ bonusOnEntry: !bonusOnEntry }))} />
                                </div>
                            </div>
                        </>
                    )}

                    {sheet === 'rules' && (
                        <>
                            <h2 className="cinzel-font text-slate-100 font-bold text-sm mb-5 uppercase tracking-widest">How to Play</h2>
                            <ul className="flex flex-col gap-3">
                                {RULES.map((r, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                        <span className="text-amber-500 w-5 text-center shrink-0">{r.icon}</span>
                                        <span>{r.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
