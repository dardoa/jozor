import React, { useState, useRef, useEffect, useCallback, useId } from 'react';

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
    const tooltipId = useId();

    const updateTooltipPosition = useCallback(() => {
        if (!triggerRef.current) return false;

        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0;
        let y = 0;

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
        return true;
    }, [position]);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            if (updateTooltipPosition()) {
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

    useEffect(() => {
        if (!isVisible) return;

        const handleWindowChange = () => {
            updateTooltipPosition();
        };

        window.addEventListener('scroll', handleWindowChange, true);
        window.addEventListener('resize', handleWindowChange);

        return () => {
            window.removeEventListener('scroll', handleWindowChange, true);
            window.removeEventListener('resize', handleWindowChange);
        };
    }, [isVisible, updateTooltipPosition]);

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
            onFocusCapture={showTooltip}
            onBlurCapture={hideTooltip}
            aria-describedby={isVisible ? tooltipId : undefined}
        >
            {children}
            {isVisible && (
                <div
                    id={tooltipId}
                    role="tooltip"
                    className={`fixed z-[var(--z-index-tips)] px-2.5 py-1.5 bg-[var(--surface-panel)] text-[var(--text-default)] text-[10px] font-semibold rounded-[var(--radius-sm)] border border-[var(--border-soft)] shadow-[var(--shadow-md)] pointer-events-none whitespace-nowrap transition-all duration-200 animate-in fade-in scale-in-95 ${positionClasses[position]}`}
                    style={{ left: coords.x, top: coords.y }}
                >
                    {content}
                    <div
                        className={`absolute border-4 border-transparent ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-[var(--surface-panel)]' :
                                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--surface-panel)]' :
                                    position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-[var(--surface-panel)]' :
                                        'right-full top-1/2 -translate-y-1/2 border-r-[var(--surface-panel)]'
                            }`}
                    />
                </div>
            )}
        </div>
    );
};
