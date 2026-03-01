/**
 * gameHelpers.js — Pure functions for game logic calculations
 *
 * These are extracted from gameSlice to keep the slice focused on state
 * transitions while this module handles the computational logic.
 */
import {
    PLAYERS, PLAYER_PATHS, SAFE_CELLS, FRONT_OF_HOUSE,
    OUTER_RING_END, INNER_RING_START, FULL_TURN_ORDER
} from './boardConstants';

// ─── Turn Management ─────────────────────────────────────────────────────────

/**
 * Get the next player index following anticlockwise board order,
 * skipping any players NOT in the activePlayers array.
 *
 * @param {number} currentIdx - Index of the current player (0–3)
 * @param {string[]} activePlayers - Array of active player keys, e.g. ['p1','p3']
 * @returns {number} Index of the next active player
 */
export const getNextTurnIdx = (currentIdx, activePlayers) => {
    const activeIndices = new Set(activePlayers.map(p => PLAYERS.indexOf(p)));
    const pos = FULL_TURN_ORDER.indexOf(currentIdx);
    for (let i = 1; i <= 4; i++) {
        const nextIdx = FULL_TURN_ORDER[(pos + i) % 4];
        if (activeIndices.has(nextIdx)) return nextIdx;
    }
    return currentIdx; // fallback (shouldn't happen)
};

/**
 * Get the current player key from state.
 */
export const getCurrentPlayer = (state) => PLAYERS[state.currentPlayerIdx];

// ─── Move Validation ─────────────────────────────────────────────────────────

/**
 * Calculate all valid moves for the current player given the current state.
 *
 * Rules:
 * - Piece in yard (-1): can only enter on a 4 or 8 → goes to pos 0 (home castle)
 * - Piece on board: advances by moveValue positions
 * - Cannot move past pos 24 (center) — must land exactly
 * - Cannot cross from outer to inner ring unless:
 *   a) Player has captured at least one opponent piece
 *   b) Piece is at pos 15 (the gateway cell)
 *
 * @param {object} state - Current game state from Redux
 * @returns {Array<{pieceIndex, moveValue, currentPos, targetPos}>}
 */
export const calculateAllValidMoves = (state) => {
    const player = getCurrentPlayer(state);
    const playerPieces = state.pieces[player];
    const validMoves = [];

    if (state.gameState === 'GAME_OVER') return [];

    const uniqueMoves = [...new Set(state.availableMoves)];

    uniqueMoves.forEach(moveValue => {
        playerPieces.forEach((currentPos, pieceIndex) => {
            let targetPos = null;

            if (currentPos === -1) {
                // In yard → can only enter on a 4 or 8
                if (moveValue === 4 || moveValue === 8) {
                    targetPos = 0; // Enter at home castle
                }
            } else if (currentPos < 24) {
                const tentativeTarget = currentPos + moveValue;

                if (tentativeTarget <= 24) {
                    const isOnOuterRing = currentPos < INNER_RING_START;
                    const wouldCrossGateway = isOnOuterRing && tentativeTarget >= INNER_RING_START;

                    if (wouldCrossGateway) {
                        // Must be at gateway AND have captured to enter inner ring
                        if (currentPos === OUTER_RING_END && state.hasCaptured[player]) {
                            targetPos = tentativeTarget;
                        }
                        // Otherwise blocked
                    } else {
                        targetPos = tentativeTarget;
                    }
                }
                // If tentativeTarget > 24 → no move (must land exactly on center)
            }

            if (targetPos !== null) {
                validMoves.push({ pieceIndex, moveValue, currentPos, targetPos });
            }
        });
    });

    return validMoves;
};
