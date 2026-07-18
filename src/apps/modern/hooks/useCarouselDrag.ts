import { useCallback, useEffect, useRef, useState } from 'react';

interface DragState {
    startX: number;
    scrollLeft: number;
    velocity: number;
    lastX: number;
    lastTime: number;
    animationId: number | null;
}

export const useCarouselDrag = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const drag = useRef<DragState>({
        startX: 0,
        scrollLeft: 0,
        velocity: 0,
        lastX: 0,
        lastTime: 0,
        animationId: null
    });

    const momentum = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const vel = drag.current.velocity;
        if (Math.abs(vel) < 0.1) return;

        let v = vel * 16;
        const step = () => {
            if (Math.abs(v) < 0.5) return;
            container.scrollLeft -= v;
            v *= 0.92;
            drag.current.animationId = requestAnimationFrame(step);
        };
        drag.current.animationId = requestAnimationFrame(step);
    }, []);

    const handleStart = useCallback((x: number) => {
        const container = containerRef.current;
        if (!container) return;

        if (drag.current.animationId !== null) {
            cancelAnimationFrame(drag.current.animationId);
            drag.current.animationId = null;
        }

        setIsDragging(true);
        drag.current.startX = x;
        drag.current.scrollLeft = container.scrollLeft;
        drag.current.velocity = 0;
        drag.current.lastX = x;
        drag.current.lastTime = Date.now();
    }, []);

    const handleMove = useCallback((x: number) => {
        if (!containerRef.current) return;

        const delta = drag.current.startX - x;
        const walk = delta;
        containerRef.current.scrollLeft = drag.current.scrollLeft + walk;

        const now = Date.now();
        const dt = now - drag.current.lastTime;
        const dx = x - drag.current.lastX;
        if (dt > 0) {
            drag.current.velocity = dx / dt;
        }
        drag.current.lastX = x;
        drag.current.lastTime = now;
    }, []);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        momentum();
    }, [momentum]);

    useEffect(() => {
        return () => {
            if (drag.current.animationId !== null) {
                cancelAnimationFrame(drag.current.animationId);
            }
        };
    }, []);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        handleStart(e.pageX);
    }, [handleStart]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleStart(e.touches[0].pageX);
        }
    }, [handleStart]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleMove(e.touches[0].pageX);
        }
    }, [handleMove]);

    const onTouchEnd = useCallback(() => {
        handleEnd();
    }, [handleEnd]);

    return {
        containerRef,
        isDragging,
        dragHandlers: {
            onMouseDown,
            onTouchStart,
            onTouchMove,
            onTouchEnd
        },
        globalListeners: {
            onMouseMove: handleMove,
            onMouseUp: handleEnd
        }
    };
};
