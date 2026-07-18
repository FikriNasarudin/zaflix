import { useCallback, useRef } from 'react';

interface SwipeOptions {
    threshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}

export const useSwipe = ({ threshold = 50, onSwipeLeft, onSwipeRight }: SwipeOptions) => {
    const startX = useRef(0);
    const startY = useRef(0);
    const swiping = useRef(false);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            startX.current = e.touches[0].clientX;
            startY.current = e.touches[0].clientY;
            swiping.current = true;
        }
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!swiping.current || e.changedTouches.length !== 1) return;
        swiping.current = false;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - startX.current;
        const dy = endY - startY.current;

        if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;

        if (dx > 0) {
            onSwipeRight?.();
        } else {
            onSwipeLeft?.();
        }
    }, [threshold, onSwipeLeft, onSwipeRight]);

    return {
        onTouchStart,
        onTouchEnd
    };
};
