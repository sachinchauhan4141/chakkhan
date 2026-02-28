import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Board from './components/Board';
import PlayerYard from './components/PlayerYard';
import ObjectSticks from './components/Sticks';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import LoadingScreen from './components/LoadingScreen';
import { passTurnIfNoMoves, syncGameState, togglePause, resetGame, setMultiplayerState } from './store/gameSlice';
import socketService from './services/socket';
import { executeBotTurn } from './utils/botAI';
import { LogOut, Pause, Play } from 'lucide-react';

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];
const PLAYER_NAMES = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };
const PLAYER_COLORS = { p1: '#ef4444', p2: '#3b82f6', p3: '#facc15', p4: '#22c55e' };

const App = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = React.useState(true);
  const [displayMessage, setDisplayMessage] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);

  const exitToMenu = () => {
    setShowExitConfirm(false);
    dispatch(resetGame());
    dispatch(setMultiplayerState({ gameMode: 'MENU', isOnline: false, roomCode: null, connectedPlayers: [] }));
  };

  const {
    logMessage, availableMoves, currentPlayerIdx, gameState,
    gameMode, isOnline, roomCode, connectedPlayers, rollResult,
    isPaused, pauseCount
  } = useSelector(s => s.game);
  const fullGameState = useSelector(s => s.game);

  React.useEffect(() => {
    if (!logMessage) return;
    setDisplayMessage(logMessage);
    const t = setTimeout(() => setDisplayMessage(null), 2000);
    return () => clearTimeout(t);
  }, [logMessage]);

  React.useEffect(() => {
    if (gameMode === 'MENU' || gameState === 'GAME_OVER') return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [gameMode, gameState]);

  React.useEffect(() => {
    if (isOnline) {
      socketService.on('sync_action', action => dispatch(action));
      return () => socketService.off('sync_action');
    }
  }, [isOnline, dispatch]);

  React.useEffect(() => {
    if (gameMode === 'BOTS') {
      const cur = PLAYERS[currentPlayerIdx];
      if (cur !== 'p1' && gameState !== 'GAME_OVER') {
        executeBotTurn(fullGameState, dispatch);
      }
    }
  }, [fullGameState, dispatch, gameMode, currentPlayerIdx, gameState]);

  const currentPlayer = PLAYERS[currentPlayerIdx];
  const playerLabel = (connectedPlayers?.find(p => p.role === currentPlayer)?.username) || PLAYER_NAMES[currentPlayer];
  const accentColor = PLAYER_COLORS[currentPlayer];

  if (isLoading) return <LoadingScreen onComplete={() => setIsLoading(false)} />;

  if (gameMode === 'MENU') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <MainMenu />
      </div>
    );
  }

  if (isOnline && connectedPlayers.length < 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Lobby />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <header className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/60 backdrop-blur-md shrink-0 relative z-40">
        <div className="flex items-center gap-1 min-w-[60px]">
          {availableMoves.filter(m => m !== 'CAPTURE_BONUS').map((m, i) => (
            <span key={i} className="w-6 h-6 rounded-full bg-slate-700 border border-slate-500 text-white text-[10px] font-bold flex items-center justify-center">
              {m}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] uppercase tracking-widest hidden sm:inline">Turn</span>
            <span className="text-sm sm:text-base font-black uppercase tracking-widest" style={{ color: accentColor }}>
              {playerLabel}
            </span>
          </div>
          {rollResult && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Last roll</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${rollResult.value === 4 || rollResult.value === 8 ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-700 border-slate-600 text-slate-200'}`}>
                {rollResult.value === 8 ? '8 — Changa!' : rollResult.value === 4 ? '4 — Chakkhan!' : rollResult.value}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="flex flex-col gap-[5px] p-2 rounded-lg hover:bg-slate-700 transition-colors">
            <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-300 rounded transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <button onClick={() => { dispatch(togglePause()); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors">
                  {isPaused ? <Play size={15} /> : <Pause size={15} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <div className="h-px bg-slate-700" />
                <button onClick={() => { setMenuOpen(false); setShowExitConfirm(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors">
                  <LogOut size={15} />
                  Exit Game
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className={`flex-1 flex flex-col items-center justify-center px-2 py-3 gap-2 sm:gap-3 overflow-auto transition-opacity duration-300 ${isPaused ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>
        
        {/* TOP ROW: Yellow and Blue */}
        <div className="w-full max-w-[520px] flex justify-between px-1">
          [span_0](start_span)[span_1](start_span)<PlayerYard player="p3" /> {/* Yellow[span_0](end_span)[span_1](end_span) */}
          [span_2](start_span)[span_3](start_span)<PlayerYard player="p2" /> {/* Blue[span_2](end_span)[span_3](end_span) */}
        </div>

        <div className="relative w-full max-w-[460px] sm:max-w-[520px] aspect-square">
          <Board />
          {displayMessage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <div className="bg-slate-900/90 border border-slate-600 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-[toastFade_2s_ease_forwards] text-center max-w-[80%]">
                <span className="text-base sm:text-lg font-bold tracking-wide">{displayMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ROW: Green and Red */}
        <div className="w-full max-w-[520px] flex justify-between px-1">
          [span_4](start_span)[span_5](start_span)<PlayerYard player="p4" /> {/* Green[span_4](end_span)[span_5](end_span) */}
          [span_6](start_span)[span_7](start_span)<PlayerYard player="p1" /> {/* Red[span_6](end_span)[span_7](end_span) */}
        </div>

      </main>

      <ObjectSticks />

      {showExitConfirm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-xs w-full mx-4 shadow-2xl">
            <div className="text-3xl mb-3">🚪</div>
            <h3 className="cinzel-font text-slate-100 font-bold text-base mb-2">Exit Game?</h3>
            <p className="text-slate-400 text-sm mb-6">Your progress will be lost.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-all">Stay</button>
              <button onClick={exitToMenu} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all">Exit</button>
            </div>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center gap-1">
            <span className="text-slate-500 text-xs uppercase tracking-widest">Times Resumed</span>
            <span className="text-6xl font-black text-amber-400 tabular-nums" style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              {pauseCount}
            </span>
            <span className="text-slate-500 text-[10px] text-center max-w-[180px] leading-relaxed">
              Remember this number — it goes up each time someone unpauses
            </span>
          </div>
          <div className="text-slate-400 text-sm mb-8 uppercase tracking-widest animate-pulse">Game Paused</div>
          <button onClick={() => dispatch(togglePause())} className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-slate-900 text-base tracking-wide uppercase transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 0 #b45309, 0 6px 20px rgba(245,158,11,0.3)' }}>
            <Play size={20} fill="currentColor" />
            Resume
          </button>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center backdrop-blur-md">
          <div className="bg-slate-800 border-2 border-amber-500 rounded-3xl p-10 sm:p-16 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] max-w-sm w-full mx-4">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="cinzel-font text-4xl sm:text-5xl font-extrabold text-amber-400 mb-2">Victory!</h1>
            <p className="text-xl text-slate-200 font-semibold mb-8" style={{ color: accentColor }}>
              {playerLabel} Wins
            </p>
            <button onClick={exitToMenu} className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.innerHTML = `
    @keyframes toastFade {
      0%   { opacity:0; transform: scale(0.8) translateY(10px); }
      15%  { opacity:1; transform: scale(1.05) translateY(0); }
      25%  { transform: scale(1); }
      75%  { opacity:1; }
      100% { opacity:0; transform: scale(0.9) translateY(-8px); }
    }
  `;
  document.head.appendChild(s);
}

export default App;
