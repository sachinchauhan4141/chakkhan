import { createSlice } from '@reduxjs/toolkit';

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];

// Board cell layout (0-24):
//  0  1  2  3  4
//  5  6  7  8  9
// 10 11 12 13 14
// 15 16 17 18 19
// 20 21 22 23 24

// OUTER RING (counter-clockwise, 16 cells):
// Starting from bottom-left corner, going: left→up→right→down
// 20 → 15 → 10 → 5 → 0 → 1 → 2 → 3 → 4 → 9 → 14 → 19 → 24 → 23 → 22 → 21 → (back to 20)
// That's 16 cells: [20,15,10,5,0,1,2,3,4,9,14,19,24,23,22,21]

// INNER RING (clockwise, 8 cells):
// [16, 11, 6, 7, 8, 13, 18, 17] (the 8 cells surrounding center 12)
// clockwise from bottom-left inner: 16→11→6→7→8→13→18→17→(back to 16)

// SAFE CELLS (castles): midpoints of each outer edge + center
const SAFE_CELLS = [2, 10, 22, 14, 12];

// ─── Player Paths ────────────────────────────────────────────────────────────
// Board cell layout (0-24):
//  0  1  2  3  4
//  5  6  7  8  9
// 10 11 12 13 14
// 15 16 17 18 19
// 20 21 22 23 24
//
// All 4 paths have exactly 25 positions (indices 0–24):
//   pos  0       = HOME CASTLE (piece enters here on a 4 or 8 roll)
//   pos  1–15    = outer ring (16 cells)  ← pieces travel these first
//   pos  16      = inner ring ENTRY CELL  ← gateway from outer to inner
//   pos  17–23   = remaining inner ring cells (7 cells)
//   pos  24      = CENTER cell 12 (WIN — must land exactly)
//
// Outer ring direction: right→up→left→down (clockwise visually, 16 steps)
// Inner ring direction: up-left→up→right→down→left (8 steps total incl entry)
//
// Player home & gateway (pos 15 = last outer cell, gateway to inner ring):
//   p1  home=22  gateway=21  innerEntry=16
//   p2  home=14  gateway=19  innerEntry=18
//   p3  home= 2  gateway= 3  innerEntry= 8
//   p4  home=10  gateway= 5  innerEntry= 6

const PATH_P1 = [
    // Home (pos 0)
    22,
    // Outer ring clockwise (pos 1-15): right along bottom, up right col, left along top, down left col, back to 21
    23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5, 10, 15, 20, 21,
    // Inner ring (pos 16-23): entry at 16, then CW inner loop
    16, 11, 6, 7, 8, 13, 18, 17,
    // Center — WIN (pos 24)
    12
];

const PATH_P2 = [
    // Home (pos 0)
    14,
    // Outer ring (pos 1-15): up right col, left along top, down left col, right along bottom, up to 19
    9, 4, 3, 2, 1, 0, 5, 10, 15, 20, 21, 22, 23, 24, 19,
    // Inner ring (pos 16-23): entry at 18, then CW inner loop
    18, 17, 16, 11, 6, 7, 8, 13,
    // Center — WIN (pos 24)
    12
];

const PATH_P3 = [
    // Home (pos 0)
    2,
    // Outer ring (pos 1-15): left along top, down left col, right along bottom, up right col, left to 3
    1, 0, 5, 10, 15, 20, 21, 22, 23, 24, 19, 14, 9, 4, 3,
    // Inner ring (pos 16-23): entry at 8, then CW inner loop
    8, 13, 18, 17, 16, 11, 6, 7,
    // Center — WIN (pos 24)
    12
];

const PATH_P4 = [
    // Home (pos 0)
    10,
    // Outer ring (pos 1-15): down left col, right along bottom, up right col, left along top, down to 5
    15, 20, 21, 22, 23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5,
    // Inner ring (pos 16-23): entry at 6, then CW inner loop
    6, 7, 8, 13, 18, 17, 16, 11,
    // Center — WIN (pos 24)
    12
];

export const PLAYER_PATHS = { p1: PATH_P1, p2: PATH_P2, p3: PATH_P3, p4: PATH_P4 };
export const EXPORTED_SAFE_CELLS = SAFE_CELLS;



const PLAYER_NAMES = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };

// Anti-clockwise turn order visually: p1(BR) → p4(LM) → p3(TM) → p2(RM) → p1
const NEXT_TURN_MAP = { 0: 3, 3: 2, 2: 1, 1: 0 };

const initialState = {
    pieces: {
        p1: [-1, -1, -1, -1],
        p2: [-1, -1, -1, -1],
        p3: [-1, -1, -1, -1],
        p4: [-1, -1, -1, -1]
    },
    hasCaptured: { p1: false, p2: false, p3: false, p4: false },
    currentPlayerIdx: 0,
    availableMoves: [],
    consecutiveHighRolls: 0,
    gameState: 'ROLLING',
    logMessage: "Game Started! Red's Turn — Roll 4 or 8 to enter.",
    rollResult: null,
    validMoves: [],

    // Pause
    isPaused: false,
    pauseCount: 0,    // increments each time game is unpaused (cheat-detection counter)

    // Settings
    bonusOnCapture: true,   // grants an extra roll when you capture an opponent's piece
    bonusOnEntry: true,     // grants an extra roll when a piece reaches the center (destination)

    // Multiplayer
    gameMode: 'MENU',
    isOnline: false,
    roomCode: null,
    connectedPlayers: [],
    localPlayerRole: 'p1',
    localUsername: ''   // stores the username entered in MainMenu
};

const getCurrentPlayer = (state) => PLAYERS[state.currentPlayerIdx];

const OUTER_RING_END = 15; // path position 15 is the last outer ring cell (the gateway)
const INNER_RING_START = 16; // path positions 16-23 are the inner ring

const calculateAllValidMoves = (state) => {
    const player = getCurrentPlayer(state);
    const playerPieces = state.pieces[player];
    let validMoves = [];

    if (state.gameState === 'GAME_OVER') return [];

    const uniqueMoves = [...new Set(state.availableMoves)];

    uniqueMoves.forEach(moveValue => {
        playerPieces.forEach((currentPos, pieceIndex) => {
            let targetPos = null;

            if (currentPos === -1) {
                // In yard: can only enter on a 4 or 8
                if (moveValue === 4 || moveValue === 8) {
                    targetPos = 0; // Enter at home castle
                }
            } else if (currentPos < 24) {
                const tentativeTarget = currentPos + moveValue;

                if (tentativeTarget <= 24) {
                    const isOnOuterRing = currentPos < INNER_RING_START;
                    const wouldCrossGateway = isOnOuterRing && tentativeTarget >= INNER_RING_START;

                    if (wouldCrossGateway) {
                        // RULE: Crossing from outer to inner ring requires:
                        // 1. Must have captured at least one piece
                        // 2. Must be starting from the gateway cell (pos 15) — cannot jump past it
                        if (currentPos === OUTER_RING_END && state.hasCaptured[player]) {
                            targetPos = tentativeTarget; // Allowed — cross the gateway
                        } else {
                            // Either hasn't captured OR isn't at the gateway yet: BLOCK
                            targetPos = null;
                        }
                    } else if (!isOnOuterRing || tentativeTarget <= OUTER_RING_END) {
                        // Moving within the outer ring, or within the inner ring
                        targetPos = tentativeTarget;
                    } else {
                        targetPos = tentativeTarget; // Should not hit this, safety fallback
                    }
                }
                // If tentativeTarget > 24, no move allowed (must land exactly on center)
            }

            if (targetPos !== null) {
                validMoves.push({ pieceIndex, moveValue, currentPos, targetPos });
            }
        });
    });

    return validMoves;
};

export const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        rollSticks: (state, action) => {
            if (!['ROLLING', 'EXTRA_MOVING'].includes(state.gameState)) return;

            let flatsUp = 0;
            let sticks = [];
            let moveValue = 0;

            if (action && action.payload && action.payload.sticks) {
                sticks = action.payload.sticks;
                flatsUp = sticks.filter(s => s).length;
                moveValue = action.payload.value;
            } else {
                for (let i = 0; i < 4; i++) {
                    const isFlat = Math.random() < 0.5;
                    sticks.push(isFlat);
                    if (isFlat) flatsUp++;
                }
                switch (flatsUp) {
                    case 0: moveValue = 4; break; // Chakkhan – all bark side up
                    case 1: moveValue = 1; break;
                    case 2: moveValue = 2; break;
                    case 3: moveValue = 3; break;
                    case 4: moveValue = 8; break; // Changa – all flat side up
                }
            }

            const isHighRoll = (moveValue === 4 || moveValue === 8);
            state.rollResult = { sticks, value: moveValue };

            if (isHighRoll) {
                state.consecutiveHighRolls++;
                if (state.consecutiveHighRolls >= 3) {
                    // Rule of three: forfeit turn if 3rd consecutive high roll
                    state.logMessage = `🔥 Three ${moveValue}s in a row! Bust! Turn forfeited.`;
                    state.availableMoves = [];
                    state.consecutiveHighRolls = 0;
                    state.currentPlayerIdx = NEXT_TURN_MAP[state.currentPlayerIdx];
                    state.gameState = 'ROLLING';
                    state.logMessage += ` ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                    state.validMoves = [];
                    return;
                }
                state.gameState = 'EXTRA_MOVING'; // bonus roll allowed
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

            // Auto-advance if no moves possible (NORMAL only; EXTRA_MOVING lets them roll again)
            if (state.validMoves.length === 0 && state.gameState === 'NORMAL_MOVING') {
                state.logMessage += ' — No valid moves. Turn ends.';
                state.availableMoves = [];
                state.currentPlayerIdx = NEXT_TURN_MAP[state.currentPlayerIdx];
                state.gameState = 'ROLLING';
                state.logMessage += ` ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                state.validMoves = [];
            }
        },

        passTurnIfNoMoves: (state) => {
            if (state.gameState === 'EXTRA_MOVING') {
                state.validMoves = calculateAllValidMoves(state);
                if (state.validMoves.length === 0) {
                    state.logMessage = 'No valid moves. Turn ends.';
                    state.availableMoves = [];
                    state.currentPlayerIdx = NEXT_TURN_MAP[state.currentPlayerIdx];
                    state.gameState = 'ROLLING';
                    state.consecutiveHighRolls = 0;
                } else {
                    state.gameState = 'NORMAL_MOVING';
                }
            }
        },

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

            // Check captures (not on safe cells, not at center)
            if (targetPos !== 24) {
                const globalCell = PLAYER_PATHS[player][targetPos];
                if (!SAFE_CELLS.includes(globalCell)) {
                    PLAYERS.forEach(otherPlayer => {
                        if (otherPlayer !== player) {
                            state.pieces[otherPlayer].forEach((otherPos, otherIdx) => {
                                if (otherPos > -1 && otherPos < 24) {
                                    if (PLAYER_PATHS[otherPlayer][otherPos] === globalCell) {
                                        state.pieces[otherPlayer][otherIdx] = -1;
                                        state.hasCaptured[player] = true;
                                        state.logMessage = `⚔️ ${PLAYER_NAMES[player]} captured ${PLAYER_NAMES[otherPlayer]}!`;
                                        // Bonus roll on capture (if setting enabled)
                                        if (state.bonusOnCapture) {
                                            state.availableMoves.push('CAPTURE_BONUS');
                                            state.gameState = 'EXTRA_MOVING';
                                            state.logMessage += ' 🎁 Bonus roll!';
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            }

            // Check win condition (all 4 pieces at center)
            if (state.pieces[player].every(pos => pos === 24)) {
                state.gameState = 'GAME_OVER';
                state.logMessage = `🏆 ${PLAYER_NAMES[player]} WINS!`;
                state.validMoves = [];
                return;
            }

            // Bonus roll for sending a piece to the destination (center)
            if (targetPos === 24 && state.bonusOnEntry) {
                state.availableMoves.push('CAPTURE_BONUS'); // reuse same EXTRA_MOVING mechanism
                state.gameState = 'EXTRA_MOVING';
                state.logMessage = (state.logMessage || '') + ' 🎁 Piece home — Bonus roll!';
            }

            // Recalculate valid moves for remaining moves pool
            state.validMoves = calculateAllValidMoves(state);

            if (state.availableMoves.length === 0) {
                if (state.gameState === 'EXTRA_MOVING') {
                    // Player used move earned by rolling 4 or 8 — grant the bonus roll
                    state.gameState = 'ROLLING'; // same player, rolls again
                    state.logMessage = `🎁 ${PLAYER_NAMES[player]} rolled Chakkhan/Changa — roll again!`;
                    state.validMoves = [];
                    // consecutiveHighRolls intentionally NOT reset here (still tracking streak)
                } else {
                    // NORMAL_MOVING: used all moves — end turn
                    state.currentPlayerIdx = NEXT_TURN_MAP[state.currentPlayerIdx];
                    state.gameState = 'ROLLING';
                    state.consecutiveHighRolls = 0;
                    state.logMessage = `${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                    state.validMoves = [];
                }
            } else if (state.availableMoves.length === 1 && state.availableMoves[0] === 'CAPTURE_BONUS') {
                // Only the capture/destination bonus marker remains — clear it, let player roll
                state.availableMoves = [];
                state.gameState = 'EXTRA_MOVING';
            } else if (state.validMoves.length === 0) {
                // Still have moves in pool but nothing is playable — end turn
                state.availableMoves = [];
                state.currentPlayerIdx = NEXT_TURN_MAP[state.currentPlayerIdx];
                state.gameState = 'ROLLING';
                state.consecutiveHighRolls = 0;
                state.logMessage = `No more valid moves. ${PLAYER_NAMES[getCurrentPlayer(state)]}'s turn.`;
                state.validMoves = [];
            }
        },

        setMultiplayerState: (state, action) => {
            const { isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode, localUsername } = action.payload;
            if (isOnline !== undefined) state.isOnline = isOnline;
            if (roomCode !== undefined) state.roomCode = roomCode;
            if (connectedPlayers !== undefined) state.connectedPlayers = connectedPlayers;
            if (localPlayerRole !== undefined) state.localPlayerRole = localPlayerRole;
            if (gameMode !== undefined) state.gameMode = gameMode;
            if (localUsername !== undefined) state.localUsername = localUsername;
        },

        togglePause: (state) => {
            if (state.isPaused) {
                // Unpausing — increment the counter so others know game was resumed
                state.isPaused = false;
                state.pauseCount += 1;
            } else {
                state.isPaused = true;
            }
        },

        setSettings: (state, action) => {
            if (action.payload.bonusOnCapture !== undefined)
                state.bonusOnCapture = action.payload.bonusOnCapture;
            if (action.payload.bonusOnEntry !== undefined)
                state.bonusOnEntry = action.payload.bonusOnEntry;
        },

        syncGameState: (state, action) => {
            const { isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode } = state;
            return {
                ...initialState,
                ...action.payload,
                isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode
            };
        },

        resetGame: (state) => {
            const { isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode } = state;
            return { ...initialState, isOnline, roomCode, connectedPlayers, localPlayerRole, gameMode };
        }
    }
});

export const { rollSticks, applyMove, passTurnIfNoMoves, setMultiplayerState, syncGameState, resetGame, setSettings, togglePause } = gameSlice.actions;
export default gameSlice.reducer;
