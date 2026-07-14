import React, { useCallback, useEffect, useRef, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import { ZAFlix } from '../../styles/theme';

interface NextItemInfo {
    Id: string;
    Name: string;
    SeriesName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    Overview?: string;
    ImageTags?: { Primary?: string };
    Type?: string;
    ServerId?: string;
}

const EndScreen: React.FC = () => {
    const [nextItem, setNextItem] = useState<NextItemInfo | null>(null);
    const [countdown, setCountdown] = useState(10);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [imageUrl, setImageUrl] = useState('');

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startCountdown = useCallback(() => {
        setCountdown(10);
        clearTimer();
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearTimer]);

    const handlePlayNext = useCallback(() => {
        clearTimer();
        setNextItem(null);
        playbackManager.nextTrack();
    }, [clearTimer]);

    const handleClose = useCallback(() => {
        clearTimer();
        setNextItem(null);
    }, [clearTimer]);

    useEffect(() => {
        if (countdown === 0 && nextItem) {
            handlePlayNext();
        }
    }, [countdown, nextItem, handlePlayNext]);

    useEffect(() => {
        const onPlaybackStop = (_e: any, info: any) => {
            const item = info?.nextItem as NextItemInfo | null;
            if (item?.Id) {
                setNextItem(item);
                import('hooks/useApi').then(m => {
                    const apiClient = m.useApi().__legacyApiClient__;
                    if (apiClient) {
                        const url = apiClient.getUrl(`Items/${item.Id}/Images/Primary?quality=90${item.ImageTags?.Primary ? `&tag=${item.ImageTags.Primary}` : ''}`);
                        setImageUrl(url);
                    }
                });
                startCountdown();
            }
        };

        const onPlaybackStart = () => {
            setNextItem(null);
            clearTimer();
        };

        Events.on(playbackManager, 'playbackstop', onPlaybackStop);
        Events.on(playbackManager, 'playbackstart', onPlaybackStart);

        return () => {
            Events.off(playbackManager, 'playbackstop', onPlaybackStop);
            Events.off(playbackManager, 'playbackstart', onPlaybackStart);
            clearTimer();
        };
    }, [startCountdown, clearTimer]);

    if (!nextItem) return null;

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - countdown / 10);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 3, 10, 0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '0 5% 8%',
            animation: 'zaflixFadeIn 0.3s ease forwards'
        }}>
            <div style={{
                display: 'flex',
                gap: '24px',
                maxWidth: 520,
                background: ZAFlix.gradients.glassmorphism,
                backdropFilter: 'blur(25px)',
                borderRadius: ZAFlix.radii.modal,
                border: `1px solid ${ZAFlix.colors.border}`,
                padding: '20px',
                boxShadow: ZAFlix.shadows.modal
            }}>
                <div style={{
                    width: 160,
                    height: 90,
                    borderRadius: ZAFlix.radii.card,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: ZAFlix.colors.card
                }}>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={nextItem.Name || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: ZAFlix.gradients.accentSoft,
                            color: ZAFlix.colors.textSecondary,
                            fontSize: 24
                        }}>
                            {nextItem.Name?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minWidth: 0
                }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: ZAFlix.colors.accentLight,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {nextItem.ParentIndexNumber != null && nextItem.IndexNumber != null
                            ? `S${nextItem.ParentIndexNumber}:E${nextItem.IndexNumber}`
                            : 'Up Next'}
                    </div>

                    <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: ZAFlix.colors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {nextItem.SeriesName ? `${nextItem.SeriesName} — ` : ''}{nextItem.Name}
                    </h3>

                    {nextItem.Overview && (
                        <p style={{
                            margin: 0,
                            fontSize: '13px',
                            color: ZAFlix.colors.textSecondary,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {nextItem.Overview}
                        </p>
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '6px'
                    }}>
                        <button
                            onClick={handlePlayNext}
                            style={{
                                padding: '8px 20px',
                                fontSize: '13px',
                                fontWeight: 700,
                                borderRadius: ZAFlix.radii.button,
                                border: 'none',
                                background: ZAFlix.gradients.accent,
                                color: ZAFlix.colors.textPrimary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: ZAFlix.shadows.button,
                                fontFamily: ZAFlix.fonts.body
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            Start Now
                        </button>

                        <div style={{ position: 'relative', width: 36, height: 36 }}>
                            <svg width="36" height="36" viewBox="0 0 64 64">
                                <circle
                                    cx="32" cy="32" r={radius}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="4"
                                />
                                <circle
                                    cx="32" cy="32" r={radius}
                                    fill="none"
                                    stroke={ZAFlix.colors.accent}
                                    strokeWidth="4"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 32 32)"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                            </svg>
                            <span style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: ZAFlix.colors.textPrimary
                            }}>{countdown}</span>
                        </div>

                        <button
                            onClick={handleClose}
                            style={{
                                padding: '6px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: ZAFlix.radii.button,
                                border: `1px solid ${ZAFlix.colors.borderHover}`,
                                background: 'transparent',
                                color: ZAFlix.colors.textSecondary,
                                cursor: 'pointer',
                                fontFamily: ZAFlix.fonts.body,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(211, 82, 255, 0.1)'; e.currentTarget.style.color = ZAFlix.colors.textPrimary; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ZAFlix.colors.textSecondary; }}
                        >
                            Back to Browse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EndScreen;
