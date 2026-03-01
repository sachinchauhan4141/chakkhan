const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

// Send friend request
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { targetTag } = req.body; // e.g. "Sachin#4821"
        if (!targetTag) return res.status(400).json({ error: 'Target tag required' });

        const target = await User.findOne({ uniqueTag: targetTag });
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target._id.equals(req.userId)) return res.status(400).json({ error: 'Cannot add yourself' });

        const me = await User.findById(req.userId);
        if (me.friends.includes(target._id)) return res.status(400).json({ error: 'Already friends' });
        if (me.sentRequests.includes(target._id)) return res.status(400).json({ error: 'Request already sent' });

        // If they already sent us a request, auto-accept
        if (me.friendRequests.includes(target._id)) {
            me.friends.push(target._id);
            target.friends.push(me._id);
            me.friendRequests.pull(target._id);
            target.sentRequests.pull(me._id);
            await me.save();
            await target.save();
            return res.json({ message: 'Friend added!', status: 'accepted' });
        }

        me.sentRequests.push(target._id);
        target.friendRequests.push(me._id);
        await me.save();
        await target.save();
        res.json({ message: 'Request sent', status: 'pending' });
    } catch (err) {
        console.error('Friend send error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Accept friend request
router.post('/accept', authMiddleware, async (req, res) => {
    try {
        const { fromId } = req.body;
        const me = await User.findById(req.userId);
        const from = await User.findById(fromId);
        if (!from) return res.status(404).json({ error: 'User not found' });

        if (!me.friendRequests.includes(fromId)) return res.status(400).json({ error: 'No request from this user' });

        me.friends.push(fromId);
        from.friends.push(req.userId);
        me.friendRequests.pull(fromId);
        from.sentRequests.pull(req.userId);
        await me.save();
        await from.save();
        res.json({ message: 'Friend added!' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Decline friend request
router.post('/decline', authMiddleware, async (req, res) => {
    try {
        const { fromId } = req.body;
        const me = await User.findById(req.userId);
        me.friendRequests.pull(fromId);
        await me.save();
        const from = await User.findById(fromId);
        if (from) { from.sentRequests.pull(req.userId); await from.save(); }
        res.json({ message: 'Declined' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get friends list with online status
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const me = await User.findById(req.userId)
            .populate('friends', 'username uniqueTag mmr wins isOnline lastSeen')
            .populate('friendRequests', 'username uniqueTag mmr');
        res.json({
            friends: me.friends,
            requests: me.friendRequests,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Search users
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const q = req.query.q || '';
        if (q.length < 2) return res.json({ users: [] });
        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { uniqueTag: { $regex: q, $options: 'i' } },
            ]
        }).select('username uniqueTag mmr wins isOnline').limit(20);
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
