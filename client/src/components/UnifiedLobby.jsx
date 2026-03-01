/**
 * UnifiedLobby.jsx — A single-screen home interface inspired by BGMI/Valorant.
 * Replaces MainMenu, PlayerSetup, and the old Lobby.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMultiplayerState, resetGame, setBoardTheme } from '../store/gameSlice';
import socketService from '../services/socket';
import LobbyPlayerCard from './LobbyPlayerCard';
import BoardThemeSelector from './BoardThemeSelector';
import LeaderboardScreen from './LeaderboardScreen';
import { Settings, LogOut, Users, UserPlus, MessageCircle, Send, Trophy, Star, ChevronLeft, ChevronRight, X, User, Moon, Sun, Monitor, HelpCircle, Gamepad2 } from 'lucide-react';
import { logout } from '../store/authSlice';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const UnifiedLobby = ({ onProfile, onLeaderboard }) => {
    const dispatch = useDispatch();
    const { token, user } = useSelector(s => s.auth);
    const storedUsername = useSelector(s => s.game.localUsername) || user?.username || 'Player';
    const { boardTheme, connectedPlayers, roomCode, gameMode, localPlayerRole, bonusOnCapture, bonusOnEntry } = useSelector(s => s.game);

    // --- Lobby Configuration State ---
    const [lobbyMode, setLobbyMode] = useState('ONLINE'); // 'ONLINE' | 'OFFLINE'
    const [matchType, setMatchType] = useState('PUBLIC'); // 'PUBLIC' (Matchmaking) | 'PRIVATE' (Custom Room)
    const [offlineType, setOfflineType] = useState('BOTS'); // 'BOTS' | 'LOCAL'
    const [playerCount, setPlayerCount] = useState(4); // 2 | 3 | 4
    const [colorPair, setColorPair] = useState('RY'); // 'RY' | 'BG' (for 2-player)

    // --- Matchmaking & Room State ---
    const [isSearching, setIsSearching] = useState(false);
    const [searchTime, setSearchTime] = useState(0);
    const [queueCount, setQueueCount] = useState(1);
    const [isHost, setIsHost] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState(new Set());

    // --- UI Toggle State ---
    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'friends' | 'rank' | 'settings'
    const [showRules, setShowRules] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);

    // --- Social State ---
    const [friends, setFriends] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);

    // Load friends
    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/friends/list`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setFriends(d.friends || []))
            .catch(() => { });
    }, [token]);

    // Socket Events
    useEffect(() => {
        socketService.on('queue_update', d => setQueueCount(d.count));
        socketService.on('match_found', d => {
            setIsSearching(false);
            dispatch(setMultiplayerState({
                roomCode: d.roomCode, localPlayerRole: d.role,
                connectedPlayers: d.players, isOnline: true,
                playerCount: d.playerCount || playerCount, gameMode: 'ONLINE'
            }));
        });
        socketService.on('room_created', d => {
            dispatch(setMultiplayerState({
                roomCode: d.roomCode, localPlayerRole: 'p1',
                connectedPlayers: d.players, isOnline: true, gameMode: 'FRIENDS'
            }));
            setIsHost(true);
        });
        socketService.on('lobby_update', d => {
            dispatch(setMultiplayerState({ connectedPlayers: d.players }));
        });
        socketService.on('game_start', d => {
            const updates = { connectedPlayers: d.players };
            if (d.role) updates.localPlayerRole = d.role;
            if (d.botPlayers) updates.botPlayers = d.botPlayers;
            dispatch(setMultiplayerState(updates));
            dispatch(resetGame());
        });
        socketService.on('player_left', d => setErrorMsg(d.message || 'Player disconnected.'));
        socketService.on('error_message', d => setErrorMsg(d.message));
        socketService.on('lobby_chat', msg => {
            setChatMessages(prev => [...prev.slice(-50), msg]);
        });
        socketService.on('player_ready', d => {
            setReadyPlayers(prev => { const s = new Set(prev); s.add(d.role); return s; });
        });

        return () => [
            'queue_update', 'match_found', 'room_created', 'lobby_update',
            'game_start', 'player_left', 'error_message', 'lobby_chat', 'player_ready'
        ].forEach(e => socketService.off(e));
    }, [dispatch]);

    // Search Timer
    useEffect(() => {
        if (!isSearching) { setSearchTime(0); return; }
        const interval = setInterval(() => setSearchTime(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isSearching]);

    // Auto-scroll chat
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    // Helpers
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const allReady = roomCode && connectedPlayers.length === playerCount && connectedPlayers.length > 1;

    // --- Actions ---
    const handleStart = () => {
        if (lobbyMode === 'OFFLINE') {
            setShowStartModal(true);
        } else if (lobbyMode === 'ONLINE') {
            if (matchType === 'PUBLIC') {
                if (isSearching) {
                    // Cancel Search
                    socketService.disconnect();
                    setTimeout(() => socketService.connect(token), 300);
                    setIsSearching(false);
                } else {
                    setShowStartModal(true);
                }
            } else if (matchType === 'PRIVATE') {
                if (!roomCode) {
                    socketService.createPrivateRoom({ username: storedUsername, playerCount }); // Create Room bypasses modal
                } else if (isHost && allReady) {
                    setShowStartModal(true);
                }
            }
        }
    };

    const handleConfirmStart = () => {
        setShowStartModal(false);
        if (lobbyMode === 'OFFLINE') {
            // Start Local/Bot Game immediately
            const activePlayers = playerCount === 2 && colorPair === 'BG' ? ['p2', 'p4'] :
                playerCount === 2 ? ['p1', 'p3'] :
                    playerCount === 3 ? ['p1', 'p2', 'p3'] : ['p1', 'p2', 'p3', 'p4'];

            const botPlayers = offlineType === 'BOTS' ? activePlayers.slice(1) : []; // You are p1/p2, rest are bots

            dispatch(setMultiplayerState({
                gameMode: offlineType,
                isOnline: false,
                playerCount: playerCount,
                activePlayers,
                botPlayers,
                localPlayerRole: activePlayers[0],
                localUsername: storedUsername,
                connectedPlayers: []
            }));
            dispatch(resetGame());
        } else if (lobbyMode === 'ONLINE') {
            if (matchType === 'PUBLIC') {
                setIsSearching(true);
                socketService.joinMatchmaking({ username: storedUsername, playerCount });
            } else if (matchType === 'PRIVATE') {
                if (isHost && allReady) {
                    socketService.startGame(roomCode);
                }
            }
        }
    };

    const handleJoinPrivate = () => {
        if (joinCode.trim()) socketService.joinPrivateRoom(joinCode.trim().toUpperCase(), { username: storedUsername });
    };

    const handleLeaveRoom = () => {
        socketService.disconnect();
        setTimeout(() => socketService.connect(token), 300);
        dispatch(setMultiplayerState({ roomCode: null, connectedPlayers: [], gameMode: 'MENU' }));
        setIsHost(true);
        setIsReady(false);
        setReadyPlayers(new Set());
    };

    const handleReady = () => {
        setIsReady(!isReady);
        socketService.emit('player_ready', { roomCode, role: localPlayerRole, ready: !isReady });
    };

    const handleChat = () => {
        if (!chatInput.trim() || !roomCode) return;
        socketService.emit('lobby_chat', { roomCode, message: chatInput.trim(), username: storedUsername });
        setChatMessages(prev => [...prev, { username: storedUsername, message: chatInput.trim(), isMe: true }]);
        setChatInput('');
    };

    const handleLogout = () => { dispatch(logout()); };

    // --- Tab Renders ---

    const renderHomeTab = () => {
        const slots = Array.from({ length: Math.max(4, playerCount) }).slice(0, playerCount);

        return (
            <div className="flex-1 flex flex-col pt-6 px-4">
                {/* Top Bar: Profile & Mode Switcher */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold overflow-hidden">
                                {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-amber-400">{storedUsername[0]?.toUpperCase()}</span>}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-900 text-[9px] font-black px-1 rounded-sm border border-slate-900">
                                Lv.{Math.floor((user?.stats?.wins || 0) / 2) + 1}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-slate-100 font-bold text-xs truncate max-w-[80px]">{storedUsername}</h1>
                            <p className="text-amber-400 text-[9px] font-black">{user?.mmr || 1000} MMR</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-slate-700/50">
                        {['ONLINE', 'OFFLINE'].map(m => (
                            <button key={m} onClick={() => { setLobbyMode(m); if (roomCode) handleLeaveRoom(); setIsSearching(false); }}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${lobbyMode === m ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'text-slate-400'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center Stage: 2x2 Grid of Players */}
                <div className="flex-1 flex flex-col justify-center items-center gap-6 pb-24 relative">
                    {/* Searching Overlay */}
                    {isSearching && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-3xl">
                            <div className="w-24 h-24 rounded-full border-2 border-amber-500/30 flex items-center justify-center mb-4"
                                style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}>
                                <div className="absolute w-full h-full border-t-2 border-amber-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                                <span className="text-amber-400 font-bold text-xl animate-pulse">{formatTime(searchTime)}</span>
                            </div>
                            <h2 className="cinzel-font text-amber-400 text-xl font-black tracking-widest uppercase mb-1">Matchmaking</h2>
                            <p className="text-slate-400 text-xs mb-6">{queueCount} players in queue</p>
                            <button onClick={handleStart} className="px-6 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full text-xs font-bold uppercase tracking-wide">Cancel</button>
                        </div>
                    )}

                    {/* Player Cards: Horizontal Scroll */}
                    <div className="w-full max-w-[400px] flex flex-col items-center gap-2">
                        <div className="w-full flex justify-between items-center px-6">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Squad Roster</span>
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest">
                                {connectedPlayers.length || slots.length}/{slots.length} Ready
                            </span>
                        </div>

                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 w-full px-6 pb-2 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {slots.map((_, i) => {
                                let player;
                                if (lobbyMode === 'ONLINE' && roomCode) player = connectedPlayers[i];
                                else if (lobbyMode === 'OFFLINE' || lobbyMode === 'ONLINE') {
                                    if (i === 0) player = { username: storedUsername, role: 'p1', mmr: user?.mmr };
                                    else if (lobbyMode === 'OFFLINE' && offlineType === 'BOTS') player = { username: `Bot ${i}`, role: `p${i + 1}`, isBot: true };
                                    else if (lobbyMode === 'OFFLINE' && offlineType === 'LOCAL') player = { username: `Player ${i + 1}`, role: `p${i + 1}`, isLocal: true };
                                }
                                const isEmpty = !player;
                                const showInvite = isEmpty && lobbyMode === 'ONLINE' && matchType === 'PRIVATE';
                                return (
                                    <div key={i} className="flex-none aspect-[3/4] w-[140px] snap-center">
                                        <LobbyPlayerCard
                                            player={player}
                                            isEmpty={isEmpty}
                                            isYou={i === 0}
                                            showInvite={showInvite}
                                            isHost={i === 0 || (player && player.role === 'p1')}
                                            isReady={player && readyPlayers.has(player.role)}
                                            index={i}
                                            onInvite={() => { }}
                                            overrideEmpty={showInvite ? 'INVITE' : 'EMPTY'}
                                            scale={1} // Fill container
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Matchmaking Configuration --- */}
                    <div className="mx-6 mt-4 mb-2 bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-3 shadow-xl flex flex-col gap-3 relative z-10 pointer-events-auto">
                        {/* Theme Selector (Mini) */}
                        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Monitor size={12} /> Theme</span>
                            <div className="flex gap-2">
                                <button onClick={() => dispatch(setBoardTheme('light'))} className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${boardTheme === 'light' ? 'bg-amber-100 border-amber-500 text-amber-600 shadow-md' : 'bg-slate-700 border-slate-600 text-slate-400'}`}><Sun size={12} /></button>
                                <button onClick={() => dispatch(setBoardTheme('dark'))} className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${boardTheme === 'dark' ? 'bg-slate-900 border-amber-500 text-amber-500 shadow-md' : 'bg-slate-700 border-slate-600 text-slate-400'}`}><Moon size={12} /></button>
                            </div>
                        </div>

                        {lobbyMode === 'OFFLINE' ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex bg-slate-900/50 rounded-xl p-1 shadow-inner h-8">
                                    {['BOTS', 'LOCAL'].map(t => (
                                        <button key={t} onClick={() => setOfflineType(t)}
                                            className={`flex-1 text-[10px] font-bold tracking-wider rounded-lg transition ${offlineType === t ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                                            {t === 'BOTS' ? 'VS BOTS' : 'PASS & PLAY'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Squad</span>
                                    <div className="flex gap-1.5">
                                        {[2, 3, 4].map(n => (
                                            <button key={n} onClick={() => setPlayerCount(n)}
                                                className={`w-8 h-8 rounded-xl transition flex flex-col items-center justify-center border border-slate-700 ${playerCount === n ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                                <div className="flex justify-center flex-wrap gap-[2px] w-[18px]">
                                                    {Array(n).fill(0).map((_, i) => <User key={i} size={8} strokeWidth={3} />)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex bg-slate-900/50 rounded-xl p-1 shadow-inner h-8">
                                    {['PUBLIC', 'PRIVATE'].map(t => (
                                        <button key={t} onClick={() => { setMatchType(t); if (roomCode) handleLeaveRoom(); }}
                                            className={`flex-1 text-[10px] font-bold tracking-wider rounded-lg transition ${matchType === t ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                                            {t === 'PUBLIC' ? 'RANKED' : 'ROOM'}
                                        </button>
                                    ))}
                                </div>

                                {/* Squad Size / Action Row */}
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Team</span>
                                    <div className="flex gap-1.5">
                                        {[2, 3, 4].map(n => (
                                            <button key={n} onClick={() => { if (!roomCode) setPlayerCount(n); }}
                                                className={`w-8 h-8 rounded-xl transition flex flex-col items-center justify-center border border-slate-700 ${playerCount === n ? 'bg-blue-500 text-white border-blue-400 shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} ${roomCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className="flex justify-center flex-wrap gap-[2px] w-[18px]">
                                                    {Array(n).fill(0).map((_, i) => <User key={i} size={8} strokeWidth={3} />)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Join Code Display (Private Online) */}
                    {
                        lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !roomCode && (
                            <div className="mx-6 w-full max-w-[320px] flex gap-2 mt-2 self-center">
                                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={6}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-black uppercase text-amber-400 outline-none placeholder:text-slate-500" />
                                <button onClick={handleJoinPrivate} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 rounded-xl">JOIN</button>
                            </div>
                        )
                    }
                    {
                        lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && (
                            <div className="mx-6 w-full max-w-[320px] text-center bg-slate-800/50 py-3 rounded-2xl border border-slate-700 mt-2 self-center cursor-pointer active:scale-95 transition-transform" onClick={() => {
                                navigator.clipboard.writeText(roomCode);
                                dispatch({ type: 'game/addLog', payload: 'Code copied!' });
                            }}>
                                <p className="text-[10px] text-slate-500 mb-1">ROOM CODE</p>
                                <div className="flex justify-center items-center gap-4">
                                    <p className="text-2xl font-black text-amber-400 tracking-[0.3em]">{roomCode}</p>
                                    <button onClick={(e) => { e.stopPropagation(); handleLeaveRoom(); }} className="text-red-400 hover:text-red-300 p-2"><LogOut size={16} /></button>
                                </div>
                            </div>
                        )
                    }

                    {/* Start Button */}
                    <div className="w-full max-w-[320px] mt-4 z-10">
                        {errorMsg && <p className="text-red-400 text-xs text-center mb-2 animate-pulse">{errorMsg}</p>}

                        {(lobbyMode === 'OFFLINE' || (lobbyMode === 'ONLINE' && matchType === 'PUBLIC' && !isSearching) || (lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && (!roomCode || isHost || (roomCode && !isHost)))) && (
                            <button onClick={handleStart}
                                disabled={lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && isHost && !allReady}
                                className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all
                                ${lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && isHost && !allReady
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : lobbyMode === 'ONLINE' && matchType === 'PUBLIC'
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95'
                                            : lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !roomCode
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95'
                                                : lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !isHost
                                                    ? isReady ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'bg-slate-600 text-slate-300'
                                                    : 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95'
                                    }`}>
                                {lobbyMode === 'OFFLINE' ? 'START' :
                                    matchType === 'PUBLIC' ? 'FIND MATCH' :
                                        !roomCode ? 'CREATE ROOM' :
                                            !isHost ? (isReady ? 'READY' : 'READY UP') :
                                                'START GAME'}
                            </button>
                        )}
                        <p className="text-center text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                            {lobbyMode === 'OFFLINE' ? `${offlineType === 'BOTS' ? 'vs Bots' : 'Pass & Play'} • Offline` :
                                matchType === 'PUBLIC' ? `${playerCount === 2 ? 'Duo' : playerCount === 3 ? 'Trio' : 'Squad'} • Ranked` :
                                    !roomCode ? `Private • ${playerCount} Players` :
                                        !isHost ? 'Waiting for host' : 'Host Action'}
                        </p>
                    </div>

                    {/* Pre-Game Confirmation Modal overlay */}
                    {showStartModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-slate-800 border-2 border-slate-600 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 overflow-hidden relative">
                                <h3 className="text-xl font-black text-amber-500 tracking-widest uppercase mb-4 text-center">Confirm Match</h3>

                                <div className="space-y-3 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Mode</span>
                                        <span className="text-slate-200 font-black">{lobbyMode} {lobbyMode === 'ONLINE' ? `(${matchType})` : `(${offlineType})`}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Players</span>
                                        <span className="text-slate-200 font-black flex items-center gap-1">{playerCount} <User size={14} /></span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Theme</span>
                                        <span className="text-slate-200 font-black truncate max-w-[120px] text-right">{Object.entries({ 'board-neon': 'Neon Vis' }).find(([k]) => k === themeKey)?.[1] || themeKey}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setShowStartModal(false)} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase tracking-widest transition-colors">Cancel</button>
                                    <button onClick={handleConfirmStart} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]">Confirm</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFriendsTab = () => (
        <div className="flex-1 flex flex-col pt-6 px-4 pb-20">
            <h2 className="text-xl font-black text-amber-400 tracking-widest uppercase mb-4 pl-2">Social</h2>

            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-xl mb-4">
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                    <span className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-amber-400" /> Friends Online</span>
                    <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 py-1.5 px-3 rounded-lg border border-emerald-500/30 transition-colors">
                        <UserPlus size={14} /> Add Friend
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {friends.length === 0 ? (
                        <p className="text-slate-600 text-sm text-center p-8">No friends online</p>
                    ) : (
                        friends.map(f => (
                            <div key={f._id} className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-700/40 p-3 rounded-xl transition cursor-pointer border border-slate-700/30">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold shadow-inner border border-slate-600">{f.username[0]?.toUpperCase()}</div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${f.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-slate-200 text-sm font-bold">{f.username}</p>
                                        <p className="text-slate-500 text-[10px] tracking-wide mt-0.5">{f.mmr || 1000} MMR</p>
                                    </div>
                                </div>
                                {f.isOnline && roomCode && matchType === 'PRIVATE' && (
                                    <button onClick={() => socketService.emit('invite_friend', { roomCode, friendId: f._id })}
                                        className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg hover:bg-amber-500 hover:text-slate-900 transition-colors">
                                        <UserPlus size={18} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Box (If in private room) */}
            {roomCode && matchType === 'PRIVATE' && (
                <div className="h-56 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden shadow-xl">
                    <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
                        <span className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><MessageCircle size={16} className="text-blue-400" /> Room Chat</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 text-xs space-y-1.5">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className="mb-1 leading-relaxed">
                                <span className={`font-black ${msg.isMe ? 'text-amber-400' : 'text-slate-400'}`}>{msg.username}: </span>
                                <span className="text-slate-300 relative tracking-wide">{msg.message}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 bg-slate-800/50 border-t border-slate-700/50 flex gap-2">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                            placeholder="Message..." className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-amber-500/50 transition-colors" />
                        <button onClick={handleChat} className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-2 rounded-xl transition shadow-sm"><Send size={18} /></button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSettingsTab = () => (
        <div className="flex-1 flex flex-col pt-6 px-4 pb-20 overflow-y-auto">
            <h2 className="text-xl font-black text-amber-400 tracking-widest uppercase mb-6 pl-2">Settings</h2>

            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-5 shadow-xl space-y-8">
                {/* Game Guide Modal Trigger */}
                <div className="space-y-3">
                    <button
                        onClick={() => setShowRules(true)}
                        className="w-full flex items-center justify-between p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors group">
                        <span className="text-amber-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <HelpCircle size={18} /> How to Play
                        </span>
                        <ChevronRight className="text-amber-500/50 group-hover:text-amber-400 transition-colors" size={20} />
                    </button>

                    {/* Embedded Expansion (instead of true modal for simplicity to avoid full screen z-index wars on tabs) */}
                    {showRules && (
                        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 text-sm text-slate-300 space-y-4 shadow-inner relative animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => setShowRules(false)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 bg-slate-900/50 rounded-full p-1"><X size={16} /></button>
                            <h3 className="font-black text-amber-500 tracking-widest uppercase mb-1 border-b border-slate-700/50 pb-2">Rulebook</h3>
                            <p className="flex items-start gap-3">
                                <span className="text-amber-500 mt-0.5"><Star size={16} /></span>
                                <span className="leading-relaxed"><strong>Goal:</strong> Be the first to move all your pieces to the center home zone. The game continues until only one player remains!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-red-400 mt-0.5"><Gamepad2 size={16} /></span>
                                <span className="leading-relaxed"><strong>Rolls:</strong> Roll the dice to move. Rolling a <strong className="text-amber-400">4</strong> or an <strong className="text-amber-400">8</strong> grants you an extra bonus roll!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-blue-400 mt-0.5"><X size={16} /></span>
                                <span className="leading-relaxed"><strong>Captures:</strong> Landing exactly on an opponent's piece sends it back to base. You also earn a bonus roll!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-emerald-400 mt-0.5"><Monitor size={16} /></span>
                                <span className="leading-relaxed"><strong>Safe Zones:</strong> Crossed cells are Safe Zones. Pieces cannot be captured while resting on these squares.</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Game Rules Container */}
                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Game Rules</p>
                    <label className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition border border-slate-700/30">
                        <span className="text-sm font-bold text-slate-300">Roll on Capture</span>
                        <input type="checkbox" checked={bonusOnCapture} onChange={(e) => dispatch({ type: 'game/setSettings', payload: { bonusOnCapture: e.target.checked } })} className="accent-amber-500 w-5 h-5 cursor-pointer scale-110" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition border border-slate-700/30">
                        <span className="text-sm font-bold text-slate-300">Roll on Home</span>
                        <input type="checkbox" checked={bonusOnEntry} onChange={(e) => dispatch({ type: 'game/setSettings', payload: { bonusOnEntry: e.target.checked } })} className="accent-amber-500 w-5 h-5 cursor-pointer scale-110" />
                    </label>
                </div>

                {/* Account Actions */}
                <div className="pt-6 border-t border-slate-700/50">
                    <button onClick={handleLogout} className="w-full py-4 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest text-sm transition flex justify-center items-center gap-2">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </div>
        </div>
    );

    // Bottom Navigation Dock
    const renderBottomDock = () => {
        const onlineFriendsCount = friends.filter(f => f.isOnline).length;

        return (
            <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-slate-900 border-t border-slate-800/80 z-50 px-2 sm:px-6 flex justify-around items-center pb-2" style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
                {[
                    { id: 'home', icon: Star, label: 'Play' },
                    { id: 'friends', icon: Users, label: 'Friends', badge: onlineFriendsCount > 0 ? onlineFriendsCount : null },
                    { id: 'rank', icon: Trophy, label: 'Rank', badge: user?.mmr ? Math.floor(user.mmr / 100) / 10 + 'k' : null },
                    { id: 'settings', icon: Settings, label: 'Settings' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id}
                            onClick={() => tab.action ? tab.action() : setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative ${isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>

                            <div className="relative">
                                <Icon size={24} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''} />
                                {tab.badge && (
                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-slate-900 shadow-sm">
                                        {tab.badge}
                                    </div>
                                )}
                            </div>

                            <span className="text-[10px] font-bold tracking-wider">{tab.label}</span>
                            {isActive && <div className="absolute -top-px w-10 h-1 bg-amber-500 rounded-b-full shadow-[0_2px_8px_rgba(245,158,11,0.8)]" />}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-900 overflow-hidden flex flex-col font-sans select-none text-slate-100 pb-[72px]">
            {/* Cinematic Background */}
            <div className="absolute inset-0 opacity-40 mix-blend-color-dodge transition-all duration-1000 z-0 pointer-events-none"
                style={{
                    background: lobbyMode === 'ONLINE' ? 'radial-gradient(ellipse at top right, rgba(59,130,246,0.3) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(245,158,11,0.2) 0%, transparent 60%)' :
                        'radial-gradient(ellipse at center, rgba(239,68,68,0.2) 0%, transparent 70%)'
                }} />

            {/* Grid Texture */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221%22/></svg>')] z-0" />

            {/* Active Tab View */}
            <div className={`relative z-10 flex-1 flex flex-col ${activeTab !== 'rank' ? 'overflow-y-auto' : ''} w-full max-w-md mx-auto`}>
                {activeTab === 'home' && renderHomeTab()}
                {activeTab === 'friends' && renderFriendsTab()}
                {activeTab === 'settings' && renderSettingsTab()}
                {activeTab === 'rank' && <LeaderboardScreen isEmbedded={true} />}
            </div>

            {/* Bottom Dock Navigation */}
            {renderBottomDock()}
        </div>
    );
};

export default UnifiedLobby;
