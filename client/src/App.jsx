/**
 * App.jsx — Main application shell
 *
 * Handles: auth gate, screen routing (profile/friends/leaderboard),
 * game mode switching (menu/lobby/game), and responsive layout.
 *
 * Heavy sub-components are extracted into:
 *  - GameHeader.jsx   → top bar during gameplay
 *  - GameOverlays.jsx → pause, exit, victory overlays
 *  - AuthScreen.jsx   → login/register
 *  - ProfileScreen / FriendsPanel / LeaderboardScreen → social screens
 */
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RotateCw } from 'lucide-react';
import Board from './components/Board';
import PlayerYard from './components/PlayerYard';
import ObjectSticks from './components/Sticks';
import UnifiedLobby from './components/UnifiedLobby';
import LoadingScreen from './components/LoadingScreen';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';
import FriendsPanel from './components/FriendsPanel';
import LeaderboardScreen from './components/LeaderboardScreen';
import GameHeader from './components/GameHeader';
import { ExitConfirm, PauseOverlay, VictoryScreen } from './components/GameOverlays';
import { resetGame, setMultiplayerState } from './store/gameSlice';
import { loadUser } from './store/authSlice';
import socketService from './services/socket';
import { executeBotTurn } from './utils/botAI';

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];
const PLAYER_NAMES = { p1: 'Red', p2: 'Blue', p3: 'Yellow', p4: 'Green' };
const PLAYER_COLORS = { p1: '#ef4444', p2: '#3b82f6', p3: '#facc15', p4: '#22c55e' };

// Removed OrientationLock as per user request for Portrait layout

const App = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = React.useState(true);
  const [displayMessage, setDisplayMessage] = React.useState(null);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [screen, setScreen] = React.useState(null); // 'profile' | 'friends' | 'leaderboard'

  // ── Auth ──
  const { isAuthenticated, isLoading: authLoading, token } = useSelector(s => s.auth);
  React.useEffect(() => { dispatch(loadUser()); }, [dispatch]);
  React.useEffect(() => { if (!authLoading) socketService.connect(token); }, [authLoading, token]);

  // ── Game state ──
  const {
    logMessage, availableMoves, currentPlayerIdx, gameState,
    gameMode, isOnline, roomCode, connectedPlayers, rollResult,
    isPaused, pauseCount, playerCount, botPlayers, activePlayers, currentTurnRolls
  } = useSelector(s => s.game);
  const fullGameState = useSelector(s => s.game);

  const currentPlayer = PLAYERS[currentPlayerIdx];
  const playerLabel = (connectedPlayers?.find(p => p.role === currentPlayer)?.username) || PLAYER_NAMES[currentPlayer];
  const accentColor = PLAYER_COLORS[currentPlayer];

  // ── Effects ──
  // Toast auto-clear
  React.useEffect(() => {
    if (!logMessage) return;
    setDisplayMessage(logMessage);
    const t = setTimeout(() => setDisplayMessage(null), 2000);
    return () => clearTimeout(t);
  }, [logMessage]);

  // Prevent accidental close during game
  React.useEffect(() => {
    if (gameMode === 'MENU' || gameState === 'GAME_OVER') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [gameMode, gameState]);

  // Online sync
  React.useEffect(() => {
    if (!isOnline) return;
    socketService.on('sync_action', a => dispatch(a));
    return () => socketService.off('sync_action');
  }, [isOnline, dispatch]);

  // Bot turns
  React.useEffect(() => {
    if (botPlayers.length > 0 && gameState !== 'GAME_OVER') {
      if (botPlayers.includes(currentPlayer)) executeBotTurn(fullGameState, dispatch);
    }
  }, [fullGameState, dispatch, botPlayers, currentPlayer, gameState]);

  // ── Exit action ──
  const exitToMenu = () => {
    setShowExitConfirm(false);
    dispatch(resetGame());
    dispatch(setMultiplayerState({ gameMode: 'MENU', isOnline: false, roomCode: null, connectedPlayers: [], activePlayers: ['p1', 'p2', 'p3', 'p4'] }));
  };

  // ── Render gates ──
  if (isLoading) return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  if (!isAuthenticated && !authLoading) return <AuthScreen />;
  if (authLoading) return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center" style={{ height: '100dvh' }}>
      <span className="text-amber-400 animate-pulse text-sm">Loading…</span>
    </div>
  );

  // Overlay screens
  if (screen === 'profile') return <ProfileScreen onBack={() => setScreen(null)} />;
  if (screen === 'friends') return <FriendsPanel onBack={() => setScreen(null)} />;
  if (screen === 'leaderboard') return <LeaderboardScreen onBack={() => setScreen(null)} />;

  // Unified Lobby (replaces MainMenu and Matchmaking Lobby)
  if (gameMode === 'MENU' || gameMode === 'FRIENDS' || (isOnline && connectedPlayers.length < playerCount)) {
    return <UnifiedLobby onProfile={() => setScreen('profile')} onLeaderboard={() => setScreen('leaderboard')} />;
  }

  // ── GAME SCREEN ──
  return (
    <>
      <div className="fixed inset-0 w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden" style={{ height: '100dvh' }}>
        <GameHeader availableMoves={availableMoves} playerLabel={playerLabel} accentColor={accentColor}
          rollResult={rollResult} isPaused={isPaused} onExit={() => setShowExitConfirm(true)}
          currentTurnRolls={currentTurnRolls} />

        <main className={`flex-1 flex flex-col items-center justify-between py-4 px-2 w-full max-w-3xl mx-auto overflow-hidden transition-opacity duration-300 ${isPaused ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>
          {/* Top yards */}
          <div className="w-full flex justify-between px-2 shrink-0 h-24 max-w-lg">
            {activePlayers.includes('p3') && <PlayerYard player="p3" />}
            {activePlayers.includes('p2') && <PlayerYard player="p2" />}
          </div>

          {/* Board: Maximized Width */}
          <div className="relative shrink-0 w-full flex items-center justify-center my-auto aspect-square max-w-[500px]">
            <Board />
            {displayMessage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <div className="bg-slate-900/90 border border-slate-600 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-[toastFade_2s_ease_forwards] text-center max-w-[80%]">
                  <span className="text-base sm:text-lg font-bold tracking-wide">{displayMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom yards */}
          <div className="w-full flex justify-between px-2 shrink-0 h-24 max-w-lg">
            {activePlayers.includes('p4') && <PlayerYard player="p4" />}
            {activePlayers.includes('p1') && <PlayerYard player="p1" />}
          </div>
        </main>

        <ObjectSticks />
        {showExitConfirm && <ExitConfirm onStay={() => setShowExitConfirm(false)} onExit={exitToMenu} />}
        {isPaused && <PauseOverlay pauseCount={pauseCount} />}
        {gameState === 'GAME_OVER' && <VictoryScreen finishedPlayers={fullGameState.finishedPlayers} activePlayers={fullGameState.activePlayers} onPlayAgain={exitToMenu} />}
      </div>
    </>
  );
};

// ── Keyframe injection ──
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.innerHTML = `
    @keyframes toastFade { 0%{opacity:0;transform:scale(.8) translateY(10px)} 15%{opacity:1;transform:scale(1.05) translateY(0)} 25%{transform:scale(1)} 75%{opacity:1} 100%{opacity:0;transform:scale(.9) translateY(-8px)} }
    @keyframes stickTumble { 0%{opacity:0;transform:translateY(-60px) rotate(30deg) scale(.6)} 60%{opacity:1;transform:translateY(8px) rotate(-10deg) scale(1.05)} 100%{opacity:1;transform:translateY(0) rotate(0) scale(1)} }
    @keyframes stickLand { 0%{transform:scaleY(1.05)} 60%{transform:scaleY(.96)} 100%{transform:scaleY(1)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(s);
}

export default App;
