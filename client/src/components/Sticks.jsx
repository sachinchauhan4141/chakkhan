import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const Sticks = () => {
    const { rollResult } = useSelector(state => state.game);

    // `shown` becomes true when we have a result to display
    const [shown, setShown] = useState(false);
    // `sticks` is the authoritative array of booleans (true = flat-side up)
    const [sticks, setSticks] = useState([false, false, false, false]);
    // `animating` drives the CSS tumble-in animation class
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (!rollResult) return;

        // Trigger tumble animation
        setAnimating(true);
        setShown(true);

        // After the shake, commit the final stick positions
        const timer = setTimeout(() => {
            setSticks(rollResult.sticks);
            setAnimating(false);
        }, 650);

        // Auto-hide after 1.8s so it doesn't block the board
        const hideTimer = setTimeout(() => {
            setShown(false);
        }, 1800);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, [rollResult]);

    if (!shown) return null;

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
            {/* Darkened overlay so sticks pop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Sticks panel */}
            <div className="relative flex flex-col items-center gap-3">
                {/* Result label */}
                {!animating && rollResult && (
                    <div className="text-white text-2xl sm:text-3xl font-black uppercase tracking-widest drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-[fadeUp_0.3s_ease-out_forwards] text-center">
                        {rollResult.value === 8 ? '✨ Changa! — Rolled 8 ✨'
                            : rollResult.value === 4 ? '🎯 Chakkhan! — Rolled 4'
                                : `Rolled: ${rollResult.value}`}
                    </div>
                )}

                {/* The 4 sticks side by side */}
                <div className="flex gap-3 sm:gap-5 items-center justify-center">
                    {sticks.map((isFlat, i) => (
                        <div
                            key={i}
                            className={`preserve-3d relative cursor-default ${animating ? 'animate-shell-tumble' : 'animate-shell-land'}`}
                            style={{
                                width: '32px',
                                height: '80px',
                                animationDelay: `${i * 120}ms`,
                                transform: isFlat ? 'rotateY(0deg)' : 'rotateY(180deg)'
                            }}
                        >
                            {/* Front Face (Flat white side of the shell) */}
                            <div className="absolute inset-0 backface-hidden rounded-[40%] bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] shadow-[inset_0_0_15px_rgba(0,0,0,0.1),_0_5px_15px_rgba(0,0,0,0.2)] border border-[#dee2e6] flex items-center justify-center overflow-hidden">
                                <div className="w-1.5 h-3/4 rounded-full bg-gradient-to-b from-[#ced4da] to-[#adb5bd] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"></div>
                            </div>

                            {/* Back Face (Rounded brown ribbed side of the shell) */}
                            <div className="absolute inset-0 backface-hidden rounded-[40%] bg-gradient-to-br from-[#8b5a2b] to-[#5c3a21] shadow-[inset_0_-5px_15px_rgba(0,0,0,0.4),_0_5px_15px_rgba(0,0,0,0.3)] border border-[#4a2e1b] overflow-hidden" style={{ transform: 'rotateY(180deg) translateZ(5px)' }}>
                                <div className="absolute inset-0 wood-pattern opacity-60 mix-blend-multiply"></div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Score dots */}
                <div className="flex gap-2">
                    {sticks.map((isFlat, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${isFlat ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'bg-stone-700 border border-stone-500'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sticks;
