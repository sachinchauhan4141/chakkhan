import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Search, UserPlus, Check, X, Circle } from 'lucide-react';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const FriendsPanel = ({ onBack, onInvite }) => {
    const { token, user } = useSelector(s => s.auth);
    const [tab, setTab] = useState('friends'); // 'friends' | 'requests' | 'search'
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [statusMsg, setStatusMsg] = useState('');

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const loadFriends = () => {
        fetch(`${API}/api/friends/list`, { headers })
            .then(r => r.json())
            .then(d => { setFriends(d.friends || []); setRequests(d.requests || []); })
            .catch(() => { });
    };

    useEffect(() => { loadFriends(); }, []);

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

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden select-none" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-200"><ArrowLeft size={20} /></button>
                <h2 className="cinzel-font text-amber-400 font-bold text-sm tracking-widest uppercase">Friends</h2>
                <div className="w-5" />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                {[
                    { key: 'friends', label: 'Friends', count: friends.length },
                    { key: 'requests', label: 'Requests', count: requests.length },
                    { key: 'search', label: 'Search' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${tab === t.key ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500'
                            }`}>
                        {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                    </button>
                ))}
            </div>

            {/* Status message */}
            {statusMsg && (
                <div className="mx-4 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs text-center">{statusMsg}</div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3">

                {/* Friends List */}
                {tab === 'friends' && (
                    friends.length === 0
                        ? <p className="text-slate-600 text-xs text-center py-8">No friends yet. Add some!</p>
                        : <div className="flex flex-col gap-1.5">
                            {friends.map(f => (
                                <div key={f._id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {f.username?.[0]?.toUpperCase()}
                                            </div>
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${f.isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-200 font-semibold">{f.username}</p>
                                            <p className="text-[9px] text-slate-500 font-mono">{f.uniqueTag}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-amber-400 font-bold">{f.mmr} MMR</span>
                                        {onInvite && f.isOnline && (
                                            <button onClick={() => onInvite(f._id)}
                                                className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 text-[9px] font-bold uppercase hover:bg-amber-500/30 transition-colors">
                                                Invite
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                )}

                {/* Requests */}
                {tab === 'requests' && (
                    requests.length === 0
                        ? <p className="text-slate-600 text-xs text-center py-8">No pending requests</p>
                        : <div className="flex flex-col gap-1.5">
                            {requests.map(r => (
                                <div key={r._id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                                    <div>
                                        <p className="text-sm text-slate-200 font-semibold">{r.username}</p>
                                        <p className="text-[9px] text-slate-500 font-mono">{r.uniqueTag}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => acceptRequest(r._id)}
                                            className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center hover:bg-emerald-500/30">
                                            <Check size={14} className="text-emerald-400" />
                                        </button>
                                        <button onClick={() => declineRequest(r._id)}
                                            className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30">
                                            <X size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                )}

                {/* Search */}
                {tab === 'search' && (
                    <div>
                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="Search by name or tag…" value={searchQuery}
                                onChange={e => searchUsers(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500
                                    text-sm rounded-full pl-9 pr-4 py-2.5 outline-none focus:border-amber-500 transition-colors" />
                        </div>

                        {/* Your tag for sharing */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 mb-3 text-center">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Your Tag</p>
                            <button onClick={() => navigator.clipboard?.writeText(user?.uniqueTag)}
                                className="text-amber-400 font-mono font-bold text-sm hover:text-amber-300 transition-colors"
                                title="Tap to copy">{user?.uniqueTag}</button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {searchResults.map(u => (
                                <div key={u._id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                                    <div>
                                        <p className="text-sm text-slate-200 font-semibold">{u.username}</p>
                                        <p className="text-[9px] text-slate-500 font-mono">{u.uniqueTag}</p>
                                    </div>
                                    <button onClick={() => sendRequest(u.uniqueTag)}
                                        className="p-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-colors">
                                        <UserPlus size={14} className="text-amber-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsPanel;
