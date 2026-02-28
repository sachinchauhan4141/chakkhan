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
                            className={`relative rounded-full overflow-hidden border-4 ${animating
                                ? 'animate-[stickTumble_0.6s_ease-out_forwards]'
                                : 'animate-[stickLand_0.25s_ease-out_forwards]'
                                }`}
                            style={{
                                width: '28px',
                                height: '110px',
                                animationDelay: `${i * 70}ms`,
                                /* Flat side: cream/bone color. Bark side: dark brown */
                                background: isFlat
                                    ? 'linear-gradient(160deg, #fff8f0 10%, #e8c98a 50%, #d4aa66 100%)'
                                    : 'linear-gradient(160deg, #4a2c1a 10%, #2e180d 50%, #1c0e07 100%)',
                                borderColor: isFlat ? '#c9974a' : '#0d0704',
                                boxShadow: isFlat
                                    ? 'inset 2px 4px 8px rgba(255,255,255,0.6), 0 8px 20px rgba(0,0,0,0.6)'
                                    : 'inset -2px -4px 10px rgba(0,0,0,0.8), 0 8px 20px rgba(0,0,0,0.8)',
                            }}
                        >
                            {/* Wood grain lines */}
                            {isFlat ? (
                                /* Flat inner side: light grain */
                                <div className="absolute inset-0 opacity-30"
                                    style={{ background: 'repeating-linear-gradient(10deg, transparent, transparent 6px, rgba(160,100,30,0.4) 6px, rgba(160,100,30,0.4) 7px)' }}
                                />
                            ) : (
                                /* Dark bark side: tight dark grain */
                                <div className="absolute inset-0 opacity-50"
                                    style={{ background: 'repeating-linear-gradient(5deg, transparent, transparent 3px, rgba(0,0,0,0.5) 3px, rgba(0,0,0,0.5) 4px)' }}
                                />
                            )}

                            {/* Flat-side center glare highlight */}
                            {isFlat && (
                                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent rounded-t-full" />
                            )}

                            {/* Label at bottom so player can read result */}
                            <div className={`absolute bottom-2 inset-x-0 flex justify-center text-[10px] font-black uppercase tracking-widest ${isFlat ? 'text-amber-800' : 'text-amber-200'}`}>
                                {isFlat ? 'F' : 'B'}
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
