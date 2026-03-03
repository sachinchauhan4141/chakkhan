const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const GameManager = require('./gameManager');
const User = require('./models/User');
const { JWT_SECRET } = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const gameManager = new GameManager(io);

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chakkhan_changa';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: gameManager.rooms.size });
});

// Socket.io — authenticate via JWT handshake
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            const user = await User.findById(decoded.userId);
            if (user) {
                socket.username = user.username;
                socket.uniqueTag = user.uniqueTag;
            }
        } catch (err) {
            // Token invalid — allow guest connection
        }
    }
    next(); // Allow connection even without auth (for guests)
});

io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.id}${socket.username ? ` (${socket.username})` : ''}`);

    // Set online status
    if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() });
        // Notify friends
        const user = await User.findById(socket.userId).populate('friends', '_id');
        if (user?.friends) {
            user.friends.forEach(f => {
                io.to(`user_${f._id}`).emit('friend_status', { userId: socket.userId, isOnline: true });
            });
        }
        socket.join(`user_${socket.userId}`);
    }

    io.emit('active_players_count', io.engine.clientsCount);

    socket.on('join_matchmaking', (userData) => {
        gameManager.addToQueue(socket, { ...userData, userId: socket.userId });
    });

    socket.on('leave_queue', () => {
        gameManager.removeFromQueue(socket);
    });

    socket.on('create_private_room', (userData) => {
        gameManager.createPrivateRoom(socket, { ...userData, userId: socket.userId });
    });

    socket.on('join_private_room', ({ roomCode, userData }) => {
        gameManager.joinPrivateRoom(socket, roomCode, { ...userData, userId: socket.userId });
    });

    socket.on('game_action', (data) => {
        gameManager.handleGameAction(socket, data);
    });

    socket.on('start_with_bots', (data) => {
        gameManager.startWithBots(socket, data.roomCode);
    });

    // Friend invite to room
    socket.on('invite_friend', ({ friendId, roomCode }) => {
        io.to(`user_${friendId}`).emit('game_invite', {
            from: socket.username || 'Player',
            fromTag: socket.uniqueTag,
            roomCode,
        });
    });

    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.userId) {
            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            const user = await User.findById(socket.userId).populate('friends', '_id');
            if (user?.friends) {
                user.friends.forEach(f => {
                    io.to(`user_${f._id}`).emit('friend_status', { userId: socket.userId, isOnline: false });
                });
            }
        }
        gameManager.handleDisconnect(socket);
        io.emit('active_players_count', io.engine.clientsCount);
    });
});

// Serve static frontend in production
const frontendPath = path.join(__dirname, '../client/dist');
app.use(express.static(frontendPath));
app.use((req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
