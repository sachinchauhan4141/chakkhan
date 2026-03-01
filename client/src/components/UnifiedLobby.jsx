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
import { Settings, LogOut, Users, UserPlus, MessageCircle, Send, Trophy, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { logout } from '../store/authSlice';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const UnifiedLobby = ({ onProfile, onLeaderboard }) => {
    const dispatch = useDispatch();
    const { token, user } = useSelector(s => s.auth);
    const storedUsername = useSelector(s => s.game.localUsername) || user?.username || 'Player';
    const { boardTheme, connectedPlayers, roomCode, gameMode, localPlayerRole } = useSelector(s => s.game);

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
    const [isFriendsOpen, setIsFriendsOpen] = useState(false);
    const [isStarMenuOpen, setIsStarMenuOpen] = useState(false);

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
                if (isSearching) {
                    socketService.disconnect();
                    setTimeout(() => socketService.connect(token), 300);
                    setIsSearching(false);
                } else {
                    setIsSearching(true);
                    socketService.joinMatchmaking({ username: storedUsername, playerCount });
                }
            } else if (matchType === 'PRIVATE') {
                if (!roomCode) {
                    socketService.createPrivateRoom({ username: storedUsername, playerCount });
                } else if (isHost && allReady) {
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

    // --- Sub-components for UI ---

    // Top Left: Profile
    const renderTopProfile = () => (
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition pointer-events-auto z-50" onClick={onProfile}>
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold shadow-inner shadow-black/50 overflow-hidden">
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-amber-400">{storedUsername[0]?.toUpperCase()}</span>}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 rounded-md border-2 border-slate-900">
                    Lv.{Math.floor((user?.stats?.wins || 0) / 2) + 1}
                </div>
            </div>
            <div>
                <h1 className="text-slate-100 font-bold text-sm tracking-wide">{storedUsername}</h1>
                <p className="text-amber-400 text-[11px] font-black">{user?.mmr || 1000} MMR</p>
            </div>
        </div>
    );

    // Top Center: Mode Switcher
    const renderModeSwitcher = () => (
        <div className="absolute left-1/2 -translate-x-1/2 top-6 flex bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-slate-700/50 pointer-events-auto z-50">
            {['ONLINE', 'OFFLINE'].map(m => (
                <button key={m} onClick={() => { setLobbyMode(m); if (roomCode) handleLeaveRoom(); setIsSearching(false); }}
                    className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${lobbyMode === m ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}>
                    {m}
                </button>
            ))}
        </div>
    );

    // Left Center: Friends & Social Drawer
    const renderSocialPanel = () => (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-stretch pointer-events-auto z-40 transition-all duration-300" style={{ transform: `translateY(-50%) translateX(${isFriendsOpen ? '0' : '-16rem'})` }}>
            <div className="w-64 h-[70vh] flex flex-col gap-4 transition-opacity duration-300 ml-6">
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-amber-400" /> Friends Online</span>
                        {isFriendsOpen && <button onClick={() => setIsFriendsOpen(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {friends.length === 0 ? (
                            <p className="text-slate-600 text-xs text-center p-4">No friends online</p>
                        ) : (
                            friends.map(f => (
                                <div key={f._id} className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-700/40 p-2 rounded-xl transition cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">{f.username[0]?.toUpperCase()}</div>
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${f.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                        </div>
                                        <div>
                                            <p className="text-slate-200 text-xs font-bold">{f.username}</p>
                                            <p className="text-slate-500 text-[9px]">{f.mmr || 1000} MMR</p>
                                        </div>
                                    </div>
                                    {f.isOnline && roomCode && matchType === 'PRIVATE' && (
                                        <button onClick={() => socketService.emit('invite_friend', { roomCode, friendId: f._id })}
                                            className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500/30">
                                            <UserPlus size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Box (If in private room) */}
                {roomCode && matchType === 'PRIVATE' && (
                    <div className="h-48 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-slate-700/50 bg-slate-800/50">
                            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><MessageCircle size={14} className="text-blue-400" /> Room Chat</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 text-[11px]">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className="mb-1">
                                    <span className={`font-bold ${msg.isMe ? 'text-amber-400' : 'text-slate-400'}`}>{msg.username}: </span>
                                    <span className="text-slate-300">{msg.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-2 bg-slate-800/50 flex gap-2">
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                                placeholder="Message..." className="flex-1 bg-slate-900 text-slate-200 px-2 py-1 rounded-lg text-xs outline-none" />
                            <button onClick={handleChat} className="text-amber-400 p-1"><Send size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Handle */}
            <button
                onClick={() => setIsFriendsOpen(!isFriendsOpen)}
                className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 border-l-0 rounded-r-2xl h-24 self-center flex items-center justify-center p-1 text-slate-400 hover:text-amber-400 transition ml-0 shadow-[5px_0_15px_rgba(0,0,0,0.3)]"
            >
                {isFriendsOpen ? <ChevronLeft size={20} /> : <Users size={20} />}
            </button>
        </div>
    );

    // Center Stage: The Squad (Player Cards)
    const renderCenterStage = () => {
        // Build an array of length `playerCount` representing the slots
        const slots = Array.from({ length: Math.max(4, playerCount) }).slice(0, playerCount); // ensure right length

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 pt-16">
                {/* Search Animation Overlay */}
                {isSearching && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/50 backdrop-blur-sm pointer-events-auto">
                        <div className="w-32 h-32 rounded-full border-2 border-amber-500/30 flex items-center justify-center mb-6"
                            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}>
                            <div className="absolute w-full h-full border-t-2 border-amber-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                            <span className="text-amber-400 font-bold text-2xl animate-pulse">{formatTime(searchTime)}</span>
                        </div>
                        <h2 className="cinzel-font text-amber-400 text-2xl font-black tracking-[0.2em] mb-2 uppercase">Matchmaking</h2>
                        <p className="text-slate-400 text-sm">{queueCount} players in queue</p>
                        <button onClick={handleStart} className="mt-8 px-8 py-3 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full font-bold uppercase tracking-widest hover:bg-red-500/30 transition">Cancel</button>
                    </div>
                )}

                <div className={`flex flex-row justify-center gap-4 sm:gap-6 pointer-events-auto relative z-0 scale-90 sm:scale-100`}>
                    {slots.map((_, i) => {
                        let player;
                        if (lobbyMode === 'ONLINE' && roomCode) {
                            player = connectedPlayers[i]; // Private room populated
                        } else if (lobbyMode === 'OFFLINE' || lobbyMode === 'ONLINE') {
                            // Offline or Online Lobby Preview
                            if (i === 0) {
                                // Slot 1: Local User
                                player = { username: storedUsername, role: 'p1', mmr: user?.mmr };
                            } else if (lobbyMode === 'OFFLINE' && offlineType === 'BOTS') {
                                player = { username: `Bot ${i}`, role: `p${i + 1}`, isBot: true };
                            } else if (lobbyMode === 'OFFLINE' && offlineType === 'LOCAL') {
                                player = { username: `Player ${i + 1}`, role: `p${i + 1}`, isLocal: true };
                            }
                        }

                        // Determine visual state for empty slots
                        let isEmpty = !player;
                        let showInvite = isEmpty && lobbyMode === 'ONLINE' && matchType === 'PRIVATE';

                        return (
                            <div key={i} className="transform transition-transform duration-500 hover:-translate-y-2">
                                <LobbyPlayerCard
                                    player={player}
                                    isEmpty={isEmpty}
                                    isYou={i === 0}
                                    isHost={i === 0 || (player && player.role === 'p1')}
                                    isReady={player && readyPlayers.has(player.role)}
                                    index={i}
                                    onInvite={() => { }} // Could trigger a modal
                                    overrideEmpty={showInvite ? 'INVITE FRIEND' : 'EMPTY'}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Bottom Left: Star Config panel
    const renderBottomLeftConfig = () => (
        <div className="absolute bottom-6 left-6 pointer-events-auto z-50">
            {/* The Star Toggle Button */}
            <button
                onClick={() => setIsStarMenuOpen(!isStarMenuOpen)}
                className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-2xl ${isStarMenuOpen ? 'bg-amber-500 border-amber-400 text-slate-900 rotate-90' : 'bg-slate-800/80 backdrop-blur-md border-slate-600/50 text-amber-400 hover:scale-110 hover:border-amber-400/50 hover:bg-slate-700'}`}
            >
                {isStarMenuOpen ? <X size={28} /> : <Star size={28} />}
            </button>

            {/* Popup Menu */}
            <div className={`absolute bottom-20 left-0 transition-all duration-300 origin-bottom-left ${isStarMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'}`}>
                <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-row gap-6">

                    {/* Theme Selector */}
                    <div className="w-48">
                        <BoardThemeSelector selectedTheme={boardTheme} onSelect={t => dispatch(setBoardTheme(t))} miniMode={true} />
                    </div>

                    {/* Mode Specific Config */}
                    <div className="w-48 flex flex-col justify-between border-l border-slate-700/50 pl-6">
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Settings</p>
                            {lobbyMode === 'OFFLINE' ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex bg-slate-800 rounded-xl p-1">
                                        {['BOTS', 'LOCAL'].map(t => (
                                            <button key={t} onClick={() => setOfflineType(t)}
                                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${offlineType === t ? 'bg-amber-500 text-slate-900' : 'text-slate-400'}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-300">
                                        <span>Squad Size</span>
                                        <div className="flex gap-1">
                                            {[2, 3, 4].map(n => (
                                                <button key={n} onClick={() => setPlayerCount(n)}
                                                    className={`w-6 h-6 rounded-md font-bold transition flex items-center justify-center ${playerCount === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex bg-slate-800 rounded-xl p-1">
                                        {['PUBLIC', 'PRIVATE'].map(t => (
                                            <button key={t} onClick={() => { setMatchType(t); if (roomCode) handleLeaveRoom(); }}
                                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${matchType === t ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>
                                                {t === 'PUBLIC' ? 'Matchmaking' : 'Custom Room'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-300">
                                        <span>Team Size</span>
                                        <div className="flex gap-1">
                                            {[2, 3, 4].map(n => (
                                                <button key={n} onClick={() => { if (!roomCode) setPlayerCount(n); }}
                                                    className={`w-6 h-6 rounded-md font-bold transition flex items-center justify-center ${playerCount === n ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} ${roomCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Join code for private online */}
                        {lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !roomCode && (
                            <div className="mt-4 flex gap-2">
                                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="CODE" maxLength={6}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs font-black uppercase text-amber-400 outline-none" />
                                <button onClick={handleJoinPrivate} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-lg transition">JOIN</button>
                            </div>
                        )}
                        {lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && (
                            <div className="mt-4 text-center">
                                <p className="text-[9px] text-slate-500 mb-1">ROOM CODE</p>
                                <p className="text-xl font-black text-amber-400 tracking-[0.3em]">{roomCode}</p>
                                <button onClick={handleLeaveRoom} className="mt-2 text-red-400 text-[10px] font-bold hover:text-red-300">Leave Room</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Bottom Right: Start Button
    const renderBottomRightAction = () => {
        let btnText = "START";
        let subText = "Squad Up";
        let btnClass = "from-amber-400 to-amber-600 text-slate-900 shadow-[0_0_30px_rgba(245,158,11,0.4)]";
        let disabled = false;

        if (lobbyMode === 'ONLINE') {
            if (matchType === 'PUBLIC') {
                btnText = "FIND MATCH";
                subText = `${playerCount === 2 ? 'Duo' : playerCount === 3 ? 'Trio' : 'Squad'} • Ranked`;
                btnClass = "from-blue-500 to-indigo-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]";
                if (isSearching) disabled = true; // Handled by overlay cancel button
            } else {
                if (!roomCode) {
                    btnText = "CREATE ROOM";
                    subText = `Private • ${playerCount} Players`;
                    btnClass = "from-emerald-500 to-teal-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]";
                } else if (!isHost) {
                    btnText = isReady ? "READY" : "READY UP";
                    subText = "Waiting for host";
                    btnClass = isReady ? "from-emerald-500 to-teal-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]" : "from-slate-600 to-slate-800 text-slate-300";
                } else {
                    btnText = "START GAME";
                    subText = "Host Action";
                    if (!allReady) {
                        btnClass = "from-slate-600 to-slate-800 text-slate-500 cursor-not-allowed";
                        disabled = true;
                    }
                }
            }
        } else {
            subText = `${offlineType === 'BOTS' ? 'vs Bots' : 'Pass & Play'} • Offline`;
        }

        return (
            <div className="absolute bottom-6 right-6 flex items-end gap-6 pointer-events-none z-50">
                {/* Error toast */}
                {errorMsg && (
                    <div className="bg-red-900/80 backdrop-blur-md px-4 py-2 border border-red-700 rounded-xl text-red-200 text-xs shadow-2xl origin-bottom-right animate-pulse pointer-events-auto absolute bottom-24 right-0 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span>{errorMsg}</span>
                            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">✕</button>
                        </div>
                    </div>
                )}

                {/* Vertical Utilities Group */}
                <div className="flex flex-col gap-3 pointer-events-auto">
                    <button onClick={onLeaderboard} className="w-12 h-12 flex justify-center items-center bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/50 hover:bg-slate-700 text-amber-400 hover:scale-110 transition shadow-lg" title="Leaderboard">
                        <Trophy size={20} />
                    </button>
                    <button className="w-12 h-12 flex justify-center items-center bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/50 hover:bg-slate-700 text-slate-300 hover:scale-110 transition shadow-lg" title="Settings">
                        <Settings size={20} />
                    </button>
                    <button onClick={handleLogout} className="w-12 h-12 flex justify-center items-center bg-red-900/40 backdrop-blur-sm rounded-2xl border border-red-900/50 hover:bg-red-900/70 text-red-400 hover:scale-110 transition shadow-lg" title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Massive Start Button */}
                <div className="pointer-events-auto">
                    {!isHost && roomCode ? (
                        <button onClick={handleReady} className={`relative overflow-hidden w-64 h-28 rounded-[2rem] font-black text-3xl tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-br border-4 border-slate-900/50 ${btnClass}`}>
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isReady && <span className="text-xl">✓</span>} {btnText}
                            </span>
                        </button>
                    ) : (
                        <button onClick={handleStart} disabled={disabled} className={`relative overflow-hidden w-64 h-28 rounded-[2rem] font-black text-3xl tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-br border-4 border-slate-900/50 ${btnClass}`}>
                            <div className="absolute inset-0 bg-white/10 hover:bg-transparent transition-colors duration-300" />
                            <span className="relative z-10 flex flex-col items-center justify-center h-full">
                                <span>{btnText}</span>
                                <span className="text-[11px] opacity-80 font-bold tracking-widest uppercase mt-1">{subText}</span>
                            </span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900 text-slate-100 overflow-hidden font-sans select-none" style={{ height: '100dvh' }}>
            {/* Cinematic Background */}
            <div className="absolute inset-0 opacity-40 mix-blend-color-dodge transition-all duration-1000"
                style={{
                    background: lobbyMode === 'ONLINE' ? 'radial-gradient(ellipse at top, rgba(59,130,246,0.3) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(245,158,11,0.2) 0%, transparent 60%)' :
                        'radial-gradient(ellipse at center, rgba(239,68,68,0.2) 0%, transparent 70%)'
                }} />

            {/* Grid Texture */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221%22/></svg>')] z-0" />

            {/* Absolute Placed Layout Items */}
            {renderTopProfile()}
            {renderModeSwitcher()}
            {renderSocialPanel()}
            {renderCenterStage()}
            {renderBottomLeftConfig()}
            {renderBottomRightAction()}
        </div>
    );
};

export default UnifiedLobby;
