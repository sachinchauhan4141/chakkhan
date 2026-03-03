import { rollSticks, applyMove, PLAYER_PATHS, EXPORTED_SAFE_CELLS } from '../store/gameSlice';

const INNER_RING_START = 16; // path positions 0-15 = outer ring, 16-23 = inner ring

export const executeBotTurn = (gameState, dispatch) => {
    // Make bots feel more realistic by adding human-like hesitation 
    const getThinkingTime = () => 2000 + Math.floor(Math.random() * 1500); // 2 - 3.5s to roll
    const getMovingTime = () => 1800 + Math.floor(Math.random() * 1200);   // 1.8 - 3s to pick a piece

    // If we need to roll
    if (gameState.gameState === 'ROLLING') {
        setTimeout(() => dispatch(rollSticks()), getThinkingTime());
        return;
    }

    // Extra turn but no moves available — must roll again
    if (gameState.gameState === 'EXTRA_MOVING' && gameState.validMoves.length === 0) {
        setTimeout(() => dispatch(rollSticks()), getThinkingTime());
        return;
    }

    // Time to move
    if ((gameState.gameState === 'NORMAL_MOVING' || gameState.gameState === 'EXTRA_MOVING') && gameState.validMoves.length > 0) {
        let bestMove = null;
        let maxScore = -999;
        const currentPlayer = ['p1', 'p2', 'p3', 'p4'][gameState.currentPlayerIdx];

        gameState.validMoves.forEach(move => {
            let score = 0;
            const { currentPos, targetPos, moveValue } = move;

            if (currentPos === -1) score += 20; // Entering board is always good

            // Check if the target cell is a safe castle
            if (targetPos !== 24 && targetPos > -1) {
                const targetCellIdx = PLAYER_PATHS[currentPlayer]?.[targetPos];
                if (targetCellIdx !== undefined && EXPORTED_SAFE_CELLS.includes(targetCellIdx)) {
                    score += 50;
                }
            }

            score += moveValue; // Favor advancing further

            if (currentPos < INNER_RING_START && targetPos >= INNER_RING_START) {
                score += 100; // Bonus for entering the inner ring
            }
            if (targetPos === 24) score += 200; // Highest priority: going home

            if (score > maxScore) {
                maxScore = score;
                bestMove = move;
            }
        });

        if (bestMove) {
            setTimeout(() => {
                dispatch(applyMove({
                    pieceIndex: bestMove.pieceIndex,
                    moveValue: bestMove.moveValue
                }));
            }, getMovingTime());
        }
    }
};
