import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    delay?: number;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    delay = 300,
    position = 'top'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                let x = 0, y = 0;

                switch (position) {
                    case 'top':
                        x = rect.left + rect.width / 2;
                        y = rect.top - 8;
                        break;
                    case 'bottom':
                        x = rect.left + rect.width / 2;
                        y = rect.bottom + 8;
                        break;
                    case 'left':
                        x = rect.left - 8;
                        y = rect.top + rect.height / 2;
                        break;
                    case 'right':
                        x = rect.right + 8;
                        y = rect.top + rect.height / 2;
                        break;
                }
                setCoords({ x, y });
                setIsVisible(true);
            }
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const positionClasses = {
        top: '-translate-x-1/2 -translate-y-full mb-2',
        bottom: '-translate-x-1/2 mt-2',
        left: '-translate-x-full -translate-y-1/2 mr-2',
        right: 'ml-2 -translate-y-1/2'
    };

    return (
        <div
            ref={triggerRef}
            className="inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    className={`fixed z-[2000] px-2 py-1 bg-slate-900/90 text-white text-[10px] font-bold rounded-lg backdrop-blur-md border border-white/10 shadow-xl pointer-events-none whitespace-nowrap transition-all duration-200 animate-in fade-in scale-in-95 ${positionClasses[position]}`}
                    style={{ left: coords.x, top: coords.y }}
                >
                    {content}
                    <div
                        className={`absolute border-4 border-transparent ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900/90' :
                                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900/90' :
                                    position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900/90' :
                                        'right-full top-1/2 -translate-y-1/2 border-r-slate-900/90'
                            }`}
                    />
                </div>
            )}
        </div>
    );
};
