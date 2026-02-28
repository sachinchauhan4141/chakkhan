import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { rollSticks, passTurnIfNoMoves } from '../store/gameSlice';
import socketService from '../services/socket';
import Piece from './Piece';

const PLAYER_NAMES = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };
const PLAYER_COLORS = {
    p1: { text: 'text-red-400', ring: 'ring-red-500', dot: '#ef4444' },
    p2: { text: 'text-blue-400', ring: 'ring-blue-500', dot: '#3b82f6' },
    p3: { text: 'text-yellow-400', ring: 'ring-yellow-400', dot: '#facc15' },
    p4: { text: 'text-green-400', ring: 'ring-green-500', dot: '#22c55e' },
};

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];

const PlayerYard = ({ player }) => {
    const dispatch = useDispatch();
    const {
        pieces, hasCaptured, currentPlayerIdx, gameState,
        isOnline, roomCode, localPlayerRole, connectedPlayers, gameMode
    } = useSelector(s => s.game);

    const isCurrentTurn = PLAYERS[currentPlayerIdx] === player;
    const piecesInYard = pieces[player].map((pos, i) => ({ pos, i })).filter(p => p.pos === -1);
    const piecesHome = pieces[player].filter(pos => pos === 24).length;

    // Determine if the human can interact with this yard
    let isLocalTurn = !isOnline || localPlayerRole === PLAYERS[currentPlayerIdx];
    if (gameMode === 'BOTS' && PLAYERS[currentPlayerIdx] !== 'p1') isLocalTurn = false;

    const canRoll = isCurrentTurn && isLocalTurn && (gameState === 'ROLLING' || gameState === 'EXTRA_MOVING');
    const isBotThinking = isCurrentTurn && !isLocalTurn && gameMode === 'BOTS';
    const c = PLAYER_COLORS[player];
    const playerLabel = (connectedPlayers?.find(p => p.role === player)?.username) || PLAYER_NAMES[player];

    const handleRoll = () => {
        if (!canRoll) return;
        let sticks = [], flatsUp = 0;
        for (let i = 0; i < 4; i++) {
            const f = Math.random() < 0.5;
            sticks.push(f);
            if (f) flatsUp++;
        }
        const moveValue = [4, 1, 2, 3, 8][flatsUp];
        const action = rollSticks({ sticks, value: moveValue });
        dispatch(action);
        if (isOnline && roomCode) socketService.sendGameAction(roomCode, action);
    };

    const handleSkip = (e) => {
        e.stopPropagation();
        if (!canRoll || gameState !== 'EXTRA_MOVING') return;
        const action = passTurnIfNoMoves();
        dispatch(action);
        if (isOnline && roomCode) socketService.sendGameAction(roomCode, action);
    };

    return (
        <div
            onClick={canRoll ? handleRoll : undefined}
            className={`
                relative flex flex-col items-center rounded-xl overflow-hidden
                w-[100px] sm:w-[130px] md:w-[150px] 
                bg-slate-800 border transition-all duration-200 select-none
                ${isCurrentTurn
                    ? 'border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-105 z-20'
                    : 'border-slate-700 opacity-80 z-10'}
                ${canRoll ? 'cursor-pointer' : 'cursor-default'}
            `}>

            {/* Player color accent top bar */}
            <div className="w-full h-1" style={{ background: c.dot }} />

            {/* Header: name + capture dot */}
            <div className="w-full flex items-center justify-between px-2 pt-2 pb-1">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate ${c.text}`}>
                    {playerLabel}
                </span>
                <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: hasCaptured[player] ? '#ef4444' : '#475569' }}
                    title={hasCaptured[player] ? 'Has captured' : 'No capture yet'}
                />
            </div>

            {/* Yard grid */}
            <div className="flex-1 w-full px-2 pb-2 flex items-center justify-center min-h-[60px] sm:min-h-[80px]">
                {piecesInYard.length === 0 ? (
                    <span className="text-[9px] text-slate-600 uppercase tracking-widest">all out</span>
                ) : (
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 place-items-center">
                        {piecesInYard.map(p => (
                            <div key={p.i} className="w-4 h-4 sm:w-6 sm:h-6">
                                <Piece player={player} pieceIndex={p.i} pos={p.pos} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Home count */}
            {piecesHome > 0 && (
                <div className="pb-1.5 text-[9px] sm:text-[10px] text-amber-400 font-bold tracking-widest">
                    {piecesHome}/4 HOME
                </div>
            )}

            {/* TAP TO CAST overlay */}
            {canRoll && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                    bg-slate-900/70 backdrop-blur-[2px] rounded-xl">
                    <span className="text-xl sm:text-2xl">🪵</span>
                    <span className="text-[9px] sm:text-[10px] text-amber-300 font-black uppercase tracking-widest text-center">
                        {gameState === 'EXTRA_MOVING' ? 'Bonus Roll' : 'Cast Sticks'}
                    </span>
                    {gameState === 'EXTRA_MOVING' && (
                        <button onClick={handleSkip}
                            className="mt-1 text-[8px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full border border-slate-600 hover:text-white transition-colors">
                            Skip
                        </button>
                    )}
                </div>
            )}

            {/* Bot thinking overlay */}
            {isBotThinking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                    bg-slate-900/70 backdrop-blur-[2px] rounded-xl">
                    <span className="text-xl sm:text-2xl">🤖</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                        Thinking…
                    </span>
                </div>
            )}
        </div>
    );
};

export default PlayerYard;
