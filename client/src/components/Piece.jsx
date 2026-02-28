import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyMove } from '../store/gameSlice';
import socketService from '../services/socket';

const PLAYER_THEMES = {
    p1: { // Red
        bg: 'bg-red-600',
        border: 'border-red-300',
        shadow: 'shadow-[inset_0_-4px_8px_rgba(153,27,27,0.8),_0_4px_6px_rgba(0,0,0,0.5)]',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,1)]',
        innerDot: 'bg-red-300'
    },
    p2: { // Blue
        bg: 'bg-blue-600',
        border: 'border-blue-300',
        shadow: 'shadow-[inset_0_-4px_8px_rgba(30,58,138,0.8),_0_4px_6px_rgba(0,0,0,0.5)]',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,1)]',
        innerDot: 'bg-blue-300'
    },
    p3: { // Yellow
        bg: 'bg-yellow-400',
        border: 'border-yellow-100',
        shadow: 'shadow-[inset_0_-4px_8px_rgba(161,98,7,0.8),_0_4px_6px_rgba(0,0,0,0.5)]',
        glow: 'shadow-[0_0_20px_rgba(250,204,21,1)]',
        innerDot: 'bg-yellow-100'
    },
    p4: { // Green
        bg: 'bg-green-600',
        border: 'border-green-300',
        shadow: 'shadow-[inset_0_-4px_8px_rgba(20,83,45,0.8),_0_4px_6px_rgba(0,0,0,0.5)]',
        glow: 'shadow-[0_0_20px_rgba(34,197,94,1)]',
        innerDot: 'bg-green-300'
    }
};

const Piece = ({ player, pieceIndex, pos }) => {
    const dispatch = useDispatch();
    const { gameState, currentPlayerIdx, validMoves, isOnline, roomCode, localPlayerRole, gameMode } = useSelector((state) => state.game);

    const PLAYERS = ['p1', 'p2', 'p3', 'p4'];
    const isCurrentPlayer = PLAYERS[currentPlayerIdx] === player;

    let isLocalTurn = !isOnline || localPlayerRole === PLAYERS[currentPlayerIdx];
    if (gameMode === 'BOTS' && PLAYERS[currentPlayerIdx] !== 'p1') {
        isLocalTurn = false;
    }

    const validMovesForPiece = validMoves.filter(m => m.pieceIndex === pieceIndex);
    const isSelectable = isLocalTurn && isCurrentPlayer && (gameState === 'NORMAL_MOVING' || gameState === 'EXTRA_MOVING') && validMovesForPiece.length > 0;

    const handleClick = () => {
        if (!isSelectable) return;

        const sortedMoves = [...validMovesForPiece].sort((a, b) => b.moveValue - a.moveValue);
        const moveToApply = sortedMoves[0].moveValue;

        if (pos === -1 && moveToApply !== 4 && moveToApply !== 8) return;

        const action = applyMove({ pieceIndex, moveValue: moveToApply });
        dispatch(action);

        if (isOnline && roomCode) {
            socketService.sendGameAction(roomCode, action);
        }
    };

    const theme = PLAYER_THEMES[player];

    return (
        <div
            onClick={handleClick}
            className={`
        relative rounded-full border-[2px]
        transition-all duration-[400ms] cubic-bezier(0.34, 1.56, 0.64, 1)
        flex items-center justify-center
        ${theme.bg} ${theme.border} ${theme.shadow}
        ${isSelectable
                    ? `cursor-pointer scale-110 ${theme.glow} animate-[pulse_2s_ease-in-out_infinite] hover:-translate-y-2 hover:scale-[1.2] hover:shadow-[0_15px_20px_rgba(0,0,0,0.7)]`
                    : 'cursor-default'}
      `}
            style={{
                width: '30px',
                height: '30px',
            }}
        >
            {/* Center dot for classic feel */}
            <div className={`w-3 h-3 rounded-full opacity-60 ${theme.innerDot}`}></div>
            {/* Subtle top reflection */}
            <div className="absolute top-[2px] right-[4px] w-[8px] h-[4px] bg-white opacity-50 rounded-full blur-[1px] transform rotate-45 pointer-events-none"></div>
        </div>
    );
};

export default Piece;
