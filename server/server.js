require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const GameManager = require('./gameManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow connections from Vite frontend
        methods: ['GET', 'POST']
    }
});

const gameManager = new GameManager(io);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chakkhan_changa';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Basic API route for health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: gameManager.rooms.size });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Track global active players connecting to the server
    io.emit('active_players_count', io.engine.clientsCount);

    socket.on('join_matchmaking', (userData) => {
        gameManager.addToQueue(socket, userData);
    });

    socket.on('create_private_room', (userData) => {
        gameManager.createPrivateRoom(socket, userData);
    });

    socket.on('join_private_room', ({ roomCode, userData }) => {
        gameManager.joinPrivateRoom(socket, roomCode, userData);
    });

    socket.on('game_action', (data) => {
        gameManager.handleGameAction(socket, data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        gameManager.handleDisconnect(socket);
        io.emit('active_players_count', io.engine.clientsCount);
    });
});

// Serve static frontend files in production
const frontendPath = path.join(__dirname, '../client/dist');
app.use(express.static(frontendPath));

app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
