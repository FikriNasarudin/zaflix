import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import globalize from '../../../lib/globalize';
import { clearBackdrop } from '../../../components/backdrop/backdrop';
import layoutManager from '../../../components/layoutManager';
import Page from '../../../components/Page';
import { EventType } from 'constants/eventType';
import Events from 'utils/events';
import { useApi } from 'hooks/useApi';
import Dashboard from 'utils/dashboard';
import { playbackManager } from 'components/playback/playbackmanager';

// MUI Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import '../../../elements/emby-tabs/emby-tabs';
import '../../../elements/emby-button/emby-button';
import '../../../elements/emby-scroller/emby-scroller';

type OnResumeOptions = {
    autoFocus?: boolean;
    refresh?: boolean
};

type ControllerProps = {
    onResume: (
        options: OnResumeOptions
    ) => void;
    refreshed: boolean;
    onPause: () => void;
    destroy: () => void;
};

/* ==========================================================================
   Responsive Layout Hook
   ========================================================================== */
const useMediaQuery = () => {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        isMobile: width < 600,
        isTablet: width >= 600 && width < 1024,
        isDesktop: width >= 1024,
        width
    };
};

const apiCache = new Map<string, any>();

interface BillboardProps {
    filterType?: 'all' | 'Movie' | 'Series';
}
const Billboard: React.FC<BillboardProps> = ({ filterType = 'all' }) => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [items, setItems] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playClip, setPlayClip] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;

        const cacheKey = `${user.Id}_billboard_${filterType}`;
        if (apiCache.has(cacheKey)) {
            setItems(apiCache.get(cacheKey));
            return;
        }

        apiClient.getItems(user.Id, {
            SortBy: 'DateCreated',
            SortOrder: 'Descending',
            Limit: 15,
            IncludeItemTypes: filterType === 'all' ? 'Movie,Series' : filterType,
            Recursive: true,
            Fields: 'Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres'
        }).then((result: any) => {
            if (result && result.Items) {
                const filtered = result.Items.filter((i: any) => i.Overview && i.BackdropImageTags && i.BackdropImageTags.length > 0);
                apiCache.set(cacheKey, filtered);
                setItems(filtered);
            }
        }).catch((err: any) => {
            console.error('[Billboard] failed to fetch items', err);
            if (err && (err.status === 401 || err.statusCode === 401)) {
                window.location.reload();
            }
        });
    }, [apiClient, user, filterType]);

    // Slideshow transition and video start timer
    useEffect(() => {
        if (items.length === 0) return;
        
        setPlayClip(false);
        const delayTimer = setTimeout(() => {
            setPlayClip(true);
        }, 3000); // Start playing video clip after 3 seconds on a slide

        const slideTimer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 22000); // Move to next slide after 22 seconds

        return () => {
            clearTimeout(delayTimer);
            clearInterval(slideTimer);
        };
    }, [currentIndex, items]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const backdropUrl = apiClient ? apiClient.getUrl(`Items/${currentItem.Id}/Images/Backdrop/0?quality=90`) : '';
    
    // Construct Direct H264 preview stream URL
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
        // Open details modal
        Events.trigger(document, 'open-zaflix-details', [currentItem]);
    };

    const billboardHeight = isMobile ? '230px' : isTablet ? '350px' : '480px';
    const titleSize = isMobile ? '1.5rem' : isTablet ? '2.0rem' : '2.6rem';

    return (
        <div 
            className="zaflix-fade-in"
            style={{
                position: 'relative',
                width: '100%',
                height: billboardHeight,
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '20px',
                background: '#140d27',
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
                            border: '1px solid rgba(211, 82, 255, 0.3)',
                            color: '#fff',
                            borderRadius: '50%',
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
                        {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                    </button>
                </>
            )}
            
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to right, rgba(10, 6, 20, 0.95) 0%, rgba(10, 6, 20, 0.7) 50%, rgba(10, 6, 20, 0) 100%)',
                zIndex: 2
            }} />
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(10, 6, 20, 1) 0%, rgba(10, 6, 20, 0.2) 60%, rgba(10, 6, 20, 0) 100%)',
                zIndex: 2
            }} />

            <div style={{
                position: 'absolute',
                bottom: isMobile ? '8%' : '12%',
                left: '5%',
                width: '90%',
                maxWidth: '650px',
                zIndex: 3,
                color: '#fff',
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
                        textShadow: '0 0 10px rgba(211, 82, 255, 0.5)',
                        fontWeight: 800,
                        letterSpacing: '-0.5px',
                        lineHeight: 1.1
                    }}>{currentItem.Name}</h1>
                )}
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.85rem', color: '#dcd9fd' }}>
                    {currentItem.ProductionYear && <span>{currentItem.ProductionYear}</span>}
                    {currentItem.CommunityRating && (
                        <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>
                            ★ {currentItem.CommunityRating.toFixed(1)}
                        </span>
                    )}
                    {!isMobile && currentItem.Genres && currentItem.Genres.slice(0, 2).map((g: string) => (
                        <span key={g} style={{
                            padding: '1px 6px',
                            background: 'rgba(211, 82, 255, 0.12)',
                            border: '1px solid rgba(211, 82, 255, 0.25)',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                        }}>{g}</span>
                    ))}
                </div>

                {!isMobile && (
                    <p style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        color: '#dcd9fd',
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
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #00f0ff 0%, #d352ff 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 15px rgba(211, 82, 255, 0.4)',
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        <PlayArrowIcon fontSize="small" /> Play
                    </button>
                    <button 
                        onClick={handleInfo}
                        style={{
                            padding: isMobile ? '6px 15px' : '8px 22px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: '1px solid rgba(211, 82, 255, 0.4)',
                            background: 'rgba(10, 6, 20, 0.8)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <InfoOutlinedIcon fontSize="small" /> More Info
                    </button>
                </div>
            </div>

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
                            color: '#fff',
                            borderRadius: '50%',
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
                            color: '#fff',
                            borderRadius: '50%',
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

/* ==========================================================================
   Zaflix Netflix-style Studio Filter Chips Component (Optimized)
   ========================================================================== */
const NetworkSelector = () => {
    const { __legacyApiClient__: apiClient } = useApi();
    const { isMobile } = useMediaQuery();
    const networks = [
        { name: 'Netflix' },
        { name: 'Disney+' },
        { name: 'Hulu' },
        { name: 'HBO' },
        { name: 'Prime Video' },
        { name: 'Apple TV+' }
    ];

    const handleNetworkClick = (networkName: string) => {
        if (!apiClient) return;
        
        apiClient.getItems(apiClient.getCurrentUserId(), {
            IncludeItemTypes: 'Studio',
            SearchTerm: networkName,
            Recursive: true
        }).then((result: any) => {
            if (result && result.Items && result.Items.length > 0) {
                const studio = result.Items[0];
                Dashboard.navigate(`details?id=${studio.Id}&serverId=${apiClient.serverId()}`);
            } else {
                Dashboard.navigate(`search?query=${encodeURIComponent(networkName)}`);
            }
        }).catch(() => {
            Dashboard.navigate(`search?query=${encodeURIComponent(networkName)}`);
        });
    };

    return (
        <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            padding: '5px 0 15px 0',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            textAlign: 'left'
        }}>
            {networks.map((net) => (
                <button
                    key={net.name}
                    onClick={() => handleNetworkClick(net.name)}
                    style={{
                        flex: '0 0 auto',
                        padding: isMobile ? '6px 14px' : '8px 18px',
                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        background: '#140d27',
                        border: '1.5px solid rgba(211, 82, 255, 0.25)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#c26df0';
                        e.currentTarget.style.boxShadow = `0 0 12px rgba(194, 109, 240, 0.4)`;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(211, 82, 255, 0.25)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    {net.name}
                </button>
            ))}
        </div>
    );
};

/* ==========================================================================
   Zaflix Media Row Carousel Component with Landscape Backdrops
   ========================================================================== */
interface MediaRowProps {
    title: string;
    query: any;
    isTop10?: boolean;
}
const MediaRow: React.FC<MediaRowProps> = ({ title, query, isTop10 }) => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [items, setItems] = useState<any[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);

    const queryString = JSON.stringify(query);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;

        const cacheKey = `${user.Id}_${title}_${queryString}`;
        if (apiCache.has(cacheKey)) {
            setItems(apiCache.get(cacheKey));
            return;
        }

        const parsedQuery = JSON.parse(queryString);

        apiClient.getItems(user.Id, {
            ...parsedQuery,
            Fields: 'Overview,CommunityRating,ProductionYear,UserData,ImageTags'
        }).then((result: any) => {
            if (result && result.Items) {
                apiCache.set(cacheKey, result.Items);
                setItems(result.Items);
            }
        }).catch((err: any) => {
            console.error(`[MediaRow] failed to fetch row: ${title}`, err);
            if (err && (err.status === 401 || err.statusCode === 401)) {
                window.location.reload();
            }
        });
    }, [apiClient, user, queryString, title]);

    const scroll = (direction: 'left' | 'right') => {
        const container = rowRef.current;
        if (!container) return;

        const scrollAmount = container.clientWidth * 0.8;
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (direction === 'left') {
            if (container.scrollLeft <= 5) {
                container.scrollTo({
                    left: maxScroll,
                    behavior: 'smooth'
                });
            } else {
                container.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
            }
        } else {
            if (container.scrollLeft >= maxScroll - 5) {
                container.scrollTo({
                    left: 0,
                    behavior: 'smooth'
                });
            } else {
                container.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            }
        }
    };

    // Use 2:3 Portrait Aspect Ratio Card Widths (from user screenshots)
    const cardWidth = isMobile ? '105px' : isTablet ? '135px' : '150px';

    if (items.length === 0) {
        return (
            <div style={{ marginBottom: '30px', position: 'relative', textAlign: 'left' }}>
                <h2 style={{
                    fontSize: isMobile ? '1.15rem' : '1.35rem',
                    color: '#fff',
                    marginBottom: '10px',
                    paddingLeft: '2px',
                    fontWeight: 700,
                    textShadow: '0 0 10px rgba(211, 82, 255, 0.25)'
                }}>{title}</h2>
                
                <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden', padding: '8px 2px' }}>
                    {[1, 2, 3, 4, 5].map((idx) => (
                        <div 
                            key={idx}
                            style={{
                                flex: '0 0 auto',
                                width: cardWidth,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid rgba(211, 82, 255, 0.08)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                background: '#140d27',
                                position: 'relative',
                                paddingTop: '150%'
                            }}
                            className="skeleton-card"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ marginBottom: '30px', position: 'relative', textAlign: 'left' }}
        >
            <h2 style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                color: '#fff',
                marginBottom: '10px',
                paddingLeft: '2px',
                fontWeight: 700,
                textShadow: '0 0 10px rgba(211, 82, 255, 0.25)'
            }}>{title}</h2>
            
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
                            color: '#fff',
                            width: '45px',
                            cursor: 'pointer',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.3s ease, background 0.2s ease',
                            borderTopLeftRadius: '8px',
                            borderBottomLeftRadius: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.45)'}
                    >
                        <ChevronLeftIcon fontSize="large" />
                    </button>
                )}

                <div 
                    ref={rowRef}
                    style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        scrollBehavior: 'smooth',
                        padding: '8px 2px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {items.map((item, index) => {
                        // Fetch Primary image for Portrait layout
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
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: isTop10 ? `calc(${cardWidth} + 45px)` : cardWidth,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
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
                                        color: '#0a0614',
                                        WebkitTextStroke: '2.5px rgba(211, 82, 255, 0.65)',
                                        textShadow: '0 0 20px rgba(211, 82, 255, 0.4)',
                                        lineHeight: '1',
                                        marginRight: '-15px',
                                        zIndex: 2,
                                        userSelect: 'none',
                                        fontFamily: 'Outfit, sans-serif'
                                    }}>
                                        {index + 1}
                                    </div>
                                )}
                                <div style={{
                                    position: 'relative',
                                    flex: 1,
                                    paddingTop: '150%', // 2:3 Aspect Ratio
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(211, 82, 255, 0.15)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                    background: '#140d27'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundImage: `url(${imageUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }} />

                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'linear-gradient(to top, rgba(10, 6, 20, 0.5) 0%, rgba(10, 6, 20, 0) 40%)',
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
                            color: '#fff',
                            width: '45px',
                            cursor: 'pointer',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.3s ease, background 0.2s ease',
                            borderTopRightRadius: '8px',
                            borderBottomRightRadius: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(10, 6, 20, 0.45)'}
                    >
                        <ChevronRightIcon fontSize="large" />
                    </button>
                )}
            </div>
        </div>
    );
};

/* ==========================================================================
   Zaflix Movie/TV Show Details Modal with Season Dropdown (Optimized)
   ========================================================================== */
interface DetailsModalProps {
    item: any;
    onClose: () => void;
}
const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose }) => {
    const { __legacyApiClient__: apiClient, api, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [similarItems, setSimilarItems] = useState<any[]>([]);
    const [parentCollections, setParentCollections] = useState<any[]>([]);
    const [adminMenuAnchor, setAdminMenuAnchor] = useState<boolean>(false);
    const [collectionItems, setCollectionItems] = useState<any[]>([]);
    const [isFavorite, setIsFavorite] = useState<boolean>(item.UserData?.IsFavorite || false);

    useEffect(() => {
        if (!apiClient || !user || !user.Id || item.Type !== 'BoxSet') return;

        apiClient.getItems(user.Id, {
            ParentId: item.Id,
            Fields: 'Overview,CommunityRating,ProductionYear,UserData,ImageTags'
        }).then((res: any) => {
            if (res && Array.isArray(res.Items)) {
                setCollectionItems(res.Items);
            } else if (Array.isArray(res)) {
                setCollectionItems(res);
            }
        }).catch(err => console.error('[DetailsModal] failed to fetch collection items', err));
    }, [apiClient, user, item]);

    useEffect(() => {
        if (!api || !user || !user.Id || item.Type === 'BoxSet') return;

        getLibraryApi(api)
            .getItemCollections({
                itemId: item.Id,
                userId: user.Id,
                fields: [ItemFields.PrimaryImageAspectRatio]
            })
            .then((res: any) => {
                const fetchedCollections = res.data?.Items || [];
                setParentCollections(fetchedCollections);
            }).catch(err => console.error('[DetailsModal] failed to fetch parent collections via SDK', err));
    }, [api, user, item]);

    // Fetch seasons if TV show
    useEffect(() => {
        if (!apiClient || !user || !user.Id || item.Type !== 'Series') return;

        apiClient.getSeasons(item.Id, { userId: user.Id })
            .then((res: any) => {
                if (res && Array.isArray(res.Items)) {
                    setSeasons(res.Items);
                    if (res.Items.length > 0) {
                        setSelectedSeasonId(res.Items[0].Id);
                    }
                } else if (Array.isArray(res)) {
                    setSeasons(res);
                    if (res.length > 0) {
                        setSelectedSeasonId(res[0].Id);
                    }
                }
            }).catch(err => console.error('[DetailsModal] failed to load seasons', err));
    }, [apiClient, user, item]);

    // Fetch episodes when selected season changes
    useEffect(() => {
        if (!apiClient || !user || !user.Id || !selectedSeasonId) return;

        apiClient.getEpisodes(item.Id, { seasonId: selectedSeasonId, userId: user.Id, Fields: 'Overview' })
            .then((res: any) => {
                if (res && Array.isArray(res.Items)) {
                    setEpisodes(res.Items);
                } else if (Array.isArray(res)) {
                    setEpisodes(res);
                }
            }).catch(err => console.error('[DetailsModal] failed to load episodes', err));
    }, [apiClient, user, selectedSeasonId, item]);

    // Fetch similar items (More Like This)
    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;

        apiClient.getJSON(apiClient.getUrl(`Items/${item.Id}/Similar?limit=6&userId=${user.Id}`))
            .then((res: any) => {
                if (res && Array.isArray(res.Items)) {
                    setSimilarItems(res.Items);
                } else if (Array.isArray(res)) {
                    setSimilarItems(res);
                }
            }).catch(err => console.error('[DetailsModal] failed to load similar items', err));
    }, [apiClient, user, item]);

    const handleToggleFavorite = () => {
        if (!apiClient || !user || !user.Id) return;
        const newFav = !isFavorite;
        setIsFavorite(newFav);
        apiClient.updateFavoriteStatus(user.Id!, item.Id, newFav)
            .catch((err: any) => {
                console.error('[DetailsModal] failed to update favorite status', err);
                setIsFavorite(!newFav);
            });
    };

    const handlePlay = (mediaId = item.Id) => {
        if (!apiClient) return;
        let playId = mediaId;
        if (item.Type === 'BoxSet' && collectionItems.length > 0) {
            playId = collectionItems[0].Id;
        }
        playbackManager.play({
            ids: [playId],
            serverId: apiClient.serverId()
        });
        onClose();
    };

    const backdropUrl = apiClient ? apiClient.getUrl(`Items/${item.Id}/Images/Backdrop/0?quality=90`) : '';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 3, 10, 0.94)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: isMobile ? '10px' : '20px',
            animation: 'zaflixFadeIn 0.3s ease forwards'
        }}>
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '820px',
                height: '92vh',
                backgroundColor: '#0a0614',
                borderRadius: '12px',
                border: '1px solid rgba(211, 82, 255, 0.25)',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(211, 82, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                scrollbarWidth: 'none'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'rgba(10, 6, 20, 0.75)',
                        border: '1px solid rgba(211, 82, 255, 0.3)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <CloseIcon />
                </button>

                {/* Hero Banner Backdrop */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: isMobile ? '200px' : '300px',
                    flexShrink: 0
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${backdropUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 20%'
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to top, #0a0614 0%, rgba(10, 6, 20, 0.2) 80%, rgba(10, 6, 20, 0) 100%)'
                    }} />

                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '5%',
                        zIndex: 15,
                        display: 'flex',
                        gap: '15px',
                        alignItems: 'center'
                    }}>
                        <button 
                            onClick={() => handlePlay()}
                            style={{
                                padding: '8px 24px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #00f0ff 0%, #d352ff 100%)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(211, 82, 255, 0.4)'
                            }}
                        >
                            <PlayArrowIcon /> Play
                        </button>

                        <button 
                            onClick={handleToggleFavorite}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                border: '1px solid rgba(211, 82, 255, 0.4)',
                                background: 'rgba(10, 6, 20, 0.75)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '38px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {isFavorite ? <FavoriteIcon style={{ color: '#ff2d55' }} /> : <FavoriteBorderIcon />}
                            {isFavorite ? 'My List' : 'Add to List'}
                        </button>

                        {user?.Policy?.IsAdministrator && (
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setAdminMenuAnchor(!adminMenuAnchor)}
                                    style={{
                                        background: 'rgba(10, 6, 20, 0.75)',
                                        border: '1px solid rgba(211, 82, 255, 0.4)',
                                        color: '#fff',
                                        borderRadius: '50%',
                                        width: '38px',
                                        height: '38px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <MoreHorizIcon />
                                </button>
                                {adminMenuAnchor && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '45px',
                                        left: 0,
                                        background: '#0f0a1e',
                                        border: '1px solid rgba(211, 82, 255, 0.3)',
                                        borderRadius: '6px',
                                        padding: '5px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        zIndex: 20,
                                        minWidth: '130px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                    }}>
                                        <button 
                                            onClick={() => {
                                                setAdminMenuAnchor(false);
                                                import('../../../components/metadataEditor/metadataEditor').then(({ default: metadataEditor }) => {
                                                    metadataEditor.show(item.Id, apiClient?.serverId() || '');
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '8px 15px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(211, 82, 255, 0.15)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Edit Metadata
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setAdminMenuAnchor(false);
                                                import('../../../components/imageeditor/imageeditor').then((imageEditor) => {
                                                    imageEditor.show({
                                                        itemId: item.Id,
                                                        serverId: apiClient?.serverId() || ''
                                                    });
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '8px 15px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(211, 82, 255, 0.15)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Edit Images
                                        </button>
                                        {(item.Type === 'Movie' || item.Type === 'Series') && (
                                            <button 
                                                onClick={() => {
                                                    setAdminMenuAnchor(false);
                                                    import('../../../components/itemidentifier/itemidentifier').then((itemIdentifier) => {
                                                        itemIdentifier.show(item.Id, apiClient?.serverId() || '');
                                                    });
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#fff',
                                                    padding: '8px 15px',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(211, 82, 255, 0.15)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                Identify
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Information */}
                <div style={{ padding: '25px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '25px', flexDirection: isMobile ? 'column' : 'row' }}>
                        {!isMobile && (
                            <div style={{
                                width: '150px',
                                height: '225px',
                                flexShrink: 0,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid rgba(211, 82, 255, 0.2)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.6)'
                            }}>
                                <img 
                                    src={apiClient?.getUrl(`Items/${item.Id}/Images/Primary?quality=90`) || ''} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                                    alt={item.Name}
                                />
                            </div>
                        )}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                    src={apiClient?.getUrl(`Items/${item.Id}/Images/Logo?maxHeight=80`) || ''} 
                                    style={{
                                        maxHeight: isMobile ? '50px' : '75px',
                                        maxWidth: '90%',
                                        objectFit: 'contain',
                                        alignSelf: 'flex-start',
                                        marginBottom: '5px'
                                    }} 
                                    alt={item.Name} 
                                />
                            ) : (
                                <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', margin: 0, fontWeight: 800 }}>{item.Name}</h1>
                            )}
                            
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.9rem', color: '#dcd9fd' }}>
                                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                {item.CommunityRating && (
                                    <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>
                                        ★ {item.CommunityRating.toFixed(1)}
                                    </span>
                                )}
                                {item.Genres && item.Genres.slice(0, 3).map((g: string) => (
                                    <span key={g} style={{
                                        padding: '2px 8px',
                                        background: 'rgba(211, 82, 255, 0.12)',
                                        border: '1px solid rgba(211, 82, 255, 0.25)',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>{g}</span>
                                ))}
                            </div>

                            <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#dcd9fd', margin: 0 }}>{item.Overview}</p>
                        </div>
                    </div>

                    {/* TV Show Episodes Section */}
                    {item.Type === 'Series' && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(211, 82, 255, 0.2)',
                                paddingBottom: '12px',
                                marginBottom: '15px'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Episodes</h3>
                                
                                {/* Custom Styled Dropdown */}
                                <select 
                                    value={selectedSeasonId}
                                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                                    style={{
                                        background: '#140d27',
                                        color: '#fff',
                                        border: '1px solid rgba(211, 82, 255, 0.4)',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {seasons.map((s) => (
                                        <option key={s.Id} value={s.Id}>{s.Name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Episode List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {episodes.map((ep, idx) => (
                                    <div 
                                        key={ep.Id}
                                        onClick={() => handlePlay(ep.Id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            background: 'rgba(20, 13, 39, 0.3)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(194, 109, 240, 0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 13, 39, 0.3)'}
                                    >
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#c26df0', width: '25px', textAlign: 'center' }}>
                                            {idx + 1}
                                        </span>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff' }}>
                                                {ep.Name}
                                            </div>
                                            {ep.Overview && (
                                                <p style={{ 
                                                    margin: '4px 0 0 0', 
                                                    fontSize: '0.85rem', 
                                                    color: '#dcd9fd',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
                                                    {ep.Overview}
                                                </p>
                                            )}
                                        </div>
                                        <PlayArrowIcon style={{ color: '#c26df0' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Movies inside this Collection (for BoxSet items) */}
                    {item.Type === 'BoxSet' && collectionItems.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <h3 style={{
                                borderBottom: '1px solid rgba(211, 82, 255, 0.2)',
                                paddingBottom: '12px',
                                marginBottom: '15px',
                                fontSize: '1.25rem',
                                fontWeight: 700
                            }}>Movies in this Collection</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                                gap: '15px'
                            }}>
                                {collectionItems.map((colItem: any) => {
                                    const colItemPoster = apiClient 
                                        ? (colItem.BackdropImageTags && colItem.BackdropImageTags.length > 0
                                            ? apiClient.getUrl(`Items/${colItem.Id}/Images/Backdrop/0?quality=80`)
                                            : apiClient.getUrl(`Items/${colItem.Id}/Images/Primary?quality=80`))
                                        : '';
                                    return (
                                        <div 
                                            key={colItem.Id}
                                            onClick={() => {
                                                Events.trigger(document, 'open-zaflix-details', [colItem]);
                                            }}
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '56.25%',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                                backgroundImage: `url(${colItemPoster})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundColor: '#140d27'
                                            }} />
                                            <div style={{
                                                marginTop: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                textAlign: 'left',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {colItem.Name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* More Like This (Similar Recommendations) */}
                    {/* Belongs to Collection Section */}
                    {parentCollections.length > 0 && (
                        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                            <h3 style={{
                                borderBottom: '1px solid rgba(211, 82, 255, 0.2)',
                                paddingBottom: '12px',
                                marginBottom: '15px',
                                fontSize: '1.25rem',
                                fontWeight: 700
                            }}>Part of Collection</h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                {parentCollections.map((col: any) => {
                                    const colUrl = apiClient?.getUrl(`Items/${col.Id}/Images/Primary?quality=90`) || '';
                                    return (
                                        <div 
                                            key={col.Id}
                                            onClick={() => {
                                                Events.trigger(document, 'open-zaflix-details', [col]);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: 'rgba(211, 82, 255, 0.08)',
                                                border: '1px solid rgba(211, 82, 255, 0.25)',
                                                borderRadius: '8px',
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(211, 82, 255, 0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(211, 82, 255, 0.4)';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(211, 82, 255, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(211, 82, 255, 0.25)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {colUrl && (
                                                <img 
                                                    src={colUrl} 
                                                    style={{ width: '40px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} 
                                                    alt={col.Name} 
                                                />
                                            )}
                                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff' }}>{col.Name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {similarItems.length > 0 && (
                        <div style={{ marginTop: '25px' }}>
                            <h3 style={{
                                borderBottom: '1px solid rgba(211, 82, 255, 0.2)',
                                paddingBottom: '12px',
                                marginBottom: '15px',
                                fontSize: '1.25rem',
                                fontWeight: 700
                            }}>More Like This</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                                gap: '15px'
                            }}>
                                {similarItems.map((similarItem) => {
                                    const similarPoster = apiClient 
                                        ? (similarItem.BackdropImageTags && similarItem.BackdropImageTags.length > 0
                                            ? apiClient.getUrl(`Items/${similarItem.Id}/Images/Backdrop/0?quality=80`)
                                            : apiClient.getUrl(`Items/${similarItem.Id}/Images/Primary?quality=80`))
                                        : '';
                                    return (
                                        <div 
                                            key={similarItem.Id}
                                            onClick={() => {
                                                // Switch modal to this item
                                                Events.trigger(document, 'open-zaflix-details', [similarItem]);
                                            }}
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '56.25%',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                                backgroundImage: `url(${similarPoster})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundColor: '#140d27'
                                            }} />
                                            <div style={{
                                                marginTop: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                textAlign: 'left',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {similarItem.Name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   Home Main Layout View
   ========================================================================== */
const Home = () => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const [movieLibraryId, setMovieLibraryId] = useState<string | null>(null);
    const [showLibraryId, setShowLibraryId] = useState<string | null>(null);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;
        apiClient.getJSON(apiClient.getUrl('UserViews?userId=' + user.Id))
            .then((res: any) => {
                if (res && res.Items) {
                    const movies = res.Items.find((i: any) => i.CollectionType === 'movies');
                    const tvshows = res.Items.find((i: any) => i.CollectionType === 'tvshows');
                    if (movies) setMovieLibraryId(movies.Id);
                    if (tvshows) setShowLibraryId(tvshows.Id);
                }
            }).catch(err => console.error('[Home] failed to load user views', err));
    }, [apiClient, user]);

    const [ searchParams ] = useSearchParams();
    const initialTabIndex = parseInt(searchParams.get('tab') ?? '0', 10);
    const [categoryFilter, setCategoryFilter] = useState<'home' | 'movies' | 'shows' | 'mylist' | 'collections' | 'anime'>('home');
    const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
    const { isMobile } = useMediaQuery();

    const libraryMenu = useMemo(async () => ((await import('../../../scripts/libraryMenu')).default), []);
    const mainTabsManager = useMemo(() => import('../../../components/maintabsmanager'), []);
    const tabController = useRef<ControllerProps | null>();
    const tabControllers = useMemo<ControllerProps[]>(() => [], []);

    const documentRef = useRef<Document>(document);
    const element = useRef<HTMLDivElement>(null);

    const setTitle = async () => {
        (await libraryMenu).setTitle(null);
    };

    const getTabs = () => {
        return [
            { name: 'Home' },
            { name: 'Movies' },
            { name: 'TV Shows' },
            { name: 'My List' },
            { name: 'Collections' },
            { name: 'Anime' }
        ];
    };

    const getTabContainers = () => {
        return element.current?.querySelectorAll('.tabContent');
    };

    const getTabController = useCallback((index: number) => {
        if (index == null) {
            throw new Error('index cannot be null');
        }

        let depends = '';

        switch (index) {
            case 0:
                depends = 'hometab';
                break;

            case 1:
                depends = 'favorites';
        }

        return import(/* webpackChunkName: "[request]" */ `../../../apps/legacy/controllers/${depends}`).then(({ default: ControllerFactory }) => {
            let controller = tabControllers[index];

            if (!controller) {
                const tabContent = element.current?.querySelector(".tabContent[data-index='" + index + "']");
                controller = new ControllerFactory(tabContent, null);
                tabControllers[index] = controller;
            }

            return controller;
        });
    }, [ tabControllers ]);

    const loadTab = useCallback((index: number, previousIndex: number | null) => {
        // React handle tab routing, no legacy controller resume needed
    }, []);

    const onTabChange = useCallback((e: { detail: { selectedTabIndex: string; previousIndex: number | null }; }) => {
        const newIndex = parseInt(e.detail.selectedTabIndex, 10);
        const categories: typeof categoryFilter[] = ['home', 'movies', 'shows', 'mylist', 'collections', 'anime'];
        setCategoryFilter(categories[newIndex]);
    }, []);

    const onSetTabs = useCallback(async () => {
        (await mainTabsManager).setTabs(element.current, initialTabIndex, getTabs, getTabContainers, null, onTabChange, false);
    }, [ initialTabIndex, mainTabsManager, onTabChange ]);

    const onResume = useCallback(async () => {
        void setTitle();
        clearBackdrop();

        const currentTabController = tabController.current;

        if (!currentTabController) {
            (await mainTabsManager).selectedTabIndex(initialTabIndex);
        } else if (currentTabController?.onResume) {
            currentTabController.onResume({});
        }
        (documentRef.current.querySelector('.skinHeader') as HTMLDivElement).classList.add('noHomeButtonHeader');
    }, [ initialTabIndex, mainTabsManager ]);

    const onPause = useCallback(() => {
        const currentTabController = tabController.current;
        if (currentTabController?.onPause) {
            currentTabController.onPause();
        }
        (documentRef.current.querySelector('.skinHeader') as HTMLDivElement).classList.remove('noHomeButtonHeader');
    }, []);

    const renderHome = useCallback(() => {
        void onSetTabs();
        void onResume();
    }, [ onResume, onSetTabs ]);

    useEffect(() => {
        if (documentRef.current?.querySelector('.headerTabs')) {
            renderHome();
        }

        return () => {
            onPause();
        };
    }, [onPause, renderHome]);

    useEffect(() => {
        const doc = documentRef.current;
        if (doc) Events.on(doc, EventType.HEADER_RENDERED, renderHome);

        return () => {
            if (doc) Events.off(doc, EventType.HEADER_RENDERED, renderHome);
        };
    }, [ renderHome ]);

    // Details Modal custom event triggers
    useEffect(() => {
        const handleOpenDetails = (e: any, itemDetail: any) => {
            setSelectedDetailItem(itemDetail);
        };
        Events.on(document, 'open-zaflix-details', handleOpenDetails);
        return () => {
            Events.off(document, 'open-zaflix-details', handleOpenDetails);
        };
    }, []);

    // Helper to render Category Filter Bar
    const renderCategoryBar = () => {
        const categories: { id: typeof categoryFilter; label: string }[] = [
            { id: 'home', label: 'Home' },
            { id: 'movies', label: 'Movies' },
            { id: 'shows', label: 'TV Shows' },
            { id: 'mylist', label: 'My List' },
            { id: 'collections', label: 'Collections' },
            { id: 'anime', label: 'Anime' }
        ];

        return (
            <div style={{
                display: 'flex',
                gap: isMobile ? '15px' : '22px',
                marginBottom: '15px',
                borderBottom: '1px solid rgba(211, 82, 255, 0.15)',
                paddingBottom: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
            }}>
                {categories.map((cat) => (
                    <span
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        style={{
                            fontSize: isMobile ? '0.95rem' : '1.05rem',
                            fontWeight: categoryFilter === cat.id ? 'bold' : 'normal',
                            color: categoryFilter === cat.id ? '#c26df0' : '#dcd9fd',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            borderBottom: categoryFilter === cat.id ? '2.5px solid #c26df0' : 'none',
                            paddingBottom: '4px',
                            whiteSpace: 'nowrap',
                            textShadow: categoryFilter === cat.id ? '0 0 10px rgba(194, 109, 240, 0.4)' : 'none'
                        }}
                    >
                        {cat.label}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div ref={element}>
            {/* Inject Global CSS Keyframe Animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes zaflixFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .zaflix-fade-in {
                    animation: zaflixFadeIn 0.5s ease forwards;
                }
                /* Hide scrollbars globally for sliders */
                div::-webkit-scrollbar {
                    display: none !important;
                }
                /* Glassmorphic Top Navigation Header bar style matching Netflix */
                .skinHeader-withBackground {
                    background: rgba(10, 6, 20, 0.55) !important;
                    backdrop-filter: blur(25px) !important;
                    -webkit-backdrop-filter: blur(25px) !important;
                    border-bottom: 1.5px solid rgba(211, 82, 255, 0.12) !important;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.6) !important;
                }
                /* Style the top header tab items */
                .headerTabs {
                    background: none !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .headerTabButton {
                    font-weight: bold !important;
                    font-size: 0.95rem !important;
                    color: #dcd9fd !important;
                    transition: color 0.2s ease, text-shadow 0.2s ease !important;
                }
                .headerTabButton-active {
                    color: #c26df0 !important;
                    text-shadow: 0 0 10px rgba(194, 109, 240, 0.6) !important;
                    border-bottom: 2.5px solid #c26df0 !important;
                }
                /* Skeleton Loader Shimmer */
                @keyframes skeletonShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .skeleton-card {
                    background: linear-gradient(90deg, #140d27 25%, #23173f 50%, #140d27 75%);
                    background-size: 200% 100%;
                    animation: skeletonShimmer 1.5s infinite linear;
                }
            `}} />

            <Page
                id='indexPage'
                className='mainAnimatedPage homePage libraryPage allLibraryPage pageWithAbsoluteTabs withTabs'
                isBackButtonEnabled={false}
                backDropType={[
                    BaseItemKind.Movie,
                    BaseItemKind.Series,
                    BaseItemKind.Book
                ]}
            >
                <div className='tabContent pageTabContent' id='homeTab' data-index='0'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'home' && (
                            <>
                                <Billboard />
                                <NetworkSelector />
                                <MediaRow title="Continue Watching" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 10, Recursive: true, Filters: 'IsNotFolder', ImageTypes: 'Primary' }} />
                                <MediaRow title="Suggested for You" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie,Series', Recursive: true }} />
                                <MediaRow title="My List" query={{ Filters: 'IsFavorite', Limit: 12, Recursive: true }} />
                                <MediaRow title="Featured Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true }} />
                                <MediaRow title="Top 10 Movies" query={{ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Top 10 TV Shows" query={{ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Top 10 Anime" query={{ Genres: 'Anime', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Recently Added Movies" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="Recently Added TV Shows" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                            </>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='moviesTab' data-index='1'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'movies' && (
                            <>
                                <Billboard filterType="Movie" />
                                <NetworkSelector />
                                <MediaRow title="Continue Watching" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 10, Recursive: true, Filters: 'IsNotFolder', ImageTypes: 'Primary', IncludeItemTypes: 'Movie' }} />
                                <MediaRow title="Top 10 Movies" query={{ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Suggested Movies" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="Movie Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true }} />
                                <MediaRow title="Recently Added Movies" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="All Movies" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Movie', Recursive: true }} />
                                {movieLibraryId && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
                                        <button 
                                            onClick={() => Dashboard.navigate(`movies?topParentId=${movieLibraryId}&collectionType=movies`)}
                                            style={{
                                                padding: '12px 35px',
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                color: '#fff',
                                                background: 'linear-gradient(135deg, rgba(211, 82, 255, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
                                                border: '1.5px solid rgba(211, 82, 255, 0.4)',
                                                borderRadius: '30px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)',
                                                transition: 'all 0.3s ease',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.borderColor = '#00f0ff';
                                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.borderColor = 'rgba(211, 82, 255, 0.4)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)';
                                            }}
                                        >
                                            See All Movies
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='showsTab' data-index='2'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'shows' && (
                            <>
                                <Billboard filterType="Series" />
                                <NetworkSelector />
                                <MediaRow title="Continue Watching" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 10, Recursive: true, Filters: 'IsNotFolder', ImageTypes: 'Primary', IncludeItemTypes: 'Series' }} />
                                <MediaRow title="Top 10 TV Shows" query={{ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Suggested TV Shows" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="Recently Added TV Shows" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="All TV Shows" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Series', Recursive: true }} />
                                {showLibraryId && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
                                        <button 
                                            onClick={() => Dashboard.navigate(`tv?topParentId=${showLibraryId}&collectionType=tvshows`)}
                                            style={{
                                                padding: '12px 35px',
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                color: '#fff',
                                                background: 'linear-gradient(135deg, rgba(211, 82, 255, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
                                                border: '1.5px solid rgba(211, 82, 255, 0.4)',
                                                borderRadius: '30px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)',
                                                transition: 'all 0.3s ease',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.borderColor = '#00f0ff';
                                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.borderColor = 'rgba(211, 82, 255, 0.4)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)';
                                            }}
                                        >
                                            See All TV Shows
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='mylistTab' data-index='3'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'mylist' && (
                            <MediaRow title="My Favorites List" query={{ Filters: 'IsFavorite', Limit: 30, Recursive: true }} />
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='collectionsTab' data-index='4'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'collections' && (
                            <MediaRow title="My Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 30, Recursive: true }} />
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='animeTab' data-index='5'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'anime' && (
                            <MediaRow title="Anime Movies & Shows" query={{ Genres: 'Anime', Limit: 30, Recursive: true }} />
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>
            </Page>

            {/* Custom Details Overlay Modal */}
            {selectedDetailItem && (
                <DetailsModal 
                    item={selectedDetailItem}
                    onClose={() => setSelectedDetailItem(null)}
                />
            )}
        </div>
    );
};

export default Home;
