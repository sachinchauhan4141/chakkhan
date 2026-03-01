class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomCode -> roomData
        this.matchmakingQueues = { 2: [], 3: [], 4: [] }; // separate queues per player count
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    addToQueue(socket, userData) {
        const playerCount = userData?.playerCount || 4;
        const queue = this.matchmakingQueues[playerCount] || this.matchmakingQueues[4];
        queue.push({ socket, userData });
        console.log(`${userData?.username || socket.id} joined matchmaking (${playerCount}p)`);

        if (queue.length >= playerCount) {
            const players = queue.splice(0, playerCount);
            const roomCode = this.generateRoomCode();

            this.rooms.set(roomCode, {
                isPrivate: false,
                playerCount,
                players: players.map((p, index) => ({
                    id: p.socket.id,
                    username: p.userData?.username || `Player${index + 1}`,
                    role: `p${index + 1}`
                }))
            });

            players.forEach((p, index) => {
                p.socket.join(roomCode);
                p.socket.emit('match_found', {
                    roomCode,
                    role: `p${index + 1}`,
                    players: this.rooms.get(roomCode).players,
                    playerCount
                });
            });
            console.log(`Match created (${playerCount}p): ${roomCode}`);
        } else {
            queue.forEach(p => {
                p.socket.emit('queue_update', { count: queue.length, required: playerCount });
            });
        }
    }

    createPrivateRoom(socket, userData) {
        const playerCount = userData?.playerCount || 4;
        const roomCode = this.generateRoomCode();
        this.rooms.set(roomCode, {
            isPrivate: true,
            host: socket.id,
            playerCount,
            players: [{
                id: socket.id,
                username: userData?.username || 'Host',
                role: 'p1'
            }]
        });
        socket.join(roomCode);
        console.log(`Private room created (${playerCount}p): ${roomCode}`);
        socket.emit('room_created', { roomCode, players: this.rooms.get(roomCode).players });
    }

    joinPrivateRoom(socket, roomCode, userData) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            socket.emit('error_message', { message: 'Room not found' });
            return;
        }
        const pc = room.playerCount || 4;
        if (room.players.length >= pc) {
            socket.emit('error_message', { message: 'Room is full' });
            return;
        }

        const nextRoleIndex = room.players.length + 1;
        const newPlayer = {
            id: socket.id,
            username: userData?.username || `Guest${nextRoleIndex}`,
            role: `p${nextRoleIndex}`
        };

        room.players.push(newPlayer);
        socket.join(roomCode);

        this.io.to(roomCode).emit('lobby_update', { players: room.players });

        // Auto-start when playerCount humans have joined
        if (room.players.length === pc) {
            room.players.forEach(p => {
                this.io.to(p.id).emit('game_start', { role: p.role, players: room.players });
            });
            console.log(`Private game auto-started (${pc}p): ${roomCode}`);
        }
    }

    startWithBots(socket, roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        if (room.host !== socket.id) return; // only host can start with bots

        const pc = room.playerCount || 4;
        const existingPlayers = room.players.length;
        const allSlots = ['p1', 'p2', 'p3', 'p4'].slice(0, pc);
        const takenRoles = new Set(room.players.map(p => p.role));
        const botPlayers = [];

        // Fill remaining slots with bot placeholders
        allSlots.forEach(role => {
            if (!takenRoles.has(role)) {
                room.players.push({
                    id: `bot-${role}`,
                    username: `Bot (${role === 'p1' ? 'Red' : role === 'p2' ? 'Blue' : role === 'p3' ? 'Yellow' : 'Green'})`,
                    role,
                    isBot: true
                });
                botPlayers.push(role);
            }
        });

        // Notify everyone and start game
        room.players.forEach(p => {
            if (!p.isBot) {
                this.io.to(p.id).emit('game_start', {
                    role: p.role,
                    players: room.players,
                    botPlayers
                });
            }
        });
        console.log(`Game started with bots (${botPlayers.length} bots): ${roomCode}`);
    }

    handleGameAction(socket, data) {
        const { roomCode, action } = data;
        if (!roomCode || !action) return;
        socket.to(roomCode).emit('sync_action', action);
    }

    handleDisconnect(socket) {
        // Remove from all queues
        for (const key of Object.keys(this.matchmakingQueues)) {
            const queue = this.matchmakingQueues[key];
            const before = queue.length;
            this.matchmakingQueues[key] = queue.filter(p => p.socket.id !== socket.id);
            if (this.matchmakingQueues[key].length !== before) {
                this.matchmakingQueues[key].forEach(p => {
                    p.socket.emit('queue_update', { count: this.matchmakingQueues[key].length, required: parseInt(key) });
                });
            }
        }

        // Remove from rooms
        for (const [roomCode, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                this.io.to(roomCode).emit('player_left', { message: 'A player disconnected.' });
                this.io.to(roomCode).emit('lobby_update', { players: room.players });

                if (room.players.filter(p => !p.isBot).length === 0) {
                    this.rooms.delete(roomCode);
                }
                break;
            }
        }
    }
}

module.exports = GameManager;
