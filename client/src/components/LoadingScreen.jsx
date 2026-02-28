import React, { useState, useEffect } from 'react';

const TIPS = [
    "Tip: Landing exactly on an opponent's piece sends them back to the start!",
    "Fact: Chakkhan Changa is an ancient game of strategy and probability.",
    "Tip: Rolling a 4 or an 8 grants you a bonus turn. Use it wisely.",
    "Tip: The inner ring is highly contested. Move quickly or capture foes.",
    "Tip: The glowing cells with shields are Safe Zones. You cannot be captured here.",
    "Fact: This game requires 4 players representing Red, Blue, Yellow, and Green.",
    "Tip: Rolling three maximum rolls (4 or 8) consecutively results in a bust!",
    "Tip: You must enter the board by rolling a 4 or an 8 first.",
    "Tip: Moving your piece completely around the board and into the center wins the game."
];

const LoadingScreen = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        // Randomize the initial tip
        setTipIndex(Math.floor(Math.random() * TIPS.length));

        // Cycle tips every 2 seconds
        const tipInterval = setInterval(() => {
            setTipIndex((prev) => (prev + 1) % TIPS.length);
        }, 1500);

        // Progress bar simulation (3 seconds total)
        const duration = 2500;
        const interval = 50;
        const step = 100 / (duration / interval);

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setTimeout(onComplete, 400); // Give a small buffer at 100%
                    return 100;
                }
                return prev + step;
            });
        }, interval);

        return () => {
            clearInterval(tipInterval);
            clearInterval(progressInterval);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0604] overflow-hidden">
            {/* Deep Background Setup */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,transparent_60%)] pointer-events-none"></div>

            {/* Dynamic particles simulated via noise */}
            <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22black%22/><circle cx=%2250%22 cy=%2250%22 r=%221%22 fill=%22white%22/></svg>')] pointer-events-none"></div>

            {/* Title Block */}
            <div className="flex-1 flex flex-col justify-center items-center scale-110 md:scale-125 mb-16 relative">
                <div className="absolute animate-ping opacity-20 bg-amber-600 rounded-full blur-[100px] w-64 h-64 z-[-1]"></div>
                <h1 className="cinzel-font text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 drop-shadow-[0_10px_30px_rgba(217,119,6,0.5)] text-center tracking-[0.1em] leading-tight">
                    Chakkhan<br /><span className="text-4xl md:text-6xl text-amber-600">Changa</span>
                </h1>
            </div>

            {/* Loading UI Anchor Bottom */}
            <div className="w-full max-w-sm px-8 mb-16 flex flex-col items-center z-10">
                {/* Dynamic Tip */}
                <p className="cinzel-font text-amber-500/80 text-center text-sm mb-6 min-h-[40px] transition-opacity duration-500 ease-in-out">
                    {TIPS[tipIndex]}
                </p>

                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-black border border-amber-900/50 rounded-full overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] relative">
                    {/* The Fill */}
                    <div
                        className="h-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-200 transition-all duration-75 ease-linear relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Glow trailing edge */}
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-sm"></div>
                    </div>
                </div>
                {/* Loading Text */}
                <div className="mt-3 uppercase tracking-widest text-[10px] text-zinc-500 cinzel-font animate-pulse font-bold">
                    Summoning Board... {Math.round(progress)}%
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
