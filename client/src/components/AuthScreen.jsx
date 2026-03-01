/**
 * AuthScreen — Login / Register form with username availability checking
 * and suggestions when a name is taken.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, loginUser, clearError } from '../store/authSlice';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

const AuthScreen = () => {
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector(s => s.auth);
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false

    // Debounced username availability check (register mode only)
    useEffect(() => {
        if (mode !== 'register' || username.length < 3) {
            setUsernameAvailable(null);
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/api/auth/check-username?q=${encodeURIComponent(username)}`);
                const data = await res.json();
                setUsernameAvailable(data.available);
                setSuggestions(data.suggestions || []);
            } catch {
                setUsernameAvailable(null);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [username, mode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'register' && password !== confirmPw) return;
        dispatch(mode === 'login'
            ? loginUser({ username, password })
            : registerUser({ username, password })
        );
    };

    const switchMode = () => {
        setMode(m => m === 'login' ? 'register' : 'login');
        dispatch(clearError());
        setSuggestions([]);
        setUsernameAvailable(null);
    };

    // Pick a suggestion → fills the username field
    const pickSuggestion = (name) => {
        setUsername(name);
        setSuggestions([]);
        setUsernameAvailable(true);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center px-4 select-none overflow-hidden"
            style={{ height: '100dvh' }}>
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

            {/* Title */}
            <h1 className="z-10 cinzel-font font-extrabold tracking-widest text-amber-400 mb-1"
                style={{ fontSize: 'clamp(2rem,8vw,3.5rem)', textShadow: '0 0 40px rgba(245,158,11,0.35)' }}>
                CHAKKHAN
            </h1>
            <p className="z-10 text-amber-600 tracking-[0.5em] text-[10px] font-semibold uppercase mb-8">Changa</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="z-10 w-full max-w-xs flex flex-col gap-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest text-center mb-1">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </p>

                {/* Username field */}
                <div className="relative">
                    <input type="text" placeholder="Username" value={username}
                        onChange={e => setUsername(e.target.value)}
                        maxLength={16} autoFocus
                        className={`w-full bg-slate-800 border text-slate-100 placeholder-slate-500
                            text-center text-sm font-semibold rounded-full px-5 py-3 outline-none transition-colors
                            ${mode === 'register' && usernameAvailable === true ? 'border-emerald-500' :
                                mode === 'register' && usernameAvailable === false ? 'border-red-500' : 'border-slate-700'}
                            focus:border-amber-500`} />
                    {/* Availability indicator */}
                    {mode === 'register' && username.length >= 3 && usernameAvailable !== null && (
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${usernameAvailable ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                            {usernameAvailable ? '✓' : '✗'}
                        </span>
                    )}
                </div>

                {/* Username suggestions */}
                {mode === 'register' && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                        <span className="w-full text-center text-[9px] text-slate-500 uppercase tracking-widest">Try these</span>
                        {suggestions.map(s => (
                            <button key={s} type="button" onClick={() => pickSuggestion(s)}
                                className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-full text-xs text-amber-400 font-semibold hover:border-amber-500 hover:bg-amber-500/10 transition-colors">
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <input type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500
                        text-center text-sm font-semibold rounded-full px-5 py-3 outline-none focus:border-amber-500 transition-colors" />

                {mode === 'register' && (
                    <input type="password" placeholder="Confirm Password" value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        className={`w-full bg-slate-800 border text-slate-100 placeholder-slate-500
                            text-center text-sm font-semibold rounded-full px-5 py-3 outline-none focus:border-amber-500 transition-colors
                            ${confirmPw && password !== confirmPw ? 'border-red-500' : 'border-slate-700'}`} />
                )}

                {/* Error display (also handles suggestions from 409) */}
                {error && (
                    <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-800/30 rounded-xl px-3 py-2">{error}</p>
                )}

                <button type="submit"
                    disabled={isLoading || !username.trim() || !password || (mode === 'register' && password !== confirmPw)}
                    className="w-full py-3.5 rounded-2xl font-black text-slate-900 text-sm tracking-wide uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #b45309' }}>
                    {isLoading ? '...' : mode === 'login' ? 'Login' : 'Register'}
                </button>

                <button type="button" onClick={switchMode}
                    className="text-slate-500 hover:text-slate-300 text-xs text-center py-1 transition-colors">
                    {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
                </button>
            </form>
        </div>
    );
};

export default AuthScreen;
