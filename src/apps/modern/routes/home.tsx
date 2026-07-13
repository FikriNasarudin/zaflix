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
   Zaflix Video/Photo Billboard Slideshow Component (Optimized)
   ========================================================================== */
const Billboard = () => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [items, setItems] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

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

    useEffect(() => {
        if (items.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 12000);
        return () => clearInterval(timer);
    }, [items]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const backdropUrl = apiClient ? apiClient.getUrl(`Items/${currentItem.Id}/Images/Backdrop/0?quality=90`) : '';

    const handlePlay = () => {
        if (!apiClient) return;
        playbackManager.play({
            ids: [currentItem.Id],
            serverId: apiClient.serverId()
        });
    };

    const handleInfo = () => {
        if (!apiClient) return;
        Dashboard.navigate(`details?id=${currentItem.Id}&serverId=${apiClient.serverId()}`);
    };

    // Responsive Sizes
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
                boxShadow: '0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(211, 82, 255, 0.15)',
                border: '1px solid rgba(211, 82, 255, 0.2)',
                background: '#140d27',
                transition: 'height 0.3s ease'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${backdropUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                opacity: 0.6,
                transition: 'background-image 0.8s ease'
            }} />
            
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to right, rgba(10, 6, 20, 0.95) 0%, rgba(10, 6, 20, 0.7) 50%, rgba(10, 6, 20, 0) 100%)'
            }} />
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(10, 6, 20, 1) 0%, rgba(10, 6, 20, 0.2) 60%, rgba(10, 6, 20, 0) 100%)'
            }} />

            <div style={{
                position: 'absolute',
                bottom: isMobile ? '8%' : '12%',
                left: '5%',
                width: '90%',
                maxWidth: '650px',
                zIndex: 2,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '8px' : '12px',
                textAlign: 'left'
            }}>
                <h1 style={{
                    fontSize: titleSize,
                    margin: 0,
                    textShadow: '0 0 10px rgba(211, 82, 255, 0.5)',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    lineHeight: 1.1
                }}>{currentItem.Name}</h1>
                
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
                        <InfoOutlinedIcon fontSize="small" /> Info
                    </button>
                </div>
            </div>

            {/* Slider arrows - hide on mobile */}
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
                            zIndex: 2
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
                            zIndex: 2
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
   Zaflix Media Row Carousel Component (Optimized & Responsive)
   ========================================================================== */
interface MediaRowProps {
    title: string;
    query: any;
}
const MediaRow: React.FC<MediaRowProps> = ({ title, query }) => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();
    const [items, setItems] = useState<any[]>([]);
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!apiClient || !user || !user.Id) return;
        apiClient.getItems(user.Id, {
            ...query,
            Fields: 'Overview,CommunityRating,ProductionYear,UserData'
        }).then((result: any) => {
            if (result && result.Items) {
                setItems(result.Items);
            }
        }).catch((err: any) => {
            console.error(`[MediaRow] failed to fetch row: ${title}`, err);
        });
    }, [apiClient, user, query, title]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = rowRef.current.clientWidth * 0.8;
            rowRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (items.length === 0) return null;

    // Responsive Card Sizing
    const cardWidth = isMobile ? '105px' : isTablet ? '135px' : '160px';

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
                {/* Scroll buttons - hide on mobile touch screens */}
                {!isMobile && (
                    <>
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
                    </>
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
                    {items.map((item) => {
                        const posterUrl = apiClient ? apiClient.getUrl(`Items/${item.Id}/Images/Primary?quality=90`) : '';
                        
                        const handleItemClick = () => {
                            if (!apiClient) return;
                            Dashboard.navigate(`details?id=${item.Id}&serverId=${apiClient.serverId()}`);
                        };

                        return (
                            <div 
                                key={item.Id}
                                onClick={handleItemClick}
                                style={{
                                    flex: '0 0 auto',
                                    width: cardWidth,
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
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    paddingTop: '150%', // 2:3 poster aspect ratio
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
                                        backgroundImage: `url(${posterUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }} />
                                </div>
                                <div style={{
                                    marginTop: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    padding: '0 2px'
                                }}>
                                    {item.Name}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!isMobile && (
                    <>
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
                    </>
                )}
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
                                <MediaRow title="Top Picks (Top Rated)" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie,Series', Recursive: true }} />
                                <MediaRow title="Recently Added" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie,Series', Recursive: true }} />
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
        </div>
    );
};

export default Home;
