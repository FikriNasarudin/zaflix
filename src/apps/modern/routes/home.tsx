import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { clearBackdrop } from '../../../components/backdrop/backdrop';
import Page from '../../../components/Page';
import { EventType } from 'constants/eventType';
import { useApi } from 'hooks/useApi';
import Events from 'utils/events';

import '../../../elements/emby-tabs/emby-tabs';
import '../../../elements/emby-button/emby-button';
import '../../../elements/emby-scroller/emby-scroller';

import { useUserViews } from 'hooks/api/useUserViews';
import { useGetStudios } from 'hooks/useFetchItems';

import Billboard from '../components/Billboard/Billboard';
import DetailsModal from '../components/DetailsModal/DetailsModal';
import GenreSelector from '../components/NetworkSelector/NetworkSelector';
import MediaRow from '../components/MediaRow/MediaRow';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useResumeItems } from '../hooks/useResumeItems';
import { usePersonalizedRecommendations, useTopUserGenres } from '../hooks/usePersonalizedRecommendations';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
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
    const { __legacyApiClient__: apiClient } = useApi();
    const [movieLibraryId, setMovieLibraryId] = useState<string | null>(null);
    const [showLibraryId, setShowLibraryId] = useState<string | null>(null);
    const { greeting } = useTimeOfDay();
    const { data: recommendations = [] } = usePersonalizedRecommendations();
    const topGenres = useTopUserGenres();

    useEffect(() => {
        if (userViews?.Items) {
            const movies = userViews.Items.find((i: any) => i.CollectionType === 'movies');
            const tvshows = userViews.Items.find((i: any) => i.CollectionType === 'tvshows');
            if (movies) setMovieLibraryId(movies.Id ?? null);
            if (tvshows) setShowLibraryId(tvshows.Id ?? null);
        }
    }, [userViews]);

    const [ searchParams, setSearchParams ] = useSearchParams();
    const initialTabIndex = parseInt(searchParams.get('tab') ?? '0', 10);
    const [categoryFilter, setCategoryFilter] = useState<'home' | 'movies' | 'shows' | 'mylist' | 'collections' | 'anime'>('home');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const syncingFromUrl = useRef(false);
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
            { name: 'Anime' },
            { name: 'My List' },
            { name: 'Collections' }
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
        const categories: typeof categoryFilter[] = ['home', 'movies', 'shows', 'anime', 'mylist', 'collections'];
        setCategoryFilter(categories[newIndex]);
        if (!syncingFromUrl.current) {
            setSearchParams({ tab: String(newIndex) }, { replace: true });
        }
    }, [setSearchParams]);

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

    // Sync state with URL parameter changes dynamically
    // Uses syncingFromUrl ref to prevent circular updates (tab change → setSearchParams → effect → m.selectedTabIndex → onTabChange → setSearchParams)
    const tabParam = searchParams.get('tab');
    useEffect(() => {
        if (tabParam !== null) {
            const index = parseInt(tabParam, 10);
            if (!isNaN(index)) {
                syncingFromUrl.current = true;
                mainTabsManager.then((m) => {
                    m.selectedTabIndex(index);
                    syncingFromUrl.current = false;
                });
                const categories: typeof categoryFilter[] = ['home', 'movies', 'shows', 'anime', 'mylist', 'collections'];
                setCategoryFilter(categories[index]);
            }
        }
    }, [tabParam, mainTabsManager]);

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
            { id: 'anime', label: 'Anime' },
            { id: 'mylist', label: 'My List' },
            { id: 'collections', label: 'Collections' }
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
                {categories.map((cat, idx) => (
                    <span
                        key={cat.id}
                        onClick={() => {
                            setCategoryFilter(cat.id);
                            setSearchParams({ tab: String(idx) }, { replace: true });
                        }}
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

    const applyGenreFilter = (query: any) => {
        if (!selectedGenre) return query;
        return { ...query, Genres: selectedGenre };
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
                                <GenreSelector selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
                                {resumeItems.length > 0 && <MediaRow title="Continue Watching" itemsOverride={resumeItems} />}

                                {/* Personalized recommendation rows */}
                                {recommendations.map((group) => (
                                    <MediaRow key={group.title} title={group.title} itemsOverride={group.items} />
                                ))}

                                <MediaRow title="Suggested for You" query={applyGenreFilter({ SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie,Series', Recursive: true })} />
                                <MediaRow title="My List" query={applyGenreFilter({ Filters: 'IsFavorite', Limit: 12, Recursive: true })} />

                                {/* New & Hot — last 7 days */}
                                <MediaRow title="New & Hot" query={{ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 15, IncludeItemTypes: 'Movie,Series', Recursive: true, Days: 7 }} />

                                {/* Dynamic genre rows based on user's top genres */}
                                {topGenres.length > 0 && (
                                    <>
                                        <MediaRow title={`Popular in ${topGenres[0]}`} query={applyGenreFilter({ Genres: topGenres[0], IncludeItemTypes: 'Movie,Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                        {topGenres[1] && <MediaRow title={`Popular in ${topGenres[1]}`} query={applyGenreFilter({ Genres: topGenres[1], IncludeItemTypes: 'Movie,Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />}
                                        {topGenres[2] && <MediaRow title={`Popular in ${topGenres[2]}`} query={applyGenreFilter({ Genres: topGenres[2], IncludeItemTypes: 'Movie,Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />}
                                    </>
                                )}

                                <MediaRow title="Featured Collections" query={applyGenreFilter({ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true })} />
                                <MediaRow title="Top 10 Movies" query={applyGenreFilter({ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                                <MediaRow title="Top 10 TV Shows" query={applyGenreFilter({ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                                <MediaRow title="Top 10 Anime" query={applyGenreFilter({ Genres: 'Anime', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                                <MediaRow title="Recently Added Movies" query={applyGenreFilter({ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Movie', Recursive: true })} />
                                <MediaRow title="Recently Added TV Shows" query={applyGenreFilter({ SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, IncludeItemTypes: 'Series', Recursive: true })} />
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
                                <GenreSelector selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
                                <MediaRow title="Movie Collections" query={applyGenreFilter({ IncludeItemTypes: 'BoxSet', Limit: 12, Recursive: true })} />
                                <MediaRow title="Continue Watching" itemsOverride={resumeItems.filter((i: any) => i.Type === 'Movie')} />
                                <MediaRow title="Top 10 Movies" query={applyGenreFilter({ IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                                <MediaRow title="Popular in Thriller" query={applyGenreFilter({ Genres: 'Thriller', IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Popular in Science Fiction" query={applyGenreFilter({ Genres: 'Science Fiction', IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Popular in Action" query={applyGenreFilter({ Genres: 'Action', IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                {movieLibraryId && <StudioRow apiClient={apiClient} movieLibraryId={movieLibraryId} />}
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
                                <GenreSelector selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
                                <MediaRow title="Continue Watching" itemsOverride={resumeItems.filter((i: any) => i.Type === 'Series' || i.Type === 'Episode')} />
                                <MediaRow title="Top 10 TV Shows" query={applyGenreFilter({ IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                                <MediaRow title="Popular in Drama" query={applyGenreFilter({ Genres: 'Drama', IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Popular in Sci-Fi & Fantasy" query={applyGenreFilter({ Genres: 'Sci-Fi & Fantasy', IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Popular in Action & Adventure" query={applyGenreFilter({ Genres: 'Action & Adventure', IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
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

                <div className='tabContent pageTabContent' id='animeTab' data-index='3'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'anime' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="Trending Anime" query={applyGenreFilter({ Genres: 'Anime', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 15, Recursive: true })} />
                                <MediaRow title="Anime Movies" query={applyGenreFilter({ Genres: 'Anime', IncludeItemTypes: 'Movie', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Anime Series" query={applyGenreFilter({ Genres: 'Anime', IncludeItemTypes: 'Series', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Recently Added Anime" query={applyGenreFilter({ Genres: 'Anime', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Top 10 Anime" query={applyGenreFilter({ Genres: 'Anime', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 10, Recursive: true })} isTop10={true} />
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='mylistTab' data-index='4'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'mylist' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="My Favorites" query={applyGenreFilter({ Filters: 'IsFavorite', SortBy: 'DateModified', SortOrder: 'Descending', Limit: 30, Recursive: true })} />
                                <MediaRow title="Recently Watched" query={applyGenreFilter({ Filters: 'IsFavorite', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 15, Recursive: true })} />
                                <MediaRow title="Unwatched in My List" query={applyGenreFilter({ Filters: 'IsFavorite,IsUnplayed', Limit: 15, Recursive: true })} />
                            </div>
                        )}
                    </div>
                    <div className='sections' style={{ display: 'none' }}></div>
                </div>

                <div className='tabContent pageTabContent' id='collectionsTab' data-index='5'>
                    <div style={{ padding: isMobile ? '0 1.5%' : '0 2.5%' }}>
                        {categoryFilter === 'collections' && (
                            <div className='zaflix-stagger-fade-in'>
                                <MediaRow title="Featured Collections" query={applyGenreFilter({ IncludeItemTypes: 'BoxSet', SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Recently Added Collections" query={applyGenreFilter({ IncludeItemTypes: 'BoxSet', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12, Recursive: true })} />
                                <MediaRow title="Movie Collections" query={applyGenreFilter({ IncludeItemTypes: 'BoxSet', SortBy: 'SortName', SortOrder: 'Ascending', Limit: 30, Recursive: true })} />
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

const StudioRow: React.FC<{ apiClient: any; movieLibraryId: string }> = ({ apiClient, movieLibraryId }) => {
    const { data: studios = [] } = useGetStudios(movieLibraryId, [BaseItemKind.Movie]);
    const { isMobile } = useMediaQuery();

    if (!studios.length) return null;

    const handleStudioClick = (studio: any) => {
        if (!apiClient) return;
        import('utils/dashboard').then(({ default: Dashboard }) => {
            Dashboard.navigate(`details?id=${studio.Id}&serverId=${apiClient.serverId()}`);
        });
    };

    return (
        <div style={{ marginBottom: '30px', textAlign: 'left' }}>
            <h2 style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                color: ZAFlix.colors.textPrimary,
                marginBottom: '10px',
                paddingLeft: '2px',
                fontWeight: 700,
                textShadow: ZAFlix.shadows.textGlowSubtle
            }}>
                Browse by Studio
            </h2>
            <div className='zaflix-hide-scrollbar' style={{
                display: 'flex',
                gap: '14px',
                overflowX: 'auto',
                padding: '6px 2px',
                WebkitOverflowScrolling: 'touch'
            }}>
                {studios.map((studio: any) => {
                    const logoUrl = apiClient
                        ? apiClient.getUrl(`Items/${studio.Id}/Images/Logo?quality=90${studio.ImageTags?.Logo ? `&tag=${studio.ImageTags.Logo}` : ''}`)
                        : '';
                    const thumbUrl = apiClient
                        ? apiClient.getUrl(`Items/${studio.Id}/Images/Thumb?quality=90${studio.ImageTags?.Thumb ? `&tag=${studio.ImageTags.Thumb}` : ''}`)
                        : '';
                    return (
                        <div
                            key={studio.Id}
                            onClick={() => handleStudioClick(studio)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStudioClick(studio); } }}
                            role='button'
                            tabIndex={0}
                            className='zaflix-focus-visible will-change-transform'
                            style={{
                                flex: '0 0 auto',
                                width: isMobile ? '130px' : '160px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <div style={{
                                width: '100%',
                                height: isMobile ? '70px' : '90px',
                                borderRadius: ZAFlix.radii.card,
                                overflow: 'hidden',
                                border: `1px solid ${ZAFlix.colors.border}`,
                                background: ZAFlix.colors.card,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px'
                            }}>
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={studio.Name || ''}
                                        loading='lazy'
                                        className='zaflix-image-fade-in'
                                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain'
                                        }}
                                        onError={(e) => {
                                            if (thumbUrl) {
                                                (e.currentTarget as HTMLImageElement).src = thumbUrl;
                                            } else {
                                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                (e.currentTarget as HTMLImageElement).parentElement!.innerText = studio.Name?.[0]?.toUpperCase() || '?';
                                            }
                                        }}
                                    />
                                ) : thumbUrl ? (
                                    <img
                                        src={thumbUrl}
                                        alt={studio.Name || ''}
                                        loading='lazy'
                                        className='zaflix-image-fade-in'
                                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <span style={{
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color: ZAFlix.colors.accent
                                    }}>
                                        {studio.Name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                )}
                            </div>
                            <div style={{
                                marginTop: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: ZAFlix.colors.textSecondary
                            }}>
                                {studio.Name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Home;
