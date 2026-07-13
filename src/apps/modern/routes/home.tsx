import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
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

/* ==========================================================================
   Zaflix Video/Photo Billboard Slideshow Component with Clip Playback
   ========================================================================== */
const Billboard = () => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [items, setItems] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playClip, setPlayClip] = useState(false);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;

        apiClient.getItems(user.Id, {
            SortBy: 'DateCreated',
            SortOrder: 'Descending',
            Limit: 15,
            IncludeItemTypes: 'Movie,Series',
            Recursive: true,
            Fields: 'Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres'
        }).then((result: any) => {
            if (result && result.Items) {
                setItems(result.Items.filter((i: any) => i.Overview && i.BackdropImageTags && i.BackdropImageTags.length > 0));
            }
        }).catch((err: any) => {
            console.error('[Billboard] failed to fetch items', err);
        });
    }, [apiClient, user]);

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
                <video 
                    src={streamUrl}
                    autoPlay
                    muted
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
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;
        apiClient.getItems(user.Id, {
            ...query,
            Fields: 'Overview,CommunityRating,ProductionYear,UserData,ImageTags'
        }).then((result: any) => {
            if (result && result.Items) {
                setItems(result.Items);
            }
        }).catch((err: any) => {
            console.error(`[MediaRow] failed to fetch row: ${title}`, err);
        });
    }, [apiClient, user, query, title]);

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

    if (items.length === 0) return null;

    // Use 16:9 Landscape Aspect Ratio Card Widths (from user screenshots)
    const cardWidth = isMobile ? '160px' : isTablet ? '220px' : '260px';

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
            
            <div style={{ position: 'relative', width: '100%' }}>
                {!isMobile && (
                    <button 
                        onClick={() => scroll('left')}
                        style={{
                            position: 'absolute',
                            left: '-10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(10, 6, 20, 0.75)',
                            border: '1px solid rgba(211, 82, 255, 0.3)',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            zIndex: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronLeftIcon fontSize="small" />
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
                        // Fetch Backdrop image for Landscape layout, fallback to Primary
                        const imageUrl = apiClient 
                            ? (item.BackdropImageTags && item.BackdropImageTags.length > 0
                                ? apiClient.getUrl(`Items/${item.Id}/Images/Backdrop/0?quality=90`)
                                : apiClient.getUrl(`Items/${item.Id}/Images/Primary?quality=90`))
                            : '';
                        
                        const handleItemClick = () => {
                            // Trigger Details modal overlay
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
                                    paddingTop: '56.25%', // 16:9 Aspect Ratio
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
                                        background: 'linear-gradient(to top, rgba(10, 6, 20, 0.75) 0%, rgba(10, 6, 20, 0) 50%)',
                                        zIndex: 2
                                    }} />

                                    {/* Logo Image Tag or Text Title Overlay on Card */}
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                        <img 
                                            src={apiClient?.getUrl(`Items/${item.Id}/Images/Logo?maxHeight=40`) || ''} 
                                            style={{
                                                maxHeight: isMobile ? '20px' : '28px',
                                                maxWidth: '85%',
                                                objectFit: 'contain',
                                                position: 'absolute',
                                                bottom: '10px',
                                                left: '10px',
                                                zIndex: 3
                                            }} 
                                            alt={item.Name} 
                                        />
                                    ) : (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            left: '10px',
                                            zIndex: 3,
                                            fontWeight: 'bold',
                                            fontSize: isMobile ? '0.7rem' : '0.8rem',
                                            color: '#fff',
                                            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                                            textAlign: 'left',
                                            maxWidth: '90%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.Name}
                                        </div>
                                    )}
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
                            right: '-10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(10, 6, 20, 0.75)',
                            border: '1px solid rgba(211, 82, 255, 0.3)',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            zIndex: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronRightIcon fontSize="small" />
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
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [similarItems, setSimilarItems] = useState<any[]>([]);

    // Fetch seasons if TV show
    useEffect(() => {
        if (!apiClient || !user || !user.Id || item.Type !== 'Series') return;

        apiClient.getSeasons(item.Id, { userId: user.Id })
            .then((res: any) => {
                if (res && res.Items) {
                    setSeasons(res.Items);
                    if (res.Items.length > 0) {
                        setSelectedSeasonId(res.Items[0].Id);
                    }
                }
            }).catch(err => console.error('[DetailsModal] failed to load seasons', err));
    }, [apiClient, user, item]);

    // Fetch episodes when selected season changes
    useEffect(() => {
        if (!apiClient || !user || !user.Id || !selectedSeasonId) return;

        apiClient.getEpisodes(item.Id, { seasonId: selectedSeasonId, userId: user.Id, Fields: 'Overview' })
            .then((res: any) => {
                if (res && res.Items) {
                    setEpisodes(res.Items);
                }
            }).catch(err => console.error('[DetailsModal] failed to load episodes', err));
    }, [apiClient, user, selectedSeasonId, item]);

    // Fetch similar items (More Like This)
    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;

        apiClient.getJSON(apiClient.getUrl(`Items/${item.Id}/Similar?limit=6&userId=${user.Id}`))
            .then((res: any) => {
                if (res && res.Items) {
                    setSimilarItems(res.Items);
                }
            }).catch(err => console.error('[DetailsModal] failed to load similar items', err));
    }, [apiClient, user, item]);

    const handlePlay = (mediaId = item.Id) => {
        if (!apiClient) return;
        playbackManager.play({
            ids: [mediaId],
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
                        zIndex: 2,
                        display: 'flex',
                        gap: '15px'
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
                    </div>
                </div>

                {/* Detail Information */}
                <div style={{ padding: '25px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
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

                    {/* More Like This (Similar Recommendations) */}
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
        return [{
            name: globalize.translate('Home')
        }, {
            name: globalize.translate('Favorites')
        }];
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
        getTabController(index).then((controller) => {
            const refresh = !controller.refreshed;

            controller.onResume({
                autoFocus: previousIndex == null && layoutManager.tv,
                refresh: refresh
            });

            controller.refreshed = true;
            tabController.current = controller;
        }).catch(err => {
            console.error('[Home] failed to get tab controller', err);
        });
    }, [ getTabController ]);

    const onTabChange = useCallback((e: { detail: { selectedTabIndex: string; previousIndex: number | null }; }) => {
        const newIndex = parseInt(e.detail.selectedTabIndex, 10);
        const previousIndex = e.detail.previousIndex;

        const previousTabController = previousIndex == null ? null : tabControllers[previousIndex];
        if (previousTabController?.onPause) {
            previousTabController.onPause();
        }

        loadTab(newIndex, previousIndex);
    }, [ loadTab, tabControllers ]);

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
                        {renderCategoryBar()}

                        {/* RENDER CATEGORY CONTENTS */}
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

                        {categoryFilter === 'movies' && (
                            <>
                                <MediaRow title="Top Picks Movies" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="Recently Added Movies" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="All Movies" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Movie', Recursive: true }} />
                            </>
                        )}

                        {categoryFilter === 'shows' && (
                            <>
                                <MediaRow title="Top Picks TV Shows" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="Recently Added TV Shows" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="All TV Shows" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Series', Recursive: true }} />
                            </>
                        )}

                        {categoryFilter === 'mylist' && (
                            <MediaRow title="My Favorites List" query={{ Filters: 'IsFavorite', Limit: 30, Recursive: true }} />
                        )}

                        {categoryFilter === 'collections' && (
                            <MediaRow title="My Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 30, Recursive: true }} />
                        )}

                        {categoryFilter === 'anime' && (
                            <MediaRow title="Anime Movies & Shows" query={{ Genres: 'Anime', Limit: 30, Recursive: true }} />
                        )}
                    </div>
                    {/* Hide default sections container */}
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>
                <div className='tabContent pageTabContent' id='favoritesTab' data-index='1'>
                    <div className='sections'></div>
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
