import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { clearBackdrop } from '../../../components/backdrop/backdrop';
import Page from '../../../components/Page';
import { EventType } from 'constants/eventType';
import Events from 'utils/events';

import '../../../elements/emby-tabs/emby-tabs';
import '../../../elements/emby-button/emby-button';
import '../../../elements/emby-scroller/emby-scroller';

import { useUserViews } from 'hooks/api/useUserViews';

import Billboard from '../components/Billboard/Billboard';
import DetailsModal from '../components/DetailsModal/DetailsModal';
import MediaRow from '../components/MediaRow/MediaRow';
import NetworkSelector from '../components/NetworkSelector/NetworkSelector';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useResumeItems } from '../hooks/useResumeItems';
import { ZAFlix } from '../styles/theme';
import '../styles/modern.styles.css';

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

const Home = () => {
    const { data: userViews } = useUserViews();
    const { data: resumeItems = [] } = useResumeItems({ limit: 12 });
    const [movieLibraryId, setMovieLibraryId] = useState<string | null>(null);
    const [showLibraryId, setShowLibraryId] = useState<string | null>(null);

    useEffect(() => {
        if (userViews?.Items) {
            const movies = userViews.Items.find((i: any) => i.CollectionType === 'movies');
            const tvshows = userViews.Items.find((i: any) => i.CollectionType === 'tvshows');
            if (movies) setMovieLibraryId(movies.Id ?? null);
            if (tvshows) setShowLibraryId(tvshows.Id ?? null);
        }
    }, [userViews]);

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
        const handleOpenDetails = (_e: any, itemDetail: any) => {
            setSelectedDetailItem(itemDetail);
        };
        Events.on(document, 'open-zaflix-details', handleOpenDetails);
        return () => {
            Events.off(document, 'open-zaflix-details', handleOpenDetails);
        };
    }, []);

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
                borderBottom: `1px solid ${ZAFlix.colors.borderSubtle}`,
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
                            color: categoryFilter === cat.id ? ZAFlix.colors.accent : ZAFlix.colors.textSecondary,
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            borderBottom: categoryFilter === cat.id ? `2.5px solid ${ZAFlix.colors.accent}` : 'none',
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

    const seeAllButtonStyle: React.CSSProperties = {
        padding: '12px 35px',
        fontSize: '1rem',
        fontWeight: 'bold',
        color: ZAFlix.colors.textPrimary,
        background: ZAFlix.gradients.accentSoft,
        border: `1.5px solid ${ZAFlix.colors.borderHover}`,
        borderRadius: '30px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)',
        transition: 'all 0.3s ease',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px'
    };

    return (
        <div ref={element}>
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
                            <div className='zaflix-stagger-fade-in'>
                                <Billboard />
                                <NetworkSelector />
                                {resumeItems.length > 0 && <MediaRow title="Continue Watching" itemsOverride={resumeItems} />}
                                <MediaRow title="Suggested for You" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie,Series', Recursive: true }} />
                                <MediaRow title="My List" query={{ Filters: 'IsFavorite', Limit: 12, Recursive: true }} />
                                <MediaRow title="Featured Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true }} />
                                <MediaRow title="Top 10 Movies" query={{ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Top 10 TV Shows" query={{ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Top 10 Anime" query={{ Genres: 'Anime', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Recently Added Movies" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="Recently Added TV Shows" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='moviesTab' data-index='1'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'movies' && (
                            <div className='zaflix-stagger-fade-in'>
                                <Billboard filterType="Movie" />
                                <NetworkSelector />
                                <MediaRow title="Continue Watching" itemsOverride={resumeItems.filter((i: any) => i.Type === 'Movie')} />
                                <MediaRow title="Top 10 Movies" query={{ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Suggested Movies" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="Movie Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true }} />
                                <MediaRow title="Recently Added Movies" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true }} />
                                <MediaRow title="All Movies" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Movie', Recursive: true }} />
                                {movieLibraryId && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
                                        <button
                                            onClick={() => {
                                                import('utils/dashboard').then(({ default: Dashboard }) => {
                                                    Dashboard.navigate(`movies?topParentId=${movieLibraryId}&collectionType=movies`);
                                                });
                                            }}
                                            style={seeAllButtonStyle}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.cyan;
                                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.borderHover;
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)';
                                            }}
                                        >
                                            See All Movies
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='showsTab' data-index='2'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'shows' && (
                            <div className='zaflix-stagger-fade-in'>
                                <Billboard filterType="Series" />
                                <NetworkSelector />
                                <MediaRow title="Continue Watching" itemsOverride={resumeItems.filter((i: any) => i.Type === 'Series' || i.Type === 'Episode')} />
                                <MediaRow title="Top 10 TV Shows" query={{ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true }} isTop10={true} />
                                <MediaRow title="Suggested TV Shows" query={{ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="Recently Added TV Shows" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true }} />
                                <MediaRow title="All TV Shows" query={{ SortBy: 'SortName', SortOrder: 'Ascending', Limit: 24, IncludeItemTypes: 'Series', Recursive: true }} />
                                {showLibraryId && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
                                        <button
                                            onClick={() => {
                                                import('utils/dashboard').then(({ default: Dashboard }) => {
                                                    Dashboard.navigate(`tv?topParentId=${showLibraryId}&collectionType=tvshows`);
                                                });
                                            }}
                                            style={seeAllButtonStyle}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.cyan;
                                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.borderHover;
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(211, 82, 255, 0.1)';
                                            }}
                                        >
                                            See All TV Shows
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='mylistTab' data-index='3'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'mylist' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="My Favorites List" query={{ Filters: 'IsFavorite', Limit: 30, Recursive: true }} />
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='collectionsTab' data-index='4'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'collections' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="My Collections" query={{ IncludeItemTypes: 'BoxSet', Limit: 30, Recursive: true }} />
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='animeTab' data-index='5'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'anime' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="Anime Movies & Shows" query={{ Genres: 'Anime', Limit: 30, Recursive: true }} />
                            </div>
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
