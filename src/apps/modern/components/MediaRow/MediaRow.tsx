import React, { useEffect, useRef, useState } from 'react';

import { useApi } from 'hooks/useApi';
import Events from 'utils/events';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useCarouselDrag } from '../../hooks/useCarouselDrag';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMediaRowItems } from '../../hooks/useMediaRowItems';
import { ZAFlix } from '../../styles/theme';

interface MediaRowProps {
    title: string;
    query: any;
    isTop10?: boolean;
}

const MediaRow: React.FC<MediaRowProps> = ({ title, query, isTop10 }) => {
    const { __legacyApiClient__: apiClient } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const { data: items = [], isPending } = useMediaRowItems(title, query);
    const [isHovered, setIsHovered] = useState(false);
    const { containerRef, isDragging, dragHandlers, globalListeners } = useCarouselDrag();

    const scroll = (direction: 'left' | 'right') => {
        const container = containerRef.current;
        if (!container) return;

        const scrollAmount = container.clientWidth * 0.8;
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (direction === 'left') {
            if (container.scrollLeft <= 5) {
                container.scrollTo({ left: maxScroll, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            }
        } else {
            if (container.scrollLeft >= maxScroll - 5) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    // Global mouse move/up to support dragging outside the container
    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => { globalListeners.onMouseMove(e.pageX); };
        const onUp = () => { globalListeners.onMouseUp(); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging, globalListeners]);

    const cardWidth = isMobile ? '105px' : isTablet ? '135px' : '150px';

    const titleStyle: React.CSSProperties = {
        fontSize: isMobile ? '1.15rem' : '1.35rem',
        color: ZAFlix.colors.textPrimary,
        marginBottom: '10px',
        paddingLeft: '2px',
        fontWeight: 700,
        textShadow: ZAFlix.shadows.textGlowSubtle
    };

    if (isPending) {
        return (
            <div style={{ marginBottom: '30px', position: 'relative', textAlign: 'left' }}>
                <h2 style={titleStyle}>{title}</h2>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden', padding: '8px 2px' }}>
                    {[1, 2, 3, 4, 5].map((idx) => (
                        <div
                            key={idx}
                            className='skeleton-card'
                            style={{
                                flex: '0 0 auto',
                                width: cardWidth,
                                borderRadius: ZAFlix.radii.card,
                                overflow: 'hidden',
                                border: '1px solid rgba(211, 82, 255, 0.08)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                background: ZAFlix.colors.card,
                                position: 'relative',
                                paddingTop: '150%'
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (!isPending && items.length === 0) {
        return null;
    }

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ marginBottom: '30px', position: 'relative', textAlign: 'left' }}
        >
            <h2 style={titleStyle}>{title}</h2>

            <div style={{ position: 'relative', width: '100%' }}>
                {!isMobile && (
                    <button
                        onClick={() => scroll('left')}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            background: 'rgba(10, 6, 20, 0.45)',
                            border: 'none',
                            color: ZAFlix.colors.textPrimary,
                            width: '45px',
                            cursor: 'pointer',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.3s ease, background 0.2s ease',
                            borderTopLeftRadius: ZAFlix.radii.card,
                            borderBottomLeftRadius: ZAFlix.radii.card
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.45)'}
                    >
                        <ChevronLeftIcon fontSize='large' />
                    </button>
                )}

                <div
                    ref={containerRef}
                    className='zaflix-hide-scrollbar'
                    style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        scrollBehavior: 'smooth',
                        padding: '8px 2px',
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: isDragging ? 'none' : undefined
                    }}
                    {...dragHandlers}
                >
                    {items.map((item, index) => {
                        const imageUrl = apiClient
                            ? apiClient.getUrl(`Items/${item.Id}/Images/Primary?quality=90`)
                            : '';

                        const handleItemClick = () => {
                            Events.trigger(document, 'open-zaflix-details', [item]);
                        };

                        return (
                            <div
                                key={item.Id}
                                onClick={handleItemClick}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(); } }}
                                role='button'
                                tabIndex={0}
                                className='zaflix-focus-visible will-change-transform'
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: isTop10 ? `calc(${cardWidth} + 45px)` : cardWidth,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    scrollSnapAlign: 'start'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isMobile) e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isMobile) e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {isTop10 && (
                                    <div style={{
                                        fontSize: isMobile ? '4.5rem' : '6.5rem',
                                        fontWeight: 900,
                                        color: ZAFlix.colors.bg,
                                        WebkitTextStroke: '2.5px rgba(211, 82, 255, 0.65)',
                                        textShadow: '0 0 20px rgba(211, 82, 255, 0.4)',
                                        lineHeight: '1',
                                        marginRight: '-15px',
                                        zIndex: 2,
                                        userSelect: 'none',
                                        fontFamily: ZAFlix.fonts.heading
                                    }}>
                                        {index + 1}
                                    </div>
                                )}
                                <div style={{
                                    position: 'relative',
                                    flex: 1,
                                    paddingTop: '150%',
                                    borderRadius: ZAFlix.radii.card,
                                    overflow: 'hidden',
                                    border: '1px solid rgba(211, 82, 255, 0.15)',
                                    boxShadow: ZAFlix.shadows.card,
                                    background: ZAFlix.colors.card
                                }}>
                                    <img
                                        src={imageUrl}
                                        alt={item.Name || ''}
                                        loading='lazy'
                                        className='zaflix-image-fade-in'
                                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: ZAFlix.gradients.cardOverlay,
                                        zIndex: 2
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!isMobile && (
                    <button
                        onClick={() => scroll('right')}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            background: 'rgba(10, 6, 20, 0.45)',
                            border: 'none',
                            color: ZAFlix.colors.textPrimary,
                            width: '45px',
                            cursor: 'pointer',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.3s ease, background 0.2s ease',
                            borderTopRightRadius: ZAFlix.radii.card,
                            borderBottomRightRadius: ZAFlix.radii.card
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.45)'}
                    >
                        <ChevronRightIcon fontSize='large' />
                    </button>
                )}
            </div>
        </div>
    );
};

export default React.memo(MediaRow);
