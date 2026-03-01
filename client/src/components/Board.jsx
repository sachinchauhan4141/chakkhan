import React from 'react';
import { useSelector } from 'react-redux';
import Cell from './Cell';
import Piece from './Piece';
import { PLAYER_PATHS } from '../store/gameSlice';
import { BOARD_THEMES } from './BoardThemeSelector';

const Board = () => {
    const cells = Array.from({ length: 25 }, (_, i) => i);
    const piecesState = useSelector((state) => state.game.pieces);
    const currentPlayerIdx = useSelector((state) => state.game.currentPlayerIdx);
    const playerCount = useSelector((state) => state.game.playerCount);
    const activePlayersState = useSelector((state) => state.game.activePlayers);
    const themeKey = useSelector((state) => state.game.boardTheme) || 'classic';
    const theme = BOARD_THEMES.find(t => t.key === themeKey) || BOARD_THEMES[0];

    const PLAYERS = ['p1', 'p2', 'p3', 'p4'];
    const activePlayers = activePlayersState || PLAYERS.slice(0, playerCount);
    const currentPlayer = PLAYERS[currentPlayerIdx];

    // Build a map of globalCell → list of {player, pieceIndex, posIndex}
    // so we can compute stacking offsets when multiple pieces share a cell
    const cellOccupancy = {};
    activePlayers.forEach(player => {
        piecesState[player].forEach((posIndex, pieceIndex) => {
            if (posIndex === -1) return;
            const cellIndex = posIndex === 24 ? 12 : PLAYER_PATHS[player][posIndex];
            if (cellIndex === undefined) return;
            if (!cellOccupancy[cellIndex]) cellOccupancy[cellIndex] = [];
            cellOccupancy[cellIndex].push({ player, pieceIndex, posIndex });
        });
    });

    return (
        <div className="relative w-full max-w-full md:max-w-[500px] aspect-square mx-auto
            rounded-2xl md:rounded-3xl
            shadow-[0_4px_0_#1e293b,0_10px_40px_rgba(0,0,0,0.6)]
            border-[5px] md:border-[8px]
            ring-2 ring-slate-900/60 ring-offset-1 transition-colors duration-500"
            style={{ backgroundColor: theme.colors.board, borderColor: theme.colors.accent }}>

            {/* Subtle checker texture */}
            <div className="absolute inset-0 rounded-xl md:rounded-2xl opacity-[0.03]
                bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22black%22/></svg>')]
                pointer-events-none z-10" />

            {/* Grid — divide lines form the 5×5 board */}
            <div className="grid grid-cols-5 grid-rows-5 w-full h-full
                border-2 divide-x-2 divide-y-2 relative z-20 rounded-lg overflow-hidden transition-colors duration-500"
                style={{ borderColor: theme.colors.accent, backgroundColor: theme.colors.cell }}>
                {/* Dynamically applying divide colors via CSS variables or inline is tricky, but we can set the cell backgrounds directly in Cell, 
                    and the divide color is usually border color. We'll use a CSS trick or set inline borders in Cell if needed. */}
                <style>{`
                    .custom-divide > div {
                        border-color: ${theme.colors.accent} !important;
                    }
                `}</style>
                <div className="contents custom-divide">
                    {cells.map((cellIndex) => (
                        <Cell key={cellIndex} cellIndex={cellIndex} theme={theme} />
                    ))}
                </div>
            </div>

            {/* Piece Layer — absolute, on top of cells */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {activePlayers.map(player =>
                    piecesState[player].map((posIndex, pieceIndex) => {
                        if (posIndex === -1) return null;

                        const { top, left } = getCellCoordinates(player, posIndex);

                        // Stacking offset: shift each overlapping piece slightly
                        const cellIndex = posIndex === 24 ? 12 : PLAYER_PATHS[player][posIndex];
                        const stackList = cellOccupancy[cellIndex] || [];
                        const stackIdx = stackList.findIndex(
                            e => e.player === player && e.pieceIndex === pieceIndex
                        );
                        const stackOffsets = [
                            { dx: 0, dy: 0 },
                            { dx: 5, dy: -5 },
                            { dx: -5, dy: 5 },
                            { dx: 5, dy: 5 },
                        ];
                        const offset = stackOffsets[stackIdx] || { dx: 0, dy: 0 };

                        return (
                            <div
                                key={`${player}-${pieceIndex}`}
                                className="absolute pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                                style={{
                                    top,
                                    left,
                                    transform: `translate(calc(-50% + ${offset.dx}px), calc(-50% + ${offset.dy}px))`,
                                    // Current player's pieces float above all others so they're clickable
                                    zIndex: player === currentPlayer
                                        ? 60 + pieceIndex
                                        : 30 + pieceIndex,
                                }}
                            >
                                <Piece player={player} pieceIndex={pieceIndex} pos={posIndex} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Maps a player's path index (0-24) to an (x,y) percentage position on the 5×5 grid.
function getCellCoordinates(player, pathIndex) {
    if (pathIndex === 24) return { top: '50%', left: '50%' }; // center HOME

    const cellIndex = PLAYER_PATHS[player][pathIndex];
    if (cellIndex === undefined) return { top: '50%', left: '50%' };

    const row = Math.floor(cellIndex / 5);
    const col = cellIndex % 5;

    // Each cell is 20% wide/tall; center of cell = 10% + 20% × index
    const top = `${10 + row * 20}%`;
    const left = `${10 + col * 20}%`;
    return { top, left };
}

export default Board;

