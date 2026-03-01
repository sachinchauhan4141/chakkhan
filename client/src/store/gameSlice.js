/**
 * gameSlice.js — Redux slice for game state management
 *
 * This is the central state store for the Chakkhan Changa game.
 * Board constants are in ./boardConstants.js
 * Game logic helpers are in ./gameHelpers.js
 */
import { createSlice } from '@reduxjs/toolkit';
import {
    PLAYERS, PLAYER_NAMES, PLAYER_PATHS, SAFE_CELLS, FRONT_OF_HOUSE
} from './boardConstants';
import {
    getNextTurnIdx, getCurrentPlayer, calculateAllValidMoves
} from './gameHelpers';

// Re-export for consumers that imported from here previously
export { PLAYER_PATHS, SAFE_CELLS as EXPORTED_SAFE_CELLS, FRONT_OF_HOUSE as EXPORTED_FRONT_OF_HOUSE } from './boardConstants';

// ─── Initial State ───────────────────────────────────────────────────────────
const initialState = {
    // Piece positions: -1 = in yard, 0-23 = on board path, 24 = center (won)
    pieces: {
        p1: [-1, -1, -1, -1],
        p2: [-1, -1, -1, -1],
        p3: [-1, -1, -1, -1],
        p4: [-1, -1, -1, -1]
    },
    hasCaptured: { p1: false, p2: false, p3: false, p4: false },
    currentPlayerIdx: 0,
    availableMoves: [],        // Pending move values the player can use
    consecutiveHighRolls: 0,   // Track 3-in-a-row bust rule
    gameState: 'ROLLING',      // ROLLING | NORMAL_MOVING | EXTRA_MOVING | GAME_OVER
    logMessage: "Game Started! Red's Turn — Roll 4 or 8 to enter.",
    rollResult: null,          // { sticks: boolean[], value: number }
    validMoves: [],            // Computed valid moves for current player

    // Player configuration
    playerCount: 4,
    activePlayers: ['p1', 'p2', 'p3', 'p4'],
    botPlayers: [],

    // Pause / anti-cheat
    isPaused: false,
    pauseCount: 0,

    // Game settings
    boardTheme: 'light',
    bonusOnCapture: true,
    bonusOnEntry: true,

    currentTurnRolls: [], // Track sequence of rolls for the current turn
    finishedPlayers: [],  // Track players who have brought all pieces home

    // Multiplayer
    gameMode: 'MENU',         // MENU | BOTS | LOCAL | ONLINE | FRIENDS
    isOnline: false,
    roomCode: null,
    connectedPlayers: [],
    localPlayerRole: 'p1',
    localUsername: ''
};

// ─── Slice ───────────────────────────────────────────────────────────────────
export const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {

        // ── Roll the sticks ──────────────────────────────────────────────
        rollSticks: (state, action) => {
            if (!['ROLLING', 'EXTRA_MOVING'].includes(state.gameState)) return;

            let flatsUp = 0, sticks = [], moveValue = 0;

            // Use provided sticks (online sync) or generate random
            if (action?.payload?.sticks) {
                sticks = action.payload.sticks;
                flatsUp = sticks.filter(s => s).length;
                moveValue = action.payload.value;
            } else {
                for (let i = 0; i < 4; i++) {
                    const isFlat = Math.random() < 0.5;
                    sticks.push(isFlat);
                    if (isFlat) flatsUp++;
                }
                // Scoring: 0 flat = 4(Chakkhan), 4 flat = 8(Changa), else count
                moveValue = [4, 1, 2, 3, 8][flatsUp];
            }

            const isHighRoll = (moveValue === 4 || moveValue === 8);
            state.rollResult = { sticks, value: moveValue };
            state.currentTurnRolls.push(moveValue);

            // Three consecutive high rolls → bust (forfeit turn)
            if (isHighRoll) {
                state.consecutiveHighRolls++;
                if (state.consecutiveHighRolls >= 3) {
                    state.logMessage = `🔥 Three ${moveValue}s in a row! Bust! Turn forfeited.`;
                    state.availableMoves = [];
                    state.consecutiveHighRolls = 0;
                    state.currentPlayerIdx = getNextTurnIdx(state.currentPlayerIdx, state.activePlayers, state.finishedPlayers);
                    state.gameState = 'ROLLING';
                    state.currentTurnRolls = [];
                    state.logMessage += ` ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                    state.validMoves = [];
                    return;
                }
                state.gameState = 'EXTRA_MOVING'; // bonus roll earned
            } else {
                state.gameState = 'NORMAL_MOVING';
                state.consecutiveHighRolls = 0;
            }

            state.availableMoves.push(moveValue);
            const playerName = PLAYER_NAMES[getCurrentPlayer(state)];
            state.logMessage = moveValue === 8 ? `✨ Changa! ${playerName} rolled 8!`
                : moveValue === 4 ? `🎯 Chakkhan! ${playerName} rolled 4!`
                    : `${playerName} rolled ${moveValue}`;

            state.validMoves = calculateAllValidMoves(state);

            // Auto-advance if no moves possible on a normal roll
            if (state.validMoves.length === 0 && state.gameState === 'NORMAL_MOVING') {
                state.logMessage += ' — No valid moves. Turn ends.';
                state.availableMoves = [];
                state.currentPlayerIdx = getNextTurnIdx(state.currentPlayerIdx, state.activePlayers, state.finishedPlayers);
                state.gameState = 'ROLLING';
                state.currentTurnRolls = [];
                state.logMessage += ` ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                state.validMoves = [];
            }
        },

        // ── Pass turn if no moves after bonus roll ───────────────────────
        passTurnIfNoMoves: (state) => {
            if (state.gameState !== 'EXTRA_MOVING') return;

            state.validMoves = calculateAllValidMoves(state);
            if (state.validMoves.length === 0) {
                state.logMessage = 'No valid moves. Turn ends.';
                state.availableMoves = [];
                state.currentPlayerIdx = getNextTurnIdx(state.currentPlayerIdx, state.activePlayers, state.finishedPlayers);
                state.gameState = 'ROLLING';
                state.currentTurnRolls = [];
                state.consecutiveHighRolls = 0;
            } else {
                state.gameState = 'NORMAL_MOVING';
            }
        },

        // ── Apply a piece move ───────────────────────────────────────────
        applyMove: (state, action) => {
            const { pieceIndex, moveValue } = action.payload;
            const player = getCurrentPlayer(state);

            const validMove = state.validMoves.find(
                m => m.pieceIndex === pieceIndex && m.moveValue === moveValue
            );
            if (!validMove) return;

            const targetPos = validMove.targetPos;
            state.pieces[player][pieceIndex] = targetPos;

            // Consume the move value
            const moveIdx = state.availableMoves.indexOf(moveValue);
            if (moveIdx > -1) state.availableMoves.splice(moveIdx, 1);

            // ── Check captures ───────────────────────────────────────────
            if (targetPos !== 24) {
                const globalCell = PLAYER_PATHS[player][targetPos];
                if (!SAFE_CELLS.includes(globalCell)) {
                    state.activePlayers.forEach(otherPlayer => {
                        if (otherPlayer === player) return;
                        state.pieces[otherPlayer].forEach((otherPos, otherIdx) => {
                            if (otherPos > -1 && otherPos < 24 &&
                                PLAYER_PATHS[otherPlayer][otherPos] === globalCell) {
                                // Skip if opponent is on their own front-of-house
                                if (globalCell === FRONT_OF_HOUSE[otherPlayer]) return;
                                state.pieces[otherPlayer][otherIdx] = -1;
                                state.hasCaptured[player] = true;
                                state.logMessage = `⚔️ ${PLAYER_NAMES[player]} captured ${PLAYER_NAMES[otherPlayer]}!`;
                                if (state.bonusOnCapture) {
                                    state.availableMoves.push('CAPTURE_BONUS');
                                    state.gameState = 'EXTRA_MOVING';
                                    state.logMessage += ' 🎁 Bonus roll!';
                                }
                            }
                        });
                    });
                }
            }

            // ── Check win condition ──────────────────────────────────────
            if (state.pieces[player].every(pos => pos === 24) && !state.finishedPlayers.includes(player)) {
                state.finishedPlayers.push(player);

                if (state.finishedPlayers.length >= state.activePlayers.length - 1) {
                    state.gameState = 'GAME_OVER';
                    state.logMessage = `🏆 Game Over! ${PLAYER_NAMES[state.finishedPlayers[0]]} wins!`;
                    state.validMoves = [];
                    return;
                } else {
                    const place = state.finishedPlayers.length;
                    const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : 'rd';
                    state.logMessage = `🎉 ${PLAYER_NAMES[player]} finished ${place}${suffix}!`;
                }
            }

            // Bonus for reaching center
            if (targetPos === 24 && state.bonusOnEntry) {
                state.availableMoves.push('CAPTURE_BONUS');
                state.gameState = 'EXTRA_MOVING';
                state.logMessage = (state.logMessage || '') + ' 🎁 Piece home — Bonus roll!';
            }

            // Recalculate remaining moves
            state.validMoves = calculateAllValidMoves(state);

            // ── Turn transition logic ────────────────────────────────────
            if (state.availableMoves.length === 0) {
                if (state.gameState === 'EXTRA_MOVING') {
                    // Used the move from a high roll → grant bonus roll (same player)
                    state.gameState = 'ROLLING';
                    state.logMessage = `🎁 ${PLAYER_NAMES[player]} rolled Chakkhan/Changa — roll again!`;
                    state.validMoves = [];
                } else {
                    // Normal turn end → next player
                    state.currentPlayerIdx = getNextTurnIdx(state.currentPlayerIdx, state.activePlayers, state.finishedPlayers);
                    state.gameState = 'ROLLING';
                    state.currentTurnRolls = [];
                    state.consecutiveHighRolls = 0;
                    state.logMessage = `${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                    state.validMoves = [];
                }
            } else if (state.availableMoves.length === 1 && state.availableMoves[0] === 'CAPTURE_BONUS') {
                // Only the bonus marker remains → clear it, let player roll
                state.availableMoves = [];
                state.gameState = 'EXTRA_MOVING';
            } else if (state.validMoves.length === 0) {
                // Moves remain but nothing is playable → end turn
                state.availableMoves = [];
                state.currentPlayerIdx = getNextTurnIdx(state.currentPlayerIdx, state.activePlayers, state.finishedPlayers);
                state.gameState = 'ROLLING';
                state.currentTurnRolls = [];
                state.consecutiveHighRolls = 0;
                state.logMessage = `No more valid moves. ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                state.validMoves = [];
            }
        },

        // ── Multiplayer state setter ─────────────────────────────────────
        setMultiplayerState: (state, action) => {
            const p = action.payload;
            if (p.isOnline !== undefined) state.isOnline = p.isOnline;
            if (p.roomCode !== undefined) state.roomCode = p.roomCode;
            if (p.connectedPlayers !== undefined) state.connectedPlayers = p.connectedPlayers;
            if (p.localPlayerRole !== undefined) state.localPlayerRole = p.localPlayerRole;
            if (p.gameMode !== undefined) state.gameMode = p.gameMode;
            if (p.localUsername !== undefined) state.localUsername = p.localUsername;
            if (p.playerCount !== undefined) state.playerCount = p.playerCount;
            if (p.activePlayers !== undefined) state.activePlayers = p.activePlayers;
            if (p.botPlayers !== undefined) state.botPlayers = p.botPlayers;
        },

        // ── Pause / resume ───────────────────────────────────────────────
        togglePause: (state) => {
            if (state.isPaused) {
                state.isPaused = false;
                state.pauseCount += 1; // Anti-cheat counter
            } else {
                state.isPaused = true;
            }
        },

        // ── Settings ─────────────────────────────────────────────────────
        setSettings: (state, action) => {
            if (action.payload.bonusOnCapture !== undefined)
                state.bonusOnCapture = action.payload.bonusOnCapture;
            if (action.payload.bonusOnEntry !== undefined)
                state.bonusOnEntry = action.payload.bonusOnEntry;
        },
        setBoardTheme: (state, action) => {
            state.boardTheme = action.payload;
        },

        // ── Sync full game state (online) ────────────────────────────────
        syncGameState: (state, action) => {
            const { isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode, boardTheme, finishedPlayers } = state;
            return {
                ...initialState, ...action.payload,
                isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode, boardTheme, finishedPlayers: action.payload.finishedPlayers || finishedPlayers
            };
        },

        // ── Reset game (new match) ──────────────────────────────────────
        resetGame: (state) => {
            const { isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode, playerCount, botPlayers, activePlayers, boardTheme } = state;
            const startIdx = PLAYERS.indexOf(activePlayers[0]);
            const startPlayer = PLAYER_NAMES[activePlayers[0]] || 'Red';
            return {
                ...initialState,
                isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode, boardTheme,
                playerCount, botPlayers, activePlayers,
                currentPlayerIdx: startIdx >= 0 ? startIdx : 0,
                logMessage: `Game Started! ${startPlayer}'s Turn — Roll 4 or 8 to enter.`
            };
        }
    }
});

export const {
    rollSticks, applyMove, passTurnIfNoMoves,
    setMultiplayerState, syncGameState, resetGame,
    setSettings, setBoardTheme, togglePause
} = gameSlice.actions;
export default gameSlice.reducer;
