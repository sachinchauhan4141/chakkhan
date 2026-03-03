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
    isOnline, roomCode, localPlayerRole, connectedPlayers, gameMode, botPlayers
  } = useSelector(s => s.game);

  const isCurrentTurn = PLAYERS[currentPlayerIdx] === player;

  // Guard against inactive players in offline mode (pieces[player] might be undefined)
  const playerPieces = pieces[player] || [];
  const piecesInYard = playerPieces.map((pos, i) => ({ pos, i })).filter(p => p.pos === -1);
  const piecesHome = playerPieces.filter(pos => pos === 24).length;

  // Determine if the human can interact with this yard
  const isBot = botPlayers?.includes(player);
  let isLocalTurn = !isOnline || localPlayerRole === PLAYERS[currentPlayerIdx];
  if (isBot) isLocalTurn = false; // bots are never locally controlled

  const canRoll = isCurrentTurn && isLocalTurn && (gameState === 'ROLLING' || gameState === 'EXTRA_MOVING');
  const isBotThinking = isCurrentTurn && isBot;
  const c = PLAYER_COLORS[player];
  const playerLabel = isBot
    ? `🤖 ${PLAYER_NAMES[player]}`
    : (connectedPlayers?.find(p => p.role === player)?.username) || PLAYER_NAMES[player];

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
                relative flex flex-col items-center rounded-3xl overflow-hidden
                w-[110px] sm:w-[140px] md:w-[160px] pb-2
                bg-gradient-to-br from-slate-800 to-slate-900 border transition-all duration-300 select-none
                ${isCurrentTurn
          ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105 z-20 ' + (isLocalTurn ? 'animate-[pulse_2s_ease-in-out_infinite]' : '')
          : 'border-slate-700 opacity-80 z-10'}
            `}>

      {/* Decorative colored glow based on player color */}
      <div className="absolute inset-0 opacity-10 blur-xl pointer-events-none" style={{ background: c.dot }} />

      {/* Header: name + capture dot */}
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 relative z-10">
        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest truncate ${c.text} drop-shadow-md`}>
          {playerLabel}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner"
          style={{ background: hasCaptured[player] ? '#ef4444' : '#475569', boxShadow: hasCaptured[player] ? '0 0 8px #ef4444' : 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
          title={hasCaptured[player] ? 'Has captured' : 'No capture yet'}
        />
      </div>

      {/* Yard grid (The Nest) */}
      <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-full bg-slate-900 border-2 border-slate-700/50 flex flex-col items-center justify-center relative z-10 shadow-inner my-1">
        {piecesInYard.length === 0 ? (
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Empty</span>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 place-items-center">
            {piecesInYard.map(p => (
              <div key={p.i} className="w-5 h-5 sm:w-7 sm:h-7 hover:scale-110 transition-transform">
                <Piece player={player} pieceIndex={p.i} pos={p.pos} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Home count */}
      <div className="mt-1 mb-2 text-[10px] sm:text-xs text-slate-400 font-bold tracking-widest relative z-10 flex items-center gap-1">
        <span className={piecesHome === 4 ? 'text-amber-400' : 'text-slate-500'}>★</span>
        {piecesHome}/4 HOME
      </div>

      {/* Explicit Actions (Buttons) */}
      <div className="flex flex-col gap-1 w-full px-2 relative z-10 min-h-[30px] justify-center items-center">
        {canRoll && (
          <button onClick={(e) => { e.stopPropagation(); handleRoll(); }}
            className="w-[90%] py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_15px_rgba(245,158,11,0.5)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all">
            {gameState === 'EXTRA_MOVING' ? 'Bonus Roll' : 'Roll Dice'} 🎲
          </button>
        )}

        {gameState === 'EXTRA_MOVING' && canRoll && (
          <button onClick={handleSkip}
            className="w-[70%] py-1 rounded-full bg-slate-700/80 text-slate-300 font-bold text-[9px] uppercase tracking-wider hover:bg-slate-600 hover:text-white transition-colors border border-slate-600">
            Skip Turn
          </button>
        )}

        {isBotThinking && (
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
            <span className="text-base">🤖</span> Thinking…
          </span>
        )}
      </div>
    </div>
  );
};

export default PlayerYard;
