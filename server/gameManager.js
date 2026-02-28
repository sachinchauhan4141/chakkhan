class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomCode -> roomData
        this.matchmakingQueue = [];
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    addToQueue(socket, userData) {
        this.matchmakingQueue.push({ socket, userData });
        console.log(`${userData?.username || socket.id} joined matchmaking`);

        // For Chakkhan Changa, we need 4 players for a full match
        if (this.matchmakingQueue.length >= 4) {
            const players = this.matchmakingQueue.splice(0, 4);
            const roomCode = this.generateRoomCode();

            this.rooms.set(roomCode, {
                isPrivate: false,
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
                    players: this.rooms.get(roomCode).players
                });
            });
            console.log(`Match created: ${roomCode}`);
        } else {
            // Broadcast queue status to those waiting
            this.matchmakingQueue.forEach(p => {
                p.socket.emit('queue_update', { count: this.matchmakingQueue.length, required: 4 });
            });
        }
    }

    createPrivateRoom(socket, userData) {
        const roomCode = this.generateRoomCode();
        this.rooms.set(roomCode, {
            isPrivate: true,
            host: socket.id,
            players: [{
                id: socket.id,
                username: userData?.username || 'Host',
                role: 'p1'
            }]
        });
        socket.join(roomCode);
        console.log(`Private room created: ${roomCode}`);
        socket.emit('room_created', { roomCode, players: this.rooms.get(roomCode).players });
    }

    joinPrivateRoom(socket, roomCode, userData) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            socket.emit('error_message', { message: 'Room not found' });
            return;
        }
        if (room.players.length >= 4) {
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

        // Notify everyone in room about the updated player list
        this.io.to(roomCode).emit('lobby_update', { players: room.players });

        // Auto-start when 4 players have joined
        if (room.players.length === 4) {
            room.players.forEach(p => {
                // Emit game_start to each player individually so they get their own role
                this.io.to(p.id).emit('game_start', { role: p.role, players: room.players });
            });
            console.log(`Private game auto-started: ${roomCode}`);
        }
    }

    handleGameAction(socket, data) {
        // Basic broadcasting of Redux actions across the socket room
        const { roomCode, action } = data;
        if (!roomCode || !action) return;

        // Broadcast to everyone else in the room
        socket.to(roomCode).emit('sync_action', action);
    }

    handleDisconnect(socket) {
        // Remove from queue
        this.matchmakingQueue = this.matchmakingQueue.filter(p => p.socket.id !== socket.id);

        // Alert others in the queue
        this.matchmakingQueue.forEach(p => {
            p.socket.emit('queue_update', { count: this.matchmakingQueue.length, required: 4 });
        });

        // Remove from rooms
        for (const [roomCode, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);

                // Re-assign roles or end game if it was active
                // For now, let's just emit player left and lobby update
                this.io.to(roomCode).emit('player_left', { message: 'A player disconnected.' });
                this.io.to(roomCode).emit('lobby_update', { players: room.players });

                if (room.players.length === 0) {
                    this.rooms.delete(roomCode);
                }
                break;
            }
        }
    }
}

module.exports = GameManager;
