import { ItemFields } from '@jellyfin/sdk/lib/generated-client';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import React, { useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import { useToggleFavoriteMutation } from 'hooks/useFetchItems';
import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useCollectionItems } from '../../hooks/useCollectionItems';
import { useEpisodes } from '../../hooks/useEpisodes';
import { useItemCollections } from '../../hooks/useItemCollections';
import { useSeasons } from '../../hooks/useSeasons';
import { useSimilarItems } from '../../hooks/useSimilarItems';
import { ZAFlix } from '../../styles/theme';

interface DetailsModalProps {
    item: any;
    onClose: () => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose }) => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const { isMobile, isTablet } = useMediaQuery();

    const isSeries = item.Type === 'Series';
    const isBoxSet = item.Type === 'BoxSet';

    const { data: seasons = [], isPending: isSeasonsPending } = useSeasons(isSeries ? item.Id : undefined);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const { data: episodes = [], isPending: isEpisodesPending } = useEpisodes(isSeries ? item.Id : undefined, selectedSeasonId);
    const { data: similarItems = [], isPending: isSimilarPending } = useSimilarItems(item.Id);
    const { data: parentCollections = [], isPending: isCollectionsPending } = useItemCollections(isBoxSet ? undefined : item.Id);
    const { data: collectionItems = [], isPending: isBoxSetPending } = useCollectionItems(isBoxSet ? item.Id : undefined);

    const [adminMenuAnchor, setAdminMenuAnchor] = useState<boolean>(false);
    const [isFavorite, setIsFavorite] = useState<boolean>(item.UserData?.IsFavorite || false);
    const toggleFavoriteMutation = useToggleFavoriteMutation();

    // Set initial selected season when seasons load
    useEffect(() => {
        if (seasons.length > 0 && !selectedSeasonId) {
            setSelectedSeasonId(seasons[0].Id);
        }
    }, [seasons, selectedSeasonId]);

    const handleToggleFavorite = () => {
        if (!user || !user.Id) return;
        const newFav = !isFavorite;
        setIsFavorite(newFav);
        toggleFavoriteMutation.mutate(
            { itemId: item.Id, isFavorite: newFav },
            { onError: () => setIsFavorite(!newFav) }
        );
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

    const sectionTitleStyle: React.CSSProperties = {
        borderBottom: `1px solid ${ZAFlix.colors.border}`,
        paddingBottom: '12px',
        marginBottom: '15px',
        fontSize: '1.25rem',
        fontWeight: 700
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: ZAFlix.colors.overlay,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: isMobile ? '10px' : '20px',
            animation: 'zaflixFadeIn 0.3s ease forwards'
        }}>
            <div className='zaflix-modal-enter' style={{
                position: 'relative',
                width: '100%',
                maxWidth: '820px',
                height: '92vh',
                backgroundColor: ZAFlix.colors.bg,
                borderRadius: ZAFlix.radii.modal,
                border: `1px solid ${ZAFlix.colors.border}`,
                overflowY: 'auto',
                boxShadow: ZAFlix.shadows.modal,
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
                        border: `1px solid ${ZAFlix.colors.border}`,
                        borderRadius: ZAFlix.radii.circle,
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ZAFlix.colors.textPrimary,
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
                        background: ZAFlix.gradients.modalBottom
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
                                borderRadius: ZAFlix.radii.button,
                                border: 'none',
                                background: ZAFlix.gradients.accent,
                                color: ZAFlix.colors.textPrimary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: ZAFlix.shadows.button
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
                                borderRadius: ZAFlix.radii.button,
                                border: `1px solid ${ZAFlix.colors.borderHover}`,
                                background: 'rgba(10, 6, 20, 0.75)',
                                color: ZAFlix.colors.textPrimary,
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
                            {isFavorite ? <FavoriteIcon style={{ color: ZAFlix.colors.red }} /> : <FavoriteBorderIcon />}
                            {isFavorite ? 'My List' : 'Add to List'}
                        </button>

                        {user?.Policy?.IsAdministrator && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setAdminMenuAnchor(!adminMenuAnchor)}
                                    style={{
                                        background: 'rgba(10, 6, 20, 0.75)',
                                        border: `1px solid ${ZAFlix.colors.borderHover}`,
                                        color: ZAFlix.colors.textPrimary,
                                        borderRadius: ZAFlix.radii.circle,
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
                                        background: ZAFlix.colors.bgLight,
                                        border: `1px solid ${ZAFlix.colors.border}`,
                                        borderRadius: ZAFlix.radii.button,
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
                                                import('../../../../components/metadataEditor/metadataEditor').then(({ default: metadataEditor }) => {
                                                    metadataEditor.show(item.Id, apiClient?.serverId() || '');
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: ZAFlix.colors.textPrimary,
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
                                                import('../../../../components/imageeditor/imageeditor').then((imageEditor) => {
                                                    imageEditor.show({
                                                        itemId: item.Id,
                                                        serverId: apiClient?.serverId() || ''
                                                    });
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: ZAFlix.colors.textPrimary,
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
                                                    import('../../../../components/itemidentifier/itemidentifier').then((itemIdentifier) => {
                                                        itemIdentifier.show(item.Id, apiClient?.serverId() || '');
                                                    });
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: ZAFlix.colors.textPrimary,
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
                <div style={{ padding: '25px', color: ZAFlix.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '25px', flexDirection: isMobile ? 'column' : 'row' }}>
                        {!isMobile && (
                            <div style={{
                                width: '150px',
                                height: '225px',
                                flexShrink: 0,
                                borderRadius: ZAFlix.radii.card,
                                overflow: 'hidden',
                                border: `1px solid ${ZAFlix.colors.border}`,
                                boxShadow: '0 4px 15px rgba(0,0,0,0.6)'
                            }}>
                                <img
                                    src={apiClient?.getUrl(`Items/${item.Id}/Images/Primary?quality=90`) || ''}
                                    loading='lazy'
                                    className='zaflix-image-fade-in'
                                    onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    alt={item.Name}
                                />
                            </div>
                        )}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {item.ImageTags && item.ImageTags.Logo ? (
                                <img
                                    src={apiClient?.getUrl(`Items/${item.Id}/Images/Logo?maxHeight=80`) || ''}
                                    loading='lazy'
                                    className='zaflix-image-fade-in'
                                    onLoad={(e) => e.currentTarget.classList.add('loaded')}
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

                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.9rem', color: ZAFlix.colors.textSecondary }}>
                                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                {item.CommunityRating && (
                                    <span style={{ color: ZAFlix.colors.cyan, fontWeight: 'bold' }}>
                                        ★ {item.CommunityRating.toFixed(1)}
                                    </span>
                                )}
                                {item.Genres && item.Genres.slice(0, 3).map((g: string) => (
                                    <span key={g} style={{
                                        padding: '2px 8px',
                                        background: 'rgba(211, 82, 255, 0.12)',
                                        border: `1px solid ${ZAFlix.colors.border}`,
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>{g}</span>
                                ))}
                            </div>

                            <p style={{ fontSize: '1rem', lineHeight: '1.5', color: ZAFlix.colors.textSecondary, margin: 0 }}>{item.Overview}</p>
                        </div>
                    </div>

                    {/* TV Show Episodes Section */}
                    {item.Type === 'Series' && (isSeasonsPending || isEpisodesPending ? (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: `1px solid ${ZAFlix.colors.border}`,
                                paddingBottom: '12px',
                                marginBottom: '15px'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Episodes</h3>
                                <div className='skeleton-card' style={{ width: 140, height: 34, borderRadius: 6 }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        padding: '10px',
                                        borderRadius: ZAFlix.radii.card,
                                        background: 'rgba(20, 13, 39, 0.3)'
                                    }}>
                                        <div className='skeleton-card' style={{ width: 25, height: 20, borderRadius: 4 }} />
                                        <div style={{ flex: 1 }}>
                                            <div className='skeleton-card' style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 6 }} />
                                            <div className='skeleton-card' style={{ width: '85%', height: 12, borderRadius: 4 }} />
                                        </div>
                                        <div className='skeleton-card' style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: `1px solid ${ZAFlix.colors.border}`,
                                paddingBottom: '12px',
                                marginBottom: '15px'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Episodes</h3>

                                <select
                                    value={selectedSeasonId}
                                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                                    style={{
                                        background: ZAFlix.colors.card,
                                        color: ZAFlix.colors.textPrimary,
                                        border: `1px solid ${ZAFlix.colors.borderHover}`,
                                        padding: '6px 12px',
                                        borderRadius: ZAFlix.radii.button,
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {episodes.map((ep, idx) => (
                                    <div
                                        key={ep.Id}
                                        onClick={() => handlePlay(ep.Id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlay(ep.Id); } }}
                                        role='button'
                                        tabIndex={0}
                                        className='zaflix-focus-visible'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            padding: '10px',
                                            borderRadius: ZAFlix.radii.card,
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            background: 'rgba(20, 13, 39, 0.3)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(194, 109, 240, 0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 13, 39, 0.3)'}
                                    >
                                        {ep.ImageTags?.Primary ? (
                                            <img
                                                src={apiClient?.getUrl(`Items/${ep.Id}/Images/Primary?quality=80&width=120`)}
                                                alt=''
                                                loading='lazy'
                                                className='zaflix-image-fade-in'
                                                onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                                style={{
                                                    width: '70px',
                                                    height: '52px',
                                                    borderRadius: '4px',
                                                    objectFit: 'cover',
                                                    flexShrink: 0
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: ZAFlix.colors.accent, width: '25px', textAlign: 'center' }}>
                                                {idx + 1}
                                            </span>
                                        )}
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: ZAFlix.colors.textPrimary }}>
                                                {ep.Name}
                                            </div>
                                            {ep.Overview && (
                                                <p style={{
                                                    margin: '4px 0 0 0',
                                                    fontSize: '0.85rem',
                                                    color: ZAFlix.colors.textSecondary,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
                                                    {ep.Overview}
                                                </p>
                                            )}
                                        </div>
                                        <PlayArrowIcon style={{ color: ZAFlix.colors.accent }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Movies inside this Collection (for BoxSet items) */}
                    {item.Type === 'BoxSet' && (isBoxSetPending ? (
                        <div style={{ marginTop: '20px' }}>
                            <h3 style={sectionTitleStyle}>Movies in this Collection</h3>
                            <div className='zaflix-hide-scrollbar' style={{
                                display: 'flex',
                                gap: '12px',
                                overflowX: 'auto',
                                paddingBottom: '8px',
                                WebkitOverflowScrolling: 'touch',
                                scrollSnapType: 'x proximity',
                                touchAction: 'pan-y'
                            }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{ flex: '0 0 auto', width: '120px' }}>
                                        <div className='skeleton-card' style={{
                                            width: '100%',
                                            paddingTop: '150%',
                                            borderRadius: ZAFlix.radii.card
                                        }} />
                                        <div className='skeleton-card' style={{ width: '70%', height: 14, borderRadius: 4, marginTop: 6 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : collectionItems.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <h3 style={sectionTitleStyle}>Movies in this Collection</h3>
                            <div className='zaflix-hide-scrollbar' style={{
                                display: 'flex',
                                gap: '12px',
                                overflowX: 'auto',
                                padding: '4px 2px 8px',
                                WebkitOverflowScrolling: 'touch',
                                scrollSnapType: 'x proximity',
                                touchAction: 'pan-y'
                            }}>
                                {collectionItems.map((colItem: any) => {
                                    const colItemPoster = apiClient
                                        ? apiClient.getUrl(`Items/${colItem.Id}/Images/Primary?quality=80`)
                                        : '';
                                    return (
                                        <div
                                            key={colItem.Id}
                                            onClick={() => Events.trigger(document, 'open-zaflix-details', [colItem])}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Events.trigger(document, 'open-zaflix-details', [colItem]); } }}
                                            role='button'
                                            tabIndex={0}
                                            className='zaflix-focus-visible will-change-transform'
                                            style={{
                                                flex: '0 0 auto',
                                                width: '120px',
                                                cursor: 'pointer',
                                                scrollSnapAlign: 'start',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '150%',
                                                borderRadius: ZAFlix.radii.card,
                                                overflow: 'hidden',
                                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                                backgroundImage: `url(${colItemPoster})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundColor: ZAFlix.colors.card
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
                                                {colItem.Name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {isCollectionsPending ? (
                        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                            <h3 style={sectionTitleStyle}>Part of Collection</h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                {[1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        className='skeleton-card'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            borderRadius: ZAFlix.radii.card,
                                            padding: '8px 16px',
                                            height: 76,
                                            width: 200
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : parentCollections.length > 0 && (
                        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                            <h3 style={sectionTitleStyle}>Part of Collection</h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                {parentCollections.map((col: any) => {
                                    const colUrl = apiClient?.getUrl(`Items/${col.Id}/Images/Primary?quality=90`) || '';
                                    return (
                                        <div
                                            key={col.Id}
                                            onClick={() => Events.trigger(document, 'open-zaflix-details', [col])}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Events.trigger(document, 'open-zaflix-details', [col]); } }}
                                            role='button'
                                            tabIndex={0}
                                            className='zaflix-focus-visible'
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: 'rgba(211, 82, 255, 0.08)',
                                                border: `1px solid ${ZAFlix.colors.border}`,
                                                borderRadius: ZAFlix.radii.card,
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(211, 82, 255, 0.15)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.borderHover;
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(211, 82, 255, 0.08)';
                                                e.currentTarget.style.borderColor = ZAFlix.colors.border;
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {colUrl && (
                                                <img
                                                    src={colUrl}
                                                    loading='lazy'
                                                    className='zaflix-image-fade-in'
                                                    onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                                    style={{ width: '40px', height: '60px', borderRadius: '4px', objectFit: 'cover' }}
                                                    alt={col.Name}
                                                />
                                            )}
                                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: ZAFlix.colors.textPrimary }}>{col.Name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {isSimilarPending ? (
                        <div style={{ marginTop: '25px' }}>
                            <h3 style={sectionTitleStyle}>More Like This</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                                gap: '15px'
                            }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i}>
                                        <div className='skeleton-card' style={{
                                            width: '100%',
                                            paddingTop: '150%',
                                            borderRadius: ZAFlix.radii.card
                                        }} />
                                        <div className='skeleton-card' style={{ width: '70%', height: 13, borderRadius: 4, marginTop: 6 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : similarItems.length > 0 && (
                        <div style={{ marginTop: '25px' }}>
                            <h3 style={sectionTitleStyle}>More Like This</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                                gap: '15px'
                            }}>
                                {similarItems.map((similarItem) => {
                                    const similarPoster = apiClient
                                        ? apiClient.getUrl(`Items/${similarItem.Id}/Images/Primary?quality=80`)
                                        : '';
                                    return (
                                        <div
                                            key={similarItem.Id}
                                            onClick={() => Events.trigger(document, 'open-zaflix-details', [similarItem])}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Events.trigger(document, 'open-zaflix-details', [similarItem]); } }}
                                            role='button'
                                            tabIndex={0}
                                            className='zaflix-focus-visible will-change-transform'
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '150%',
                                                borderRadius: ZAFlix.radii.card,
                                                overflow: 'hidden',
                                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                                backgroundImage: `url(${similarPoster})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundColor: ZAFlix.colors.card
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

export default React.memo(DetailsModal);