/**
 * BottomSheet.jsx — Slide-up sheet for Settings and Rules
 * Used in MainMenu for the bottom overlay panels.
 */
import React from 'react';

/** Toggle switch component */
const Toggle = ({ value, onChange }) => (
    <button onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${value ? 'bg-amber-500' : 'bg-slate-600'}`}>
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

/** Game rules list */
const RULES = [
    { icon: '🏠', text: 'Roll 4 (Chakkhan) or 8 (Changa) to bring a piece onto the board' },
    { icon: '🛤️', text: 'Pieces move along the outer ring, then enter the inner ring' },
    { icon: '⚔️', text: 'Land on an opponent to capture and send them home' },
    { icon: '🏰', text: 'Castle cells (marked ◆) and front-of-house are safe zones' },
    { icon: '🔓', text: 'Capture at least one piece before entering the inner ring' },
    { icon: '✨', text: '4 (Chakkhan) or 8 (Changa) = bonus roll' },
    { icon: '3×', text: 'Three consecutive high rolls = forfeit turn' },
    { icon: '🎯', text: 'Land exactly on center to win!' },
];

const BottomSheet = ({
    sheet, onClose,
    bonusOnCapture, bonusOnEntry, onSettingsChange
}) => (
    <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${sheet ? 'translate-y-0' : 'translate-y-full'}`}>
        {sheet && <div className="fixed inset-0 z-[-1] bg-slate-900/60" onClick={onClose} />}
        <div className="rounded-t-3xl px-6 pt-5 pb-10 max-w-sm mx-auto bg-slate-800 border-t border-slate-700"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

            {/* Settings panel */}
            {sheet === 'settings' && (
                <>
                    <h2 className="cinzel-font text-slate-100 font-bold text-sm mb-5 uppercase tracking-widest">Settings</h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-200 font-semibold">Bonus Roll on Capture</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Extra roll after killing a piece</p>
                            </div>
                            <Toggle value={bonusOnCapture} onChange={() => onSettingsChange({ bonusOnCapture: !bonusOnCapture })} />
                        </div>
                        <div className="h-px bg-slate-700" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-200 font-semibold">Bonus Roll on Destination</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Extra roll when a piece reaches center</p>
                            </div>
                            <Toggle value={bonusOnEntry} onChange={() => onSettingsChange({ bonusOnEntry: !bonusOnEntry })} />
                        </div>
                    </div>
                </>
            )}

            {/* Rules panel */}
            {sheet === 'rules' && (
                <>
                    <h2 className="cinzel-font text-slate-100 font-bold text-sm mb-5 uppercase tracking-widest">How to Play</h2>
                    <ul className="flex flex-col gap-3">
                        {RULES.map((r, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                <span className="text-amber-500 w-5 text-center shrink-0">{r.icon}</span>
                                <span>{r.text}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    </div>
);

export default BottomSheet;
