import React, { useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useBillboardItems } from '../../hooks/useBillboardItems';
import { ZAFlix } from '../../styles/theme';

interface BillboardProps {
    filterType?: 'all' | 'Movie' | 'Series';
}

const Billboard: React.FC<BillboardProps> = ({ filterType = 'all' }) => {
    const { __legacyApiClient__: apiClient } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const { data: items = [] } = useBillboardItems(filterType);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playClip, setPlayClip] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    // Slideshow transition and video start timer
    useEffect(() => {
        if (items.length === 0) return;

        setPlayClip(false);
        const delayTimer = setTimeout(() => {
            setPlayClip(true);
        }, 3000);

        const slideTimer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 22000);

        return () => {
            clearTimeout(delayTimer);
            clearInterval(slideTimer);
        };
    }, [currentIndex, items]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const backdropUrl = apiClient ? apiClient.getUrl(`Items/${currentItem.Id}/Images/Backdrop/0?quality=90`) : '';

    const streamUrl = apiClient
        ? apiClient.getUrl(`Videos/${currentItem.Id}/stream?static=false&VideoCodec=h264&AudioCodec=aac&Container=mp4&maxWidth=1280&maxHeight=720&VideoBitrate=1200000&api_key=${apiClient.accessToken()}`)
        : '';

    const handlePlay = () => {
        if (!apiClient) return;
        playbackManager.play({
            ids: [currentItem.Id],
            serverId: apiClient.serverId()
        });
    };

    const handleInfo = () => {
        if (!apiClient) return;
        Events.trigger(document, 'open-zaflix-details', [currentItem]);
    };

    const billboardHeight = isMobile ? '230px' : isTablet ? '350px' : '480px';
    const titleSize = isMobile ? '1.5rem' : isTablet ? '2.0rem' : '2.6rem';

    return (
        <div
            className='zaflix-fade-in'
            style={{
                position: 'relative',
                width: '100%',
                height: billboardHeight,
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '20px',
                background: ZAFlix.colors.card,
                transition: 'height 0.3s ease'
            }}
        >
            {/* Backdrop Image */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${backdropUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                opacity: playClip ? 0 : 0.6,
                transition: 'opacity 1s ease, background-image 0.8s ease',
                zIndex: 1
            }} />

            {/* Video Clip Playback */}
            {playClip && !isMobile && (
                <>
                    <video
                        src={streamUrl}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.65,
                            transition: 'opacity 1s ease',
                            zIndex: 1
                        }}
                    />
                    <button
                        onClick={() => setIsMuted((prev) => !prev)}
                        style={{
                            position: 'absolute',
                            right: '70px',
                            bottom: '25px',
                            background: 'rgba(10, 6, 20, 0.65)',
                            border: `1px solid ${ZAFlix.colors.border}`,
                            color: ZAFlix.colors.textPrimary,
                            borderRadius: ZAFlix.radii.circle,
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 4,
                            transition: 'transform 0.2s ease, background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isMuted ? <VolumeOffIcon fontSize='small' /> : <VolumeUpIcon fontSize='small' />}
                    </button>
                </>
            )}

            {/* Gradient Overlays */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: ZAFlix.gradients.backdropLeft,
                zIndex: 2
            }} />
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: ZAFlix.gradients.backdropBottom,
                zIndex: 2
            }} />

            {/* Content */}
            <div style={{
                position: 'absolute',
                bottom: isMobile ? '8%' : '12%',
                left: '5%',
                width: '90%',
                maxWidth: '650px',
                zIndex: 3,
                color: ZAFlix.colors.textPrimary,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '8px' : '12px',
                textAlign: 'left'
            }}>
                {currentItem.ImageTags && currentItem.ImageTags.Logo ? (
                    <img
                        src={apiClient?.getUrl(`Items/${currentItem.Id}/Images/Logo?maxHeight=120`) || ''}
                        style={{
                            maxHeight: isMobile ? '60px' : '100px',
                            maxWidth: '90%',
                            objectFit: 'contain',
                            alignSelf: 'flex-start',
                            marginBottom: '5px'
                        }}
                        alt={currentItem.Name}
                    />
                ) : (
                    <h1 style={{
                        fontSize: titleSize,
                        margin: 0,
                        textShadow: ZAFlix.shadows.textGlow,
                        fontWeight: 800,
                        letterSpacing: '-0.5px',
                        lineHeight: 1.1
                    }}>{currentItem.Name}</h1>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.85rem', color: ZAFlix.colors.textSecondary }}>
                    {currentItem.ProductionYear && <span>{currentItem.ProductionYear}</span>}
                    {currentItem.CommunityRating && (
                        <span style={{ color: ZAFlix.colors.cyan, fontWeight: 'bold' }}>
                            ★ {currentItem.CommunityRating.toFixed(1)}
                        </span>
                    )}
                    {!isMobile && currentItem.Genres && currentItem.Genres.slice(0, 2).map((g: string) => (
                        <span key={g} style={{
                            padding: '1px 6px',
                            background: 'rgba(211, 82, 255, 0.12)',
                            border: `1px solid ${ZAFlix.colors.border}`,
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                        }}>{g}</span>
                    ))}
                </div>

                {!isMobile && (
                    <p style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        color: ZAFlix.colors.textSecondary,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: isTablet ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>{currentItem.Overview}</p>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                    <button
                        onClick={handlePlay}
                        style={{
                            padding: isMobile ? '6px 15px' : '8px 22px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            borderRadius: ZAFlix.radii.button,
                            border: 'none',
                            background: ZAFlix.gradients.accent,
                            color: ZAFlix.colors.textPrimary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: ZAFlix.shadows.button,
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        <PlayArrowIcon fontSize='small' /> Play
                    </button>
                    <button
                        onClick={handleInfo}
                        style={{
                            padding: isMobile ? '6px 15px' : '8px 22px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            borderRadius: ZAFlix.radii.button,
                            border: `1px solid ${ZAFlix.colors.borderHover}`,
                            background: 'rgba(10, 6, 20, 0.8)',
                            color: ZAFlix.colors.textPrimary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <InfoOutlinedIcon fontSize='small' /> More Info
                    </button>
                </div>
            </div>

            {/* Navigation Arrows */}
            {!isMobile && (
                <>
                    <button
                        onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
                        style={{
                            position: 'absolute',
                            left: '15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(10, 6, 20, 0.5)',
                            border: 'none',
                            color: ZAFlix.colors.textPrimary,
                            borderRadius: ZAFlix.radii.circle,
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3
                        }}
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
                        style={{
                            position: 'absolute',
                            right: '15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(10, 6, 20, 0.5)',
                            border: 'none',
                            color: ZAFlix.colors.textPrimary,
                            borderRadius: ZAFlix.radii.circle,
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3
                        }}
                    >
                        <ChevronRightIcon />
                    </button>
                </>
            )}
        </div>
    );
};

export default Billboard;
