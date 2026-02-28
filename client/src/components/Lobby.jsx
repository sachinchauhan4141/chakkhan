import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMultiplayerState, resetGame } from '../store/gameSlice';
import socketService from '../services/socket';

const ROLE_LABELS = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };

const Lobby = () => {
    const dispatch = useDispatch();
    const { gameMode, roomCode, connectedPlayers } = useSelector(s => s.game);
    const storedUsername = useSelector(s => s.game.localUsername) || 'Player';
    const [queueCount, setQueueCount] = useState(1);
    const [joinCode, setJoinCode] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (gameMode === 'ONLINE') socketService.joinMatchmaking({ username: storedUsername });

        socketService.on('queue_update', d => setQueueCount(d.count));
        socketService.on('match_found', d => dispatch(setMultiplayerState({ roomCode: d.roomCode, localPlayerRole: d.role, connectedPlayers: d.players, isOnline: true })));
        socketService.on('room_created', d => { dispatch(setMultiplayerState({ roomCode: d.roomCode, localPlayerRole: 'p1', connectedPlayers: d.players, isOnline: true })); setIsHost(true); });
        socketService.on('lobby_update', d => dispatch(setMultiplayerState({ connectedPlayers: d.players })));
        socketService.on('game_start', d => { if (d.role) dispatch(setMultiplayerState({ localPlayerRole: d.role, connectedPlayers: d.players })); dispatch(resetGame()); });
        socketService.on('player_left', d => setErrorMsg(d.message || 'A player disconnected.'));
        socketService.on('error_message', d => setErrorMsg(d.message));

        return () => ['queue_update', 'match_found', 'room_created', 'lobby_update', 'game_start', 'player_left', 'error_message'].forEach(e => socketService.off(e));
    }, [gameMode, dispatch, storedUsername]);

    const handleCreateRoom = () => socketService.createPrivateRoom({ username: storedUsername });
    const handleJoinRoom = () => joinCode.trim() && socketService.joinPrivateRoom(joinCode.trim().toUpperCase(), { username: storedUsername });
    const handleBack = () => {
        socketService.disconnect();
        setTimeout(() => socketService.connect(), 300);
        dispatch(setMultiplayerState({ gameMode: 'MENU', isOnline: false, roomCode: null, connectedPlayers: [], localPlayerRole: 'p1' }));
    };

    if (roomCode && connectedPlayers.length === 4)
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-amber-400 cinzel-font text-xl animate-pulse tracking-widest">Starting…</p></div>;

    return (
        <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center px-4">

            <h2 className="cinzel-font font-extrabold text-amber-400 text-2xl tracking-widest uppercase mb-8">
                {gameMode === 'ONLINE' ? 'Matchmaking' : 'Private Room'}
            </h2>

            {/* error */}
            {errorMsg && (
                <div className="mb-5 text-sm text-red-300 bg-red-900/30 border border-red-800 px-4 py-2 rounded-xl max-w-sm w-full text-center">
                    {errorMsg}
                </div>
            )}

            <div className="w-full max-w-sm flex flex-col gap-4">

                {/* ── MATCHMAKING ── */}
                {gameMode === 'ONLINE' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
                        <p className="text-slate-400 text-sm mb-3 animate-pulse">Searching for players…</p>
                        <div className="flex justify-center gap-2 mb-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${i < queueCount ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-slate-700 border-slate-600 text-slate-600'}`}>
                                    {i < queueCount ? '✓' : i + 1}
                                </div>
                            ))}
                        </div>
                        <p className="text-amber-400 font-bold text-lg cinzel-font">{queueCount} / 4</p>
                    </div>
                )}

                {/* ── PRIVATE ROOM ── */}
                {gameMode === 'FRIENDS' && !roomCode && (
                    <div className="flex flex-col gap-3">
                        <button onClick={handleCreateRoom}
                            className="w-full py-4 rounded-2xl font-black text-slate-900 text-base tracking-wide uppercase transition-all active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #b45309' }}>
                            Create Room
                        </button>
                        <div className="flex gap-2">
                            <input type="text" value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                                placeholder="Room code…" maxLength={6}
                                className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500
                                    text-center text-lg font-black tracking-widest rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors uppercase"
                            />
                            <button onClick={handleJoinRoom}
                                className="px-5 py-3 bg-slate-700 border border-slate-600 rounded-xl text-slate-200 font-semibold hover:bg-slate-600 transition-all">
                                Join
                            </button>
                        </div>
                    </div>
                )}

                {/* ── ROOM LOBBY ── */}
                {roomCode && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                        <p className="text-slate-500 text-xs uppercase tracking-widest text-center mb-1">Room Code</p>
                        <button
                            onClick={() => navigator.clipboard?.writeText(roomCode)}
                            className="w-full text-center text-3xl cinzel-font font-extrabold text-amber-400 tracking-widest mb-5 hover:text-amber-300 transition-colors"
                            title="Tap to copy">
                            {roomCode}
                        </button>

                        <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Players ({connectedPlayers.length}/4)</p>
                        <ul className="flex flex-col gap-2 mb-4">
                            {connectedPlayers.map((p, i) => (
                                <li key={i} className="flex items-center justify-between bg-slate-700/50 px-4 py-2.5 rounded-xl">
                                    <span className="text-slate-200 font-semibold text-sm">{p.username}</span>
                                    <span className="text-xs text-slate-400 font-medium">{ROLE_LABELS[p.role] || p.role}</span>
                                </li>
                            ))}
                            {Array.from({ length: 4 - connectedPlayers.length }).map((_, i) => (
                                <li key={`empty-${i}`} className="flex items-center justify-between bg-slate-700/20 border border-dashed border-slate-700 px-4 py-2.5 rounded-xl">
                                    <span className="text-slate-600 text-sm">Waiting…</span>
                                </li>
                            ))}
                        </ul>

                        {connectedPlayers.length === 4 && (
                            <p className="text-amber-400 text-sm text-center animate-pulse">Starting…</p>
                        )}
                    </div>
                )}

                {/* Back */}
                <button onClick={handleBack}
                    className="text-slate-500 hover:text-slate-300 text-sm text-center py-2 transition-colors">
                    ← Back to Menu
                </button>
            </div>
        </div>
    );
};

export default Lobby;
