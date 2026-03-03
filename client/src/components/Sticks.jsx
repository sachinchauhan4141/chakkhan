import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Stick3D from './Stick3D';

const Sticks = () => {
    const { rollResult } = useSelector(state => state.game);

    const [shown, setShown] = useState(false);
    const [sticks, setSticks] = useState([false, false, false, false]);
    const [animating, setAnimating] = useState(false);
    const [showingNumber, setShowingNumber] = useState(false);

    useEffect(() => {
        if (!rollResult) return;

        setAnimating(true);
        setShown(true);
        setShowingNumber(false);

        const timer = setTimeout(() => {
            setSticks(rollResult.sticks);
            setAnimating(false);
            setShowingNumber(true); // Trigger big number pop
        }, 650);

        const hideTimer = setTimeout(() => {
            setShown(false);
            setShowingNumber(false);
        }, 2200); // Extended slightly for full animation

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, [rollResult]);

    if (!shown) return null;

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
            {/* Darkened overlay so sticks pop */}
            <div className={`absolute inset-0 bg-black/60 transition-opacity duration-500 ${showingNumber ? 'opacity-80' : 'opacity-100'}`} />

            {/* Sticks panel */}
            <div className={`relative flex flex-col items-center gap-6 transition-all duration-500 ${showingNumber ? 'scale-75 opacity-20 blur-sm' : 'scale-100 opacity-100 blur-none'}`}>
                {/* Result label (only shown briefly before number pop) */}
                {!animating && !showingNumber && rollResult && (
                    <div className="text-amber-300 text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] text-center mb-4">
                        {rollResult.value === 8 ? '✨ Changa! ✨'
                            : rollResult.value === 4 ? '🎯 Chakkhan!'
                                : `Rolled`}
                    </div>
                )}

                {/* The 4 sticks side by side - MASSIVE & 3D */}
                <div className="flex gap-2 sm:gap-4 md:gap-8 items-center justify-center relative w-full h-[60vh] max-h-[800px]">
                    {sticks.map((isFlat, i) => (
                        <div key={i} className="absolute transition-transform duration-700" style={{ transform: `translateX(${(i - 1.5) * 25}%) translateY(${(i % 2 === 0 ? 10 : -10)}px)` }}>
                            <Stick3D
                                isFlat={isFlat}
                                animating={animating}
                                delay={`${i * 120}ms`}
                            />
                        </div>
                    ))}
                </div>

                {/* Score dots */}
                <div className="flex gap-4 sm:gap-6 mt-4">
                    {sticks.map((isFlat, i) => (
                        <div
                            key={i}
                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-colors duration-500 ${isFlat ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)]' : 'bg-stone-800 border-2 border-stone-500 shadow-inner'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Massive Number Zoom Animation */}
            {showingNumber && rollResult && (
                <div className="absolute inset-0 flex items-center justify-center animate-[popZoom_1.5s_ease-out_forwards]">
                    <span className="text-[35vw] md:text-[250px] leading-none font-black text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.8)]" style={{ WebkitTextStroke: '6px #78350f', textShadow: '4px 8px 0 #451a03' }}>
                        {rollResult.value}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Sticks;
