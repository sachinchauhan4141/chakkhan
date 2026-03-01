const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

// Top 100 leaderboard by MMR
router.get('/', async (req, res) => {
    try {
        const players = await User.find({ gamesPlayed: { $gte: 1 } })
            .sort({ mmr: -1 })
            .limit(100)
            .select('username uniqueTag mmr wins losses gamesPlayed');

        const leaderboard = players.map((p, i) => ({
            rank: i + 1,
            username: p.username,
            uniqueTag: p.uniqueTag,
            mmr: p.mmr,
            wins: p.wins,
            losses: p.losses,
            gamesPlayed: p.gamesPlayed,
            winRate: p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0,
        }));

        res.json({ leaderboard });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Player profile
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -friendRequests -sentRequests');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Calculate rank
        const higherCount = await User.countDocuments({ mmr: { $gt: user.mmr }, gamesPlayed: { $gte: 1 } });
        const rank = higherCount + 1;

        res.json({
            profile: {
                ...user.toObject(),
                rank,
                winRate: user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0,
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update stats after game (called by gameManager)
router.post('/update-stats', authMiddleware, async (req, res) => {
    try {
        const { result, opponentName, captures } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isWin = result === 'win';
        const mmrChange = isWin ? 25 : -15;

        user.gamesPlayed += 1;
        if (isWin) user.wins += 1; else user.losses += 1;
        user.mmr = Math.max(0, user.mmr + mmrChange);
        if (captures) user.captures += captures;

        // Add to match history (keep last 20)
        user.matchHistory.unshift({
            opponent: opponentName || 'Unknown',
            result,
            mmrChange,
            date: new Date(),
        });
        if (user.matchHistory.length > 20) user.matchHistory = user.matchHistory.slice(0, 20);

        await user.save();
        res.json({ user: user.toSafeObject(), mmrChange });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
