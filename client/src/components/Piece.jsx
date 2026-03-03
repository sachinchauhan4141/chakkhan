import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyMove } from '../store/gameSlice';
import socketService from '../services/socket';

const PLAYER_THEMES = {
    p1: { // Red -> Rose
        bg: 'bg-rose-400',
        border: 'border-white',
        shadow: 'shadow-md',
        glow: 'shadow-[0_4px_15px_rgba(244,63,94,0.4)]',
        innerDot: 'bg-white'
    },
    p2: { // Blue -> Indigo
        bg: 'bg-indigo-400',
        border: 'border-white',
        shadow: 'shadow-md',
        glow: 'shadow-[0_4px_15px_rgba(99,102,241,0.4)]',
        innerDot: 'bg-white'
    },
    p3: { // Yellow -> Amber
        bg: 'bg-amber-400',
        border: 'border-white',
        shadow: 'shadow-md',
        glow: 'shadow-[0_4px_15px_rgba(251,191,36,0.4)]',
        innerDot: 'bg-white'
    },
    p4: { // Green -> Emerald
        bg: 'bg-emerald-400',
        border: 'border-white',
        shadow: 'shadow-md',
        glow: 'shadow-[0_4px_15px_rgba(52,211,153,0.4)]',
        innerDot: 'bg-white'
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
                    ? `cursor-pointer scale-110 ${theme.glow} animate-[pulse_2s_ease-in-out_infinite] hover:-translate-y-2 hover:scale-[1.2] hover:shadow-lg`
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
