import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect(token) {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.socket = io(SOCKET_URL, {
            auth: { token: token || undefined },
        });

        this.socket.on('connect', () => {
            console.log('Connected to server via WebSocket');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinMatchmaking(userData) {
        if (this.socket) this.socket.emit('join_matchmaking', userData);
    }

    createPrivateRoom(userData) {
        if (this.socket) this.socket.emit('create_private_room', userData);
    }

    joinPrivateRoom(roomCode, userData) {
        if (this.socket) this.socket.emit('join_private_room', { roomCode, userData });
    }

    sendGameAction(roomCode, action) {
        if (this.socket) this.socket.emit('game_action', { roomCode, action });
    }

    startWithBots(roomCode) {
        if (this.socket) this.socket.emit('start_with_bots', { roomCode });
    }

    inviteFriend(friendId, roomCode) {
        if (this.socket) this.socket.emit('invite_friend', { friendId, roomCode });
    }

    on(eventName, callback) {
        if (this.socket) this.socket.on(eventName, callback);
    }

    off(eventName, callback) {
        if (this.socket) this.socket.off(eventName, callback);
    }
}

const socketService = new SocketService();
export default socketService;
