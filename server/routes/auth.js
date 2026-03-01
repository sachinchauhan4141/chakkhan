const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../authMiddleware');

const router = express.Router();

const createToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

/**
 * Generate username suggestions when the requested name is taken.
 * Appends random suffixes to make unique alternatives.
 */
const generateSuggestions = async (username) => {
    const suffixes = ['_gg', '_pro', '_x', 'YT', '_01', '_op', '_king', '_ace'];
    const suggestions = [];
    for (const suffix of suffixes) {
        const candidate = (username + suffix).slice(0, 16);
        const exists = await User.findOne({ username: { $regex: new RegExp(`^${candidate}$`, 'i') } });
        if (!exists) suggestions.push(candidate);
        if (suggestions.length >= 3) break;
    }
    // Fallback: add random numbers
    while (suggestions.length < 3) {
        const candidate = (username + Math.floor(Math.random() * 999)).slice(0, 16);
        suggestions.push(candidate);
    }
    return suggestions;
};

// ──────────────────────────────────────────────────────────────
// POST /api/auth/register — Create new account
// ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password)
            return res.status(400).json({ error: 'Username and password required' });
        if (username.length < 3 || username.length > 16)
            return res.status(400).json({ error: 'Username must be 3–16 characters' });
        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' });

        // Check uniqueness (case-insensitive)
        const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (existing) {
            const suggestions = await generateSuggestions(username);
            return res.status(409).json({
                error: 'Username is already taken',
                suggestions,
            });
        }

        const user = new User({ username, password });
        await user.save();

        const token = createToken(user._id);
        res.status(201).json({ token, user: user.toSafeObject() });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/login — Authenticate existing user
// ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Username and password required' });

        const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await user.comparePassword(password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = createToken(user._id);
        res.json({ token, user: user.toSafeObject() });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ──────────────────────────────────────────────────────────────
// GET /api/auth/me — Get current user (protected)
// ──────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: user.toSafeObject() });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ──────────────────────────────────────────────────────────────
// GET /api/auth/check-username — Check availability + suggestions
// ──────────────────────────────────────────────────────────────
router.get('/check-username', async (req, res) => {
    try {
        const username = req.query.q || '';
        if (username.length < 3) return res.json({ available: false, suggestions: [] });

        const exists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!exists) return res.json({ available: true, suggestions: [] });

        const suggestions = await generateSuggestions(username);
        res.json({ available: false, suggestions });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
