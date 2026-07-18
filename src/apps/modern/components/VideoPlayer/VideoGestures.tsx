import React, { useCallback, useRef, useState } from 'react';

import Replay10Icon from '@mui/icons-material/Replay10';
import Forward30Icon from '@mui/icons-material/Forward30';

import { ZAFlix } from '../../styles/theme';

interface VideoGesturesProps {
    enabled?: boolean;
}

const VideoGestures: React.FC<VideoGesturesProps> = ({ enabled = true }) => {
    const [leftRipple, setLeftRipple] = useState(false);
    const [rightRipple, setRightRipple] = useState(false);
    const lastTapRef = useRef<number>(0);
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const triggerLeftRipple = useCallback(() => {
        setLeftRipple(true);
        setTimeout(() => setLeftRipple(false), 600);
    }, []);

    const triggerRightRipple = useCallback(() => {
        setRightRipple(true);
        setTimeout(() => setRightRipple(false), 600);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!enabled) return;

        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected
            clearTimeout(tapTimeoutRef.current);
            const tapX = e.changedTouches[0].clientX;
            const screenWidth = window.innerWidth;

            if (tapX < screenWidth / 3) {
                // Left third: rewind 10s
                triggerLeftRipple();
                document.dispatchEvent(new CustomEvent('video-gesture', { detail: { action: 'rewind', seconds: 10 } }));
            } else if (tapX > (screenWidth * 2) / 3) {
                // Right third: forward 30s
                triggerRightRipple();
                document.dispatchEvent(new CustomEvent('video-gesture', { detail: { action: 'forward', seconds: 30 } }));
            }
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                // Single tap — let the OSD handle it
            }, 300);
        }
    }, [enabled, triggerLeftRipple, triggerRightRipple]);

    if (!enabled) return null;

    const rippleStyle: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(194, 109, 240, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 50
    };

    return (
        <div
            onTouchEnd={handleTouchEnd}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 40,
                pointerEvents: 'auto'
            }}
        >
            {/* Left rewind ripple */}
            {leftRipple && (
                <div style={{
                    ...rippleStyle,
                    left: '10%',
                    animation: 'zaflixFadeIn 0.15s ease forwards'
                }}>
                    <Replay10Icon style={{ fontSize: '2.5rem', color: ZAFlix.colors.textPrimary }} />
                </div>
            )}

            {/* Right forward ripple */}
            {rightRipple && (
                <div style={{
                    ...rippleStyle,
                    right: '10%',
                    left: 'auto',
                    animation: 'zaflixFadeIn 0.15s ease forwards'
                }}>
                    <Forward30Icon style={{ fontSize: '2.5rem', color: ZAFlix.colors.textPrimary }} />
                </div>
            )}
        </div>
    );
};

export default React.memo(VideoGestures);
