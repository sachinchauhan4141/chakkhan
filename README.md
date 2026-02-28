# Chakkhan Changa (MERN Stack Multiplayer)

An immersive, premium indie-game adaptation of the ancient board game Chakkhan Changa, complete with 3D physics, offline Auto-Bots, and real-time online Multiplayer capabilities via Socket.io.

## Features
- **Cinematic UI/UX**: Ancient mahogany woods, gold trim, and glowing parchment create an immersive experience.
- **Advanced 3D Stick Physics**: Casting sticks calculates rotational 3D tumbled physics for satisfying interaction.
- **Offline Bots**: Fully autonomous offline bots capable of evaluating the best strategic moves.
- **MERN Stack Network Play**: Complete real-time multiplayer using Socket.IO, Express, and MongoDB. Includes Matchmaking, Private Rooms, and player tracking.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)

### Installation
1. Clone the repository
2. Install dependencies for both the frontend and backend:
   ```bash
   npm run build
   ```
3. Create a `.env` file in the `server/` directory and configure your MongoDB connection (see `server/.env.example`).

### Running Locally
To run the full stack locally for development, open two terminal windows:

**Terminal 1 (Backend - Port 3001)**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend - Port 5173)**
```bash
npm run dev:frontend
```

### Building for Production
To build the static React bundle and run the Express server to serve both the API and Frontend automatically:
```bash
npm run build
npm start
```
