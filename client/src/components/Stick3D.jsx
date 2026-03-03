import React from 'react';

const Stick3D = ({ isFlat, animating, delay }) => {
    return (
        <div
            className={`preserve-3d relative cursor-default w-[80px] h-[220px] sm:w-[120px] sm:h-[320px] md:w-[160px] md:h-[450px] lg:w-[220px] lg:h-[600px] ${animating ? 'animate-shell-tumble' : 'animate-shell-land'}`}
            style={{ animationDelay: delay }}
        >
            {/* The inner spinner wrapping the 3 dimensions, handles the final flip state independently of the tumble physics */}
            <div
                className="absolute inset-0 preserve-3d transition-transform duration-1000 ease-in-out"
                style={{ transform: isFlat ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
            >
                {/* 3D Edge Layers (creating solid physical thickness) */}
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="absolute inset-0 backface-hidden" style={{ transform: `rotateY(0deg) translateZ(${(i - 3) * 2}px)` }}>
                        <svg viewBox="0 0 100 250" className={`w-full h-full ${i === 0 ? 'drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)]' : ''}`}>
                            <rect x="2" y="5" width="96" height="240" rx="44" fill="#381D0B" />
                        </svg>
                    </div>
                ))}

                {/* Front Face (Rounded, Smooth ancient wood & gold trim) */}
                <div className="absolute inset-0 backface-hidden flex items-center justify-center pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]" style={{ transform: 'rotateY(0deg) translateZ(8px)' }}>
                    <svg viewBox="0 0 100 250" className="w-full h-full">
                        <defs>
                            <linearGradient id="woodFront" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8B4513" />
                                <stop offset="30%" stopColor="#A0522D" />
                                <stop offset="80%" stopColor="#5C3A21" />
                                <stop offset="100%" stopColor="#29160B" />
                            </linearGradient>
                            <radialGradient id="glare" cx="30%" cy="20%" r="70%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FDE047" />
                                <stop offset="20%" stopColor="#FEF08A" />
                                <stop offset="50%" stopColor="#D97706" />
                                <stop offset="100%" stopColor="#78350F" />
                            </linearGradient>
                        </defs>
                        {/* Trim Base */}
                        <rect x="2" y="5" width="96" height="240" rx="44" fill="url(#goldTrim)" />
                        {/* Wood Core */}
                        <rect x="8" y="11" width="84" height="228" rx="38" fill="url(#woodFront)" />
                        {/* Realistic Spherical Glare mapping */}
                        <rect x="8" y="11" width="84" height="228" rx="38" fill="url(#glare)" />
                        {/* Center Engraving Hint */}
                        <path d="M 50 30 L 50 220" stroke="url(#goldTrim)" strokeWidth="3" strokeLinecap="round" opacity="0.6" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.8))' }} />
                        <circle cx="50" cy="125" r="8" fill="url(#goldTrim)" opacity="0.8" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.9))' }} />
                    </svg>
                </div>

                {/* Back Face (Cowrie shell style slit & markings, flat face) */}
                <div className="absolute inset-0 backface-hidden flex items-center justify-center pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]" style={{ transform: 'rotateY(180deg) translateZ(8px)' }}>
                    <svg viewBox="0 0 100 250" className="w-full h-full">
                        <defs>
                            <linearGradient id="woodBack" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F5DEB3" />
                                <stop offset="50%" stopColor="#DEB887" />
                                <stop offset="100%" stopColor="#A0522D" />
                            </linearGradient>
                            <linearGradient id="goldTrimBack" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FDE047" />
                                <stop offset="50%" stopColor="#D97706" />
                                <stop offset="100%" stopColor="#78350F" />
                            </linearGradient>
                            <filter id="innerShadow">
                                <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#1A0F06" floodOpacity="0.8" />
                            </filter>
                        </defs>
                        {/* Trim Base */}
                        <rect x="2" y="5" width="96" height="240" rx="44" fill="url(#goldTrimBack)" />
                        {/* Inside Flat Core */}
                        <rect x="6" y="9" width="88" height="232" rx="40" fill="url(#woodBack)" />

                        {/* Central Groove (Cowrie mouth) */}
                        <g filter="url(#innerShadow)">
                            <rect x="42" y="25" width="16" height="200" rx="8" fill="#29160B" />
                        </g>

                        {/* Teeth / Markings */}
                        <path d="M 42 45 L 28 48 M 42 75 L 28 78 M 42 105 L 28 108 M 42 135 L 28 138 M 42 165 L 28 168 M 42 195 L 28 198 
                                 M 58 45 L 72 48 M 58 75 L 72 78 M 58 105 L 72 108 M 58 135 L 72 138 M 58 165 L 72 168 M 58 195 L 72 198"
                            stroke="#5C3A21" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default Stick3D;
