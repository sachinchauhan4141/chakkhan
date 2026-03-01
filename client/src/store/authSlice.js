import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = import.meta.env.PROD ? '' : 'http://localhost:3001';

export const registerUser = createAsyncThunk('auth/register', async ({ username, password }, { rejectWithValue }) => {
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.error);
    localStorage.setItem('token', data.token);
    return data;
});

export const loginUser = createAsyncThunk('auth/login', async ({ username, password }, { rejectWithValue }) => {
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.error);
    localStorage.setItem('token', data.token);
    return data;
});

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) return rejectWithValue('No token');
    const res = await fetch(`${API}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) { localStorage.removeItem('token'); return rejectWithValue(data.error); }
    return { token, user: data.user };
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token') || null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
    },
    reducers: {
        logout: (state) => {
            localStorage.removeItem('token');
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
        },
        clearError: (state) => { state.error = null; },
        updateUser: (state, action) => { state.user = { ...state.user, ...action.payload }; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.pending, s => { s.isLoading = true; s.error = null; })
            .addCase(registerUser.fulfilled, (s, a) => { s.isLoading = false; s.token = a.payload.token; s.user = a.payload.user; s.isAuthenticated = true; })
            .addCase(registerUser.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })
            .addCase(loginUser.pending, s => { s.isLoading = true; s.error = null; })
            .addCase(loginUser.fulfilled, (s, a) => { s.isLoading = false; s.token = a.payload.token; s.user = a.payload.user; s.isAuthenticated = true; })
            .addCase(loginUser.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })
            .addCase(loadUser.pending, s => { s.isLoading = true; })
            .addCase(loadUser.fulfilled, (s, a) => { s.isLoading = false; s.token = a.payload.token; s.user = a.payload.user; s.isAuthenticated = true; })
            .addCase(loadUser.rejected, s => { s.isLoading = false; s.isAuthenticated = false; });
    }
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
