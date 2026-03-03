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
import ProfileScreen from './ProfileScreen';
import { Settings, LogOut, Users, UserPlus, MessageCircle, Send, Trophy, Star, ChevronLeft, ChevronRight, X, User, Moon, Sun, Monitor, HelpCircle, Gamepad2, Search, Check, Circle } from 'lucide-react';
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
    const [friendsTab, setFriendsTab] = useState('friends'); // 'friends' | 'requests' | 'search'
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [statusMsg, setStatusMsg] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewProfileId, setViewProfileId] = useState(null);

    useEffect(() => {
        const checkFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', checkFullscreen);
        checkFullscreen();
        return () => document.removeEventListener('fullscreenchange', checkFullscreen);
    }, []);

    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const loadFriends = () => {
        if (!token) return;
        fetch(`${API}/api/friends/list`, { headers })
            .then(r => r.json())
            .then(d => { setFriends(d.friends || []); setRequests(d.requests || []); })
            .catch(() => { });
    };

    // Load friends
    useEffect(() => { loadFriends(); }, [token]);

    const searchUsers = (q) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        fetch(`${API}/api/friends/search?q=${encodeURIComponent(q)}`, { headers })
            .then(r => r.json()).then(d => setSearchResults(d.users || [])).catch(() => { });
    };

    const sendRequest = async (tag) => {
        const res = await fetch(`${API}/api/friends/send`, { method: 'POST', headers, body: JSON.stringify({ targetTag: tag }) });
        const data = await res.json();
        setStatusMsg(data.message || data.error);
        setTimeout(() => setStatusMsg(''), 3000);
        loadFriends();
    };

    const acceptRequest = async (fromId) => {
        await fetch(`${API}/api/friends/accept`, { method: 'POST', headers, body: JSON.stringify({ fromId }) });
        loadFriends();
    };

    const declineRequest = async (fromId) => {
        await fetch(`${API}/api/friends/decline`, { method: 'POST', headers, body: JSON.stringify({ fromId }) });
        loadFriends();
    };

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
                    socketService.emit('leave_queue');
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

        // Attempt to force fullscreen for pro-level immersive feel
        try {
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.warn("Fullscreen deferred:", err));
            }
        } catch (e) {
            console.warn("Fullscreen API not supported");
        }

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

    const handleAddFriend = (e) => {
        e.preventDefault();
        if (!addFriendInput.trim()) return;

        // Simulate adding a friend
        const newFriend = {
            _id: Date.now().toString(),
            username: addFriendInput.trim(),
            mmr: 1000,
            isOnline: true
        };

        setFriends(prev => [newFriend, ...prev]);
        setAddFriendInput('');
        setShowAddFriend(false);
        dispatch({ type: 'game/addLog', payload: `Added ${newFriend.username} as a friend!` });
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
                    <div
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold overflow-hidden">
                                {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-indigo-600">{storedUsername[0]?.toUpperCase()}</span>}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white text-[9px] font-black px-1 rounded-sm border border-white">
                                Lv.{Math.floor((user?.stats?.wins || 0) / 2) + 1}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-slate-800 font-bold text-xs truncate max-w-[80px]">{storedUsername}</h1>
                            <p className="text-indigo-500 text-[9px] font-black">{user?.mmr || 1000} MMR</p>
                        </div>
                    </div>

                    <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-full border border-slate-200 shadow-sm">
                        {['ONLINE', 'OFFLINE'].map(m => (
                            <button key={m} onClick={() => { setLobbyMode(m); if (roomCode) handleLeaveRoom(); setIsSearching(false); }}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${lobbyMode === m ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center Stage: 2x2 Grid of Players */}
                <div className="flex-1 flex flex-col justify-center items-center gap-6 pb-24 relative">
                    {/* Searching Overlay */}
                    {isSearching && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-3xl p-4">
                            <div className="w-24 h-24 rounded-full border-2 border-indigo-200 flex items-center justify-center mb-4 bg-indigo-50/50">
                                <div className="absolute w-full h-full border-t-2 border-indigo-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                                <span className="text-indigo-600 font-bold text-xl animate-pulse">{formatTime(searchTime)}</span>
                            </div>
                            <h2 className="cinzel-font text-indigo-700 text-xl font-black tracking-widest uppercase mb-1">Matchmaking</h2>
                            <p className="text-slate-500 text-xs mb-6">{queueCount} players in queue</p>
                            <button onClick={handleStart} className="px-6 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-rose-100 transition">Cancel</button>
                        </div>
                    )}

                    {/* Player Cards: Horizontal Scroll */}
                    <div className="w-full max-w-[400px] flex flex-col items-center gap-2 mt-4">
                        <div className="w-full flex justify-between items-center px-6">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Squad Roster</span>
                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest shadow-sm">
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
                                            onInvite={() => { setFriendsTab('friends'); setActiveTab('friends'); }}
                                            onViewProfile={(p) => setViewProfileId(p.id)}
                                            overrideEmpty={showInvite ? 'INVITE' : 'EMPTY'}
                                            scale={1} // Fill container
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Matchmaking Configuration --- */}
                    <div className="mx-6 mt-4 mb-2 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-3 shadow-md flex flex-col gap-3 relative z-10 pointer-events-auto">
                        {/* Theme Selector (Mini) */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Monitor size={12} /> Theme</span>
                            <div className="flex gap-2">
                                <button onClick={() => dispatch(setBoardTheme('light'))} className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${boardTheme === 'light' ? 'bg-indigo-50 border-indigo-400 text-indigo-600 shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}><Sun size={12} /></button>
                                <button onClick={() => dispatch(setBoardTheme('dark'))} className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${boardTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}><Moon size={12} /></button>
                            </div>
                        </div>

                        {lobbyMode === 'OFFLINE' ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex bg-slate-100 rounded-xl p-1 h-8">
                                    {['BOTS', 'LOCAL'].map(t => (
                                        <button key={t} onClick={() => setOfflineType(t)}
                                            className={`flex-1 text-[10px] font-bold tracking-wider rounded-lg transition ${offlineType === t ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {t === 'BOTS' ? 'VS BOTS' : 'PASS & PLAY'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between px-1 mt-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Squad</span>
                                    <div className="flex gap-1.5">
                                        {[2, 3, 4].map(n => (
                                            <button key={n} onClick={() => setPlayerCount(n)}
                                                className={`w-8 h-8 rounded-xl transition flex flex-col items-center justify-center border ${playerCount === n ? 'bg-indigo-50 text-indigo-600 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
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
                                <div className="flex bg-slate-100 rounded-xl p-1 h-8">
                                    {['PUBLIC', 'PRIVATE'].map(t => (
                                        <button key={t} onClick={() => { setMatchType(t); if (roomCode) handleLeaveRoom(); }}
                                            className={`flex-1 text-[10px] font-bold tracking-wider rounded-lg transition ${matchType === t ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {t === 'PUBLIC' ? 'RANKED' : 'ROOM'}
                                        </button>
                                    ))}
                                </div>

                                {/* Squad Size / Action Row */}
                                <div className="flex items-center justify-between px-1 mt-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Team</span>
                                    <div className="flex gap-1.5">
                                        {[2, 3, 4].map(n => (
                                            <button key={n} onClick={() => { if (!roomCode) setPlayerCount(n); }}
                                                className={`w-8 h-8 rounded-xl transition flex flex-col items-center justify-center border ${playerCount === n ? 'bg-indigo-50 text-indigo-600 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'} ${roomCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-sm font-black uppercase text-indigo-600 outline-none placeholder:text-slate-400 shadow-sm focus:border-indigo-400" />
                                <button onClick={handleJoinPrivate} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 rounded-xl shadow-sm transition">JOIN</button>
                            </div>
                        )
                    }
                    {
                        lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && (
                            <div className="mx-6 w-full max-w-[320px] text-center bg-white/80 py-3 rounded-2xl border border-slate-200 shadow-sm mt-2 self-center cursor-pointer active:scale-95 transition-transform" onClick={() => {
                                navigator.clipboard.writeText(roomCode);
                                dispatch({ type: 'game/addLog', payload: 'Code copied!' });
                            }}>
                                <p className="text-[10px] text-slate-500 mb-1 font-bold">ROOM CODE</p>
                                <div className="flex justify-center items-center gap-4">
                                    <p className="text-2xl font-black text-indigo-600 tracking-[0.3em]">{roomCode}</p>
                                    <button onClick={(e) => { e.stopPropagation(); handleLeaveRoom(); }} className="text-rose-500 hover:text-rose-600 bg-rose-50 p-2 rounded-full"><LogOut size={16} /></button>
                                </div>
                            </div>
                        )
                    }

                    {/* Start Button */}
                    <div className="w-full max-w-[320px] mt-4 z-10">
                        {errorMsg && <p className="text-rose-500 text-xs text-center mb-2 animate-pulse font-bold">{errorMsg}</p>}

                        {(lobbyMode === 'OFFLINE' || (lobbyMode === 'ONLINE' && matchType === 'PUBLIC' && !isSearching) || (lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && (!roomCode || isHost || (roomCode && !isHost)))) && (
                            <button onClick={handleStart}
                                disabled={lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && isHost && !allReady}
                                className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all
                                ${lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && roomCode && isHost && !allReady
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : lobbyMode === 'ONLINE' && matchType === 'PUBLIC'
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg active:scale-95'
                                            : lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !roomCode
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg active:scale-95'
                                                : lobbyMode === 'ONLINE' && matchType === 'PRIVATE' && !isHost
                                                    ? isReady ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                    : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md hover:shadow-lg active:scale-95'
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 overflow-hidden relative">
                                <h3 className="text-xl font-black text-indigo-600 tracking-widest uppercase mb-4 text-center">Confirm Match</h3>

                                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">Mode</span>
                                        <span className="text-slate-800 font-black">{lobbyMode} {lobbyMode === 'ONLINE' ? `(${matchType})` : `(${offlineType})`}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">Players</span>
                                        <span className="text-slate-800 font-black flex items-center gap-1">{playerCount} <User size={14} /></span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">Theme</span>
                                        <span className="text-slate-800 font-black truncate max-w-[120px] text-right">{Object.entries({ 'board-neon': 'Neon Vis' }).find(([k]) => k === boardTheme)?.[1] || boardTheme}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setShowStartModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-widest transition-colors">Cancel</button>
                                    <button onClick={handleConfirmStart} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest transition-colors shadow-md hover:shadow-lg">Confirm</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderProfileTab = () => {
        const wins = user?.stats?.wins || 0;
        const totalGames = user?.stats?.totalGames || 0;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        return (
            <div className="flex-1 flex flex-col pt-6 px-4 pb-20 overflow-y-auto animate-in fade-in">
                <div className="flex items-center gap-4 mb-8 pl-2">
                    <button onClick={() => setActiveTab('home')} className="p-2 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-full transition-colors border border-slate-200">
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <h2 className="text-xl font-black text-indigo-600 tracking-widest uppercase">Profile</h2>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl font-bold overflow-hidden border-4 border-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]">
                            {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-indigo-500">{storedUsername[0]?.toUpperCase()}</span>}
                        </div>
                        <div className="absolute -bottom-2 right-0 bg-indigo-500 text-white text-sm font-black px-2 py-0.5 rounded-lg border-2 border-white shadow-md">
                            Lv.{Math.floor(wins / 2) + 1}
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 mb-1">{storedUsername}</h1>
                    <p className="text-indigo-500 font-bold tracking-widest uppercase text-sm">Competitor</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Rank Rating</p>
                        <p className="text-2xl font-black text-indigo-600">{user?.mmr || 1000}</p>
                    </div>
                    <div className="bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-2xl font-black text-emerald-500">{winRate}%</p>
                    </div>
                    <div className="bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Wins</p>
                        <p className="text-2xl font-black text-slate-700">{wins}</p>
                    </div>
                    <div className="bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Games Played</p>
                        <p className="text-2xl font-black text-slate-700">{totalGames}</p>
                    </div>
                </div>

                <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-slate-800 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Trophy size={14} className="text-amber-500" /> Recent Matches
                    </h3>
                    <div className="flex flex-col gap-2">
                        {(!user?.matchHistory || user.matchHistory.length === 0) ? (
                            <p className="text-slate-400 text-xs text-center p-4">No matches played yet.</p>
                        ) : (
                            user.matchHistory.map((match, idx) => {
                                const isWin = match.result === 'win';
                                const date = new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${isWin ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {isWin ? 'Win' : 'Loss'}
                                            </div>
                                            <div>
                                                <p className="text-slate-800 text-sm font-bold truncate max-w-[120px]">vs {match.opponent}</p>
                                                <p className="text-slate-400 text-[10px]">{date}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isWin ? '+' : ''}{match.mmrChange} MMR
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderFriendsTab = () => (
        <div className="flex-1 flex flex-col pt-6 px-4 pb-20">
            <h2 className="text-xl font-black text-indigo-600 tracking-widest uppercase mb-4 pl-2">Social</h2>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 flex-1 flex flex-col overflow-hidden shadow-sm mb-4">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50">
                    {[
                        { key: 'friends', label: 'Friends', count: friends.length },
                        { key: 'requests', label: 'Requests', count: requests.length },
                        { key: 'search', label: 'Search' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setFriendsTab(t.key)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${friendsTab === t.key ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}>
                            {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                        </button>
                    ))}
                </div>

                {/* Status message */}
                {statusMsg && (
                    <div className="mx-4 mt-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600 text-xs text-center font-bold">
                        {statusMsg}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {/* Friends List */}
                    {friendsTab === 'friends' && (
                        friends.length === 0
                            ? <p className="text-slate-400 text-xs text-center py-8">No friends yet. Search someone's rank tag to add them!</p>
                            : <div className="flex flex-col gap-1.5">
                                {friends.map(f => (
                                    <div key={f._id} className="flex items-center justify-between bg-white hover:bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 transition-colors shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 border border-indigo-100">
                                                    {f.username?.[0]?.toUpperCase()}
                                                </div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${f.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-800 font-bold leading-tight">{f.username}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{f.uniqueTag}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{f.mmr} MMR</span>
                                            {f.isOnline && roomCode && matchType === 'PRIVATE' && (
                                                <button onClick={() => socketService.emit('invite_friend', { roomCode, friendId: f._id })}
                                                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-sm">
                                                    <UserPlus size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {/* Requests */}
                    {friendsTab === 'requests' && (
                        requests.length === 0
                            ? <p className="text-slate-400 text-xs text-center py-8">No pending requests</p>
                            : <div className="flex flex-col gap-1.5">
                                {requests.map(r => (
                                    <div key={r._id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
                                        <div>
                                            <p className="text-sm text-slate-800 font-bold leading-tight">{r.username}</p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{r.uniqueTag}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptRequest(r._id)}
                                                className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center transition-colors">
                                                <Check size={16} className="text-emerald-600" />
                                            </button>
                                            <button onClick={() => declineRequest(r._id)}
                                                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-colors">
                                                <X size={16} className="text-rose-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {/* Search */}
                    {friendsTab === 'search' && (
                        <div>
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Search by name or tag…" value={searchQuery}
                                    onChange={e => searchUsers(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400
                                        text-sm rounded-xl pl-9 pr-4 py-3 outline-none focus:border-indigo-400 focus:bg-white transition-colors shadow-sm" />
                            </div>

                            {/* Your tag for sharing */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-center shadow-sm">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Your Tag</p>
                                <button onClick={() => {
                                    navigator.clipboard?.writeText(user?.uniqueTag);
                                    dispatch({ type: 'game/addLog', payload: 'Tag copied!' });
                                }}
                                    className="text-indigo-600 font-mono font-black text-lg hover:text-indigo-500 transition-colors"
                                    title="Tap to copy">{user?.uniqueTag}</button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {searchResults.map(u => (
                                    <div key={u._id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
                                        <div>
                                            <p className="text-sm text-slate-800 font-bold leading-tight">{u.username}</p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.uniqueTag}</p>
                                        </div>
                                        <button onClick={() => sendRequest(u.uniqueTag)}
                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
                                            <UserPlus size={16} className="text-indigo-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Box (If in private room) */}
            {roomCode && matchType === 'PRIVATE' && (
                <div className="h-56 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <span className="text-slate-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><MessageCircle size={16} className="text-indigo-500" /> Room Chat</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 text-xs space-y-1.5">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className="mb-1 leading-relaxed">
                                <span className={`font-black ${msg.isMe ? 'text-indigo-600' : 'text-slate-600'}`}>{msg.username}: </span>
                                <span className="text-slate-700 relative tracking-wide">{msg.message}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                            placeholder="Message..." className="flex-1 bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm transition-colors" />
                        <button onClick={handleChat} className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-xl transition shadow-sm"><Send size={18} /></button>
                    </div>
                </div>
            )}

            {/* Profile Viewer Overlay */}
            {viewProfileId && <ProfileScreen onClose={() => setViewProfileId(null)} viewUserId={viewProfileId} />}
        </div>
    );

    const renderSettingsTab = () => (
        <div className="flex-1 flex flex-col pt-6 px-4 pb-20 overflow-y-auto">
            <h2 className="text-xl font-black text-indigo-600 tracking-widest uppercase mb-6 pl-2">Settings</h2>

            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 p-5 shadow-sm space-y-8">
                {/* Game Guide Modal Trigger */}
                <div className="space-y-3">
                    <button
                        onClick={() => setShowRules(true)}
                        className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors group shadow-sm">
                        <span className="text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-2">
                            <HelpCircle size={18} /> How to Play
                        </span>
                        <ChevronRight className="text-indigo-400 group-hover:text-indigo-600 transition-colors" size={20} />
                    </button>

                    {/* Embedded Expansion (instead of true modal for simplicity to avoid full screen z-index wars on tabs) */}
                    {showRules && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-sm text-slate-700 space-y-4 shadow-sm relative animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => setShowRules(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1 border border-slate-100"><X size={16} /></button>
                            <h3 className="font-black text-indigo-600 tracking-widest uppercase mb-1 border-b border-slate-100 pb-2">Rulebook</h3>
                            <p className="flex items-start gap-3">
                                <span className="text-amber-500 mt-0.5"><Star size={16} /></span>
                                <span className="leading-relaxed"><strong className="text-slate-900">Goal:</strong> Be the first to move all your pieces to the center home zone. The game continues until only one player remains!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-indigo-500 mt-0.5"><Gamepad2 size={16} /></span>
                                <span className="leading-relaxed"><strong className="text-slate-900">Rolls:</strong> Roll the dice to move. Rolling a <strong className="text-indigo-600">4</strong> or an <strong className="text-indigo-600">8</strong> grants you an extra bonus roll!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-rose-500 mt-0.5"><X size={16} /></span>
                                <span className="leading-relaxed"><strong className="text-slate-900">Captures:</strong> Landing exactly on an opponent's piece sends it back to base. You also earn a bonus roll!</span>
                            </p>
                            <p className="flex items-start gap-3">
                                <span className="text-emerald-500 mt-0.5"><Monitor size={16} /></span>
                                <span className="leading-relaxed"><strong className="text-slate-900">Safe Zones:</strong> Crossed cells are Safe Zones. Pieces cannot be captured while resting on these squares.</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Display Settings */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Display</p>
                    <label className="flex items-center justify-between p-3 min-h-[50px] bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Full Screen</span>
                        <input type="checkbox" checked={isFullscreen} onChange={(e) => {
                            const wantFs = e.target.checked;
                            localStorage.setItem('auto_fs', wantFs ? 'true' : 'false');
                            if (wantFs) {
                                document.documentElement.requestFullscreen().catch(() => { });
                            } else if (document.fullscreenElement) {
                                document.exitFullscreen().catch(() => { });
                            }
                        }} className="w-4 h-4 text-indigo-600 rounded bg-slate-200 border-slate-300 focus:ring-indigo-500" />
                    </label>
                </div>

                {/* Game & device Settings Container */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Game Rules</p>
                    <label className="flex items-center justify-between p-3 min-h-[50px] bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Roll on Capture</span>
                        <input type="checkbox" checked={bonusOnCapture} onChange={(e) => dispatch({ type: 'game/setSettings', payload: { bonusOnCapture: e.target.checked } })} className="accent-indigo-500 w-5 h-5 cursor-pointer scale-110" />
                    </label>
                    <label className="flex items-center justify-between p-3 min-h-[50px] bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Roll on Home</span>
                        <input type="checkbox" checked={bonusOnEntry} onChange={(e) => dispatch({ type: 'game/setSettings', payload: { bonusOnEntry: e.target.checked } })} className="accent-indigo-500 w-5 h-5 cursor-pointer scale-110" />
                    </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Device Settings</p>
                    <label className="flex items-center justify-between p-3 min-h-[50px] bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Sound Effects</span>
                        <input type="checkbox" defaultChecked onChange={(e) => dispatch({ type: 'game/addLog', payload: `Sound ${e.target.checked ? 'Enabled' : 'Disabled'}` })} className="accent-indigo-500 w-5 h-5 cursor-pointer border-none scale-110" />
                    </label>
                    <label className="flex items-center justify-between p-3 min-h-[50px] bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Haptic Vibration</span>
                        <input type="checkbox" defaultChecked onChange={(e) => dispatch({ type: 'game/addLog', payload: `Vibration ${e.target.checked ? 'Enabled' : 'Disabled'}` })} className="accent-indigo-500 w-5 h-5 cursor-pointer border-none scale-110" />
                    </label>
                </div>

                {/* Account Actions */}
                <div className="pt-6 border-t border-slate-100">
                    <button onClick={handleLogout} className="w-full py-4 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl font-black uppercase tracking-widest text-sm transition flex justify-center items-center gap-2 shadow-sm">
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
            <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-slate-200 z-50 px-2 sm:px-6 flex justify-around items-center pb-2" style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.05)' }}>
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
                            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>

                            <div className="relative">
                                <Icon size={24} className={isActive ? 'drop-shadow-[0_2px_4px_rgba(79,70,229,0.3)]' : ''} />
                                {tab.badge && (
                                    <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shadow-sm">
                                        {tab.badge}
                                    </div>
                                )}
                            </div>

                            <span className="text-[10px] font-bold tracking-wider">{tab.label}</span>
                            {isActive && <div className="absolute -top-px w-10 h-1 bg-indigo-500 rounded-b-full shadow-sm" />}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-50 overflow-hidden flex flex-col font-sans select-none text-slate-800 pb-[72px]">
            {/* Cinematic Background */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-multiply transition-all duration-1000 z-0 pointer-events-none"
                style={{
                    background: lobbyMode === 'ONLINE' ? 'radial-gradient(ellipse at top right, rgba(99,102,241,0.5) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(16,185,129,0.3) 0%, transparent 60%)' :
                        'radial-gradient(ellipse at center, rgba(99,102,241,0.3) 0%, transparent 70%)'
                }} />

            {/* Grid Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22none%22 stroke=%22%23000000%22 stroke-width=%221%22/></svg>')] z-0" />

            {/* Active Tab View */}
            <div className={`relative z-10 flex-1 flex flex-col ${activeTab !== 'rank' ? 'overflow-y-auto' : ''} w-full max-w-md mx-auto`}>
                {activeTab === 'home' && renderHomeTab()}
                {activeTab === 'friends' && renderFriendsTab()}
                {activeTab === 'settings' && renderSettingsTab()}
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'rank' && <LeaderboardScreen isEmbedded={true} />}
            </div>

            {/* Bottom Dock Navigation */}
            {renderBottomDock()}
        </div>
    );
};

export default UnifiedLobby;
