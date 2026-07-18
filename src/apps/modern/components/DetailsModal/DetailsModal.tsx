import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useApi } from 'hooks/useApi';
import { useToggleFavoriteMutation } from 'hooks/useFetchItems';
import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';
import datetime from 'scripts/datetime';
import { hapticMedium } from '../../../../utils/haptics';

import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MovieIcon from '@mui/icons-material/Movie';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import MaturityBadge from '../MaturityBadge/MaturityBadge';

import { useCollectionItems } from '../../hooks/useCollectionItems';
import { useEpisodes } from '../../hooks/useEpisodes';
import { useItem } from '../../hooks/useItem';
import { useItemBoxSets } from '../../hooks/useItemBoxSets';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

    const isSeries = item.Type === 'Series';
    const isBoxSet = item.Type === 'BoxSet';

    const { data: seasons = [], isPending: isSeasonsPending } = useSeasons(isSeries ? item.Id : undefined);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const { data: episodes = [], isPending: isEpisodesPending } = useEpisodes(isSeries ? item.Id : undefined, selectedSeasonId);
    const { data: fullItem } = useItem(item.Id);
    const detailItem = fullItem || item;
    const { data: similarItems = [], isPending: isSimilarPending } = useSimilarItems(item.Id);
    const { data: itemBoxSets = [], isPending: isBoxSetsPending } = useItemBoxSets(isBoxSet ? undefined : item.Id);
    const firstBoxSetId = isBoxSet ? item.Id : (itemBoxSets[0]?.Id || detailItem.CollectionIds?.[0] || undefined);
    const { data: collectionItems = [], isPending: isBoxSetPending } = useCollectionItems(firstBoxSetId);

    const [adminMenuAnchor, setAdminMenuAnchor] = useState<boolean>(false);
    const [isFavorite, setIsFavorite] = useState<boolean>(item.UserData?.IsFavorite || false);
    const toggleFavoriteMutation = useToggleFavoriteMutation();

    const [selectedAudioIndex, setSelectedAudioIndex] = useState<number>(-1);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(-1);

    const formatStreamLabel = (stream: any): string => {
        const lang = stream.LocalizedLanguage || stream.Language || '';
        if (stream.Type === 'Audio') {
            const layout = stream.ChannelLayout || stream.Codec || '';
            const profile = stream.Profile && stream.Profile !== 'Unknown' ? ` (${stream.Profile})` : '';
            return [lang, layout].filter(Boolean).join(' - ') + profile || stream.DisplayTitle || stream.Title || 'Unknown';
        }
        const codec = stream.Codec ? stream.Codec.toUpperCase() : (stream.DisplayTitle || stream.Title || '');
        const suffix = stream.IsExternal ? ' (External)' : (stream.IsForced ? ' (Forced)' : '');
        return [lang, codec].filter(Boolean).join(' - ') + suffix || 'Unknown';
    };

    // Set initial selected season when seasons load
    useEffect(() => {
        if (seasons.length > 0 && !selectedSeasonId) {
            setSelectedSeasonId(seasons[0].Id);
        }
    }, [seasons, selectedSeasonId]);

    // Set initial audio/subtitle selections from defaults
    useEffect(() => {
        if (!detailItem.MediaStreams) return;
        const audioStreams = detailItem.MediaStreams.filter((s: any) => s.Type === 'Audio');
        const subtitleStreams = detailItem.MediaStreams.filter((s: any) => s.Type === 'Subtitle');
        const defaultAudio = audioStreams.find((s: any) => s.IsDefault) || audioStreams[0];
        const defaultSub = subtitleStreams.find((s: any) => s.IsDefault);
        if (defaultAudio && selectedAudioIndex === -1) {
            setSelectedAudioIndex(defaultAudio.Index);
        }
        if (defaultSub && selectedSubtitleIndex === -1) {
            setSelectedSubtitleIndex(defaultSub.Index);
        }
    }, [detailItem.MediaStreams, selectedAudioIndex, selectedSubtitleIndex]);

    // Lock body scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const handleToggleFavorite = () => {
        if (!user || !user.Id) return;
        const newFav = !isFavorite;
        setIsFavorite(newFav);
        hapticMedium();
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

    return createPortal(
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
                overflowX: 'hidden',
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
                        background: isMobile
                            ? 'linear-gradient(to right, rgba(10,6,20,0.7) 0%, rgba(10,6,20,0.2) 60%, transparent 100%)'
                            : 'linear-gradient(to right, rgba(10,6,20,0.85) 0%, rgba(10,6,20,0.3) 50%, transparent 100%)'
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
                            onClick={() => {
                                hapticMedium();
                                handlePlay();
                            }}
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

                        {(item.Type === 'Movie' || item.Type === 'Series') && (
                            <button
                                onClick={() => {
                                    playbackManager.playTrailers(item);
                                    onClose();
                                }}
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
                                <MovieIcon /> Trailer
                            </button>
                        )}

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
                <div style={{ padding: '25px 25px 35px 25px', color: ZAFlix.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
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
                                        marginBottom: '12px'
                                    }}
                                    alt={item.Name}
                                />
                            ) : (
                                <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', margin: 0, fontWeight: 800 }}>{item.Name}</h1>
                            )}

                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.9rem', color: ZAFlix.colors.textSecondary, flexWrap: 'wrap' }}>
                                {detailItem.ProductionYear && <span>{detailItem.ProductionYear}</span>}
                                {detailItem.RunTimeTicks && (
                                    <span style={{ color: ZAFlix.colors.textSecondary }}>
                                        {datetime.getDisplayRunningTime(detailItem.RunTimeTicks)}
                                    </span>
                                )}
                                {detailItem.OfficialRating && (
                                    <MaturityBadge rating={detailItem.OfficialRating} />
                                )}
                                {detailItem.CommunityRating && (
                                    <span style={{ color: ZAFlix.colors.cyan, fontWeight: 'bold' }}>
                                        ★ {detailItem.CommunityRating.toFixed(1)}
                                    </span>
                                )}
                                {detailItem.Studios?.[0]?.Name && (
                                    <span>{detailItem.Studios[0].Name}</span>
                                )}
                                {detailItem.Genres && detailItem.Genres.slice(0, 3).map((g: string) => (
                                    <span key={g} style={{
                                        padding: '2px 8px',
                                        background: 'rgba(211, 82, 255, 0.12)',
                                        border: `1px solid ${ZAFlix.colors.border}`,
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>{g}</span>
                                ))}
                            </div>
                            {detailItem.People?.filter((p: any) => p.Type === 'Director').slice(0, 2).length > 0 && (
                                <div style={{ fontSize: '0.85rem', color: ZAFlix.colors.textSecondary }}>
                                    <span style={{ color: ZAFlix.colors.textSecondary, opacity: 0.7 }}>Directed by </span>
                                    {detailItem.People.filter((p: any) => p.Type === 'Director').slice(0, 2).map((p: any, i: number, arr: any[]) => (
                                        <span key={p.Name}>
                                            <span style={{ color: ZAFlix.colors.textPrimary }}>{p.Name}</span>
                                            {i < arr.length - 1 && <span>, </span>}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div>
                                <p style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.5',
                                    color: ZAFlix.colors.textSecondary,
                                    margin: 0,
                                    ...(isOverviewExpanded ? {} : {
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    })
                                }}>
                                    {item.Overview}
                                </p>
                                {item.Overview && item.Overview.length > 150 && (
                                    <button
                                        onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: ZAFlix.colors.accent,
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            padding: '4px 0',
                                            marginTop: '4px'
                                        }}
                                    >
                                        {isOverviewExpanded ? 'Show less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                            </div>
                        </div>

                        {/* Content Warnings */}
                        {detailItem.OfficialRating && ['R', 'NC-17', 'TV-MA'].includes(detailItem.OfficialRating) && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 14px',
                                background: 'rgba(244, 67, 54, 0.08)',
                                border: '1px solid rgba(244, 67, 54, 0.25)',
                                borderRadius: ZAFlix.radii.button,
                                fontSize: '0.85rem',
                                color: '#e57373'
                            }}>
                                <WarningAmberIcon style={{ fontSize: '1.2rem', flexShrink: 0 }} />
                                <span>This content is rated <strong>{detailItem.OfficialRating}</strong> and may not be suitable for all audiences.</span>
                            </div>
                        )}

                        {/* Cast & Crew Grid */}
                        {detailItem.People && detailItem.People.length > 0 && (
                            <div>
                                <h3 style={sectionTitleStyle}>Cast & Crew</h3>
                                <div className='zaflix-hide-scrollbar' style={{
                                    display: 'flex',
                                    gap: isMobile ? '12px' : '18px',
                                    overflowX: 'auto',
                                    padding: '6px 12px 6px 8px',
                                    WebkitOverflowScrolling: 'touch',
                                    scrollSnapType: 'x proximity',
                                    touchAction: 'pan-y'
                                }}>
                                    {detailItem.People.slice(0, 12).map((person: any) => {
                                        const personImageUrl = apiClient
                                            ? apiClient.getUrl(`Items/${person.Id}/Images/Primary?quality=80&width=120${person.PrimaryImageTag ? `&tag=${person.PrimaryImageTag}` : ''}`)
                                            : '';
                                        return (
                                            <div key={person.Id || person.Name} style={{
                                                flex: '0 0 auto',
                                                width: isMobile ? '80px' : '100px',
                                                textAlign: 'center',
                                                scrollSnapAlign: 'start'
                                            }}>
                                                <div style={{
                                                    width: isMobile ? '70px' : '90px',
                                                    height: isMobile ? '70px' : '90px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: `2px solid ${ZAFlix.colors.border}`,
                                                    background: ZAFlix.colors.card,
                                                    margin: '0 auto 8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {personImageUrl ? (
                                                        <img
                                                            src={personImageUrl}
                                                            alt={person.Name || ''}
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
                                                            fontSize: '1.5rem',
                                                            fontWeight: 700,
                                                            color: ZAFlix.colors.accent
                                                        }}>
                                                            {person.Name?.[0]?.toUpperCase() || '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    color: ZAFlix.colors.textPrimary,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {person.Name}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    color: ZAFlix.colors.textSecondary,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    marginTop: '2px'
                                                }}>
                                                    {person.Role || person.Type}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Audio & Subtitle Selectors */}
                        {detailItem.MediaStreams && detailItem.MediaStreams.length > 0 && (() => {
                            const audioStreams = detailItem.MediaStreams.filter((s: any) => s.Type === 'Audio');
                            const subtitleStreams = detailItem.MediaStreams.filter((s: any) => s.Type === 'Subtitle');
                            if (audioStreams.length === 0 && subtitleStreams.length === 0) return null;
                            return (
                                <div style={{
                                    display: 'flex',
                                    gap: '15px',
                                    flexWrap: 'wrap'
                                }}>
                                    {audioStreams.length > 1 && (
                                        <div style={{
                                            flex: '1 1 200px',
                                            background: 'rgba(20, 13, 39, 0.4)',
                                            border: `1px solid ${ZAFlix.colors.borderSubtle}`,
                                            borderRadius: ZAFlix.radii.button,
                                            padding: '10px 14px'
                                        }}>
                                            <label style={{
                                                fontSize: '0.75rem',
                                                color: ZAFlix.colors.textSecondary,
                                                opacity: 0.7,
                                                display: 'block',
                                                marginBottom: '6px'
                                            }}>Audio</label>
                                            <select
                                                value={selectedAudioIndex}
                                                onChange={(e) => {
                                                    const idx = Number(e.target.value);
                                                    setSelectedAudioIndex(idx);
                                                    playbackManager.setAudioStreamIndex(idx);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    background: ZAFlix.colors.card,
                                                    color: ZAFlix.colors.textPrimary,
                                                    border: `1px solid ${ZAFlix.colors.borderHover}`,
                                                    padding: '6px 10px',
                                                    borderRadius: ZAFlix.radii.button,
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {audioStreams.map((s: any) => (
                                                    <option key={s.Index} value={s.Index}>{formatStreamLabel(s)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {subtitleStreams.length > 0 && (
                                        <div style={{
                                            flex: '1 1 200px',
                                            background: 'rgba(20, 13, 39, 0.4)',
                                            border: `1px solid ${ZAFlix.colors.borderSubtle}`,
                                            borderRadius: ZAFlix.radii.button,
                                            padding: '10px 14px'
                                        }}>
                                            <label style={{
                                                fontSize: '0.75rem',
                                                color: ZAFlix.colors.textSecondary,
                                                opacity: 0.7,
                                                display: 'block',
                                                marginBottom: '6px'
                                            }}>Subtitles</label>
                                            <select
                                                value={selectedSubtitleIndex}
                                                onChange={(e) => {
                                                    const idx = Number(e.target.value);
                                                    setSelectedSubtitleIndex(idx);
                                                    playbackManager.setSubtitleStreamIndex(idx);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    background: ZAFlix.colors.card,
                                                    color: ZAFlix.colors.textPrimary,
                                                    border: `1px solid ${ZAFlix.colors.borderHover}`,
                                                    padding: '6px 10px',
                                                    borderRadius: ZAFlix.radii.button,
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value={-1}>Off</option>
                                                {subtitleStreams.map((s: any) => (
                                                    <option key={s.Index} value={s.Index}>{formatStreamLabel(s)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
                                    <div key={i} style={{ flex: '0 0 auto', width: '180px' }}>
                                        <div className='skeleton-card' style={{
                                            width: '100%',
                                            paddingTop: '56.25%',
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
                                    const imageTag = colItem.BackdropImageTags?.[0] || colItem.ImageTags?.Thumb || colItem.ImageTags?.Primary;
                                    const imageType = colItem.BackdropImageTags?.[0] ? 'Backdrop' : (colItem.ImageTags?.Thumb ? 'Thumb' : 'Primary');
                                    const colItemLandscape = apiClient && imageTag
                                        ? apiClient.getUrl(`Items/${colItem.Id}/Images/${imageType}/0?quality=80&tag=${imageTag}`)
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
                                                width: '180px',
                                                cursor: 'pointer',
                                                scrollSnapAlign: 'start',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '56.25%',
                                                borderRadius: ZAFlix.radii.card,
                                                overflow: 'hidden',
                                                border: colItemLandscape ? '1px solid rgba(211, 82, 255, 0.15)' : '1px dashed rgba(211, 82, 255, 0.3)',
                                                background: colItemLandscape ? 'none' : 'linear-gradient(135deg, #140d27 0%, #1a1035 100%)',
                                                backgroundColor: ZAFlix.colors.card
                                            }}>
                                                {colItemLandscape ? (
                                                    <img
                                                        src={colItemLandscape}
                                                        alt={colItem.Name || ''}
                                                        loading='lazy'
                                                        className='zaflix-image-fade-in'
                                                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <MovieIcon style={{ fontSize: '1.5rem', color: ZAFlix.colors.accent, opacity: 0.4 }} />
                                                        <span style={{ fontSize: '0.65rem', color: ZAFlix.colors.textSecondary, opacity: 0.5, textAlign: 'center', padding: '0 6px' }}>
                                                            {colItem.Name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
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

                    {/* Part of Collection — shows other movies in the same BoxSet */}
                    {item.Type === 'Movie' && ((isBoxSetsPending || isBoxSetPending) ? (
                        <div style={{ marginTop: '20px' }}>
                            <h3 style={sectionTitleStyle}>Part of a Collection</h3>
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
                                    <div key={i} style={{ flex: '0 0 auto', width: '180px' }}>
                                        <div className='skeleton-card' style={{
                                            width: '100%',
                                            paddingTop: '56.25%',
                                            borderRadius: ZAFlix.radii.card
                                        }} />
                                        <div className='skeleton-card' style={{ width: '70%', height: 14, borderRadius: 4, marginTop: 6 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : collectionItems.length > 1 && (
                        <div style={{ marginTop: '20px' }}>
                            <h3 style={sectionTitleStyle}>Part of {itemBoxSets[0]?.Name || 'Collection'}</h3>
                            <div className='zaflix-hide-scrollbar' style={{
                                display: 'flex',
                                gap: '12px',
                                overflowX: 'auto',
                                padding: '4px 2px 8px',
                                WebkitOverflowScrolling: 'touch',
                                scrollSnapType: 'x proximity',
                                touchAction: 'pan-y'
                            }}>
                                {collectionItems
                                    .filter((colItem: any) => colItem.Id !== item.Id)
                                    .map((colItem: any) => {
                                        const imageTag = colItem.BackdropImageTags?.[0] || colItem.ImageTags?.Thumb || colItem.ImageTags?.Primary;
                                        const imageType = colItem.BackdropImageTags?.[0] ? 'Backdrop' : (colItem.ImageTags?.Thumb ? 'Thumb' : 'Primary');
                                        const colItemLandscape = apiClient && imageTag
                                            ? apiClient.getUrl(`Items/${colItem.Id}/Images/${imageType}/0?quality=80&tag=${imageTag}`)
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
                                                    width: '180px',
                                                    cursor: 'pointer',
                                                    scrollSnapAlign: 'start',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <div style={{
                                                    position: 'relative',
                                                    paddingTop: '56.25%',
                                                    borderRadius: ZAFlix.radii.card,
                                                    overflow: 'hidden',
                                                    border: colItemLandscape ? '1px solid rgba(211, 82, 255, 0.15)' : '1px dashed rgba(211, 82, 255, 0.3)',
                                                    background: colItemLandscape ? 'none' : 'linear-gradient(135deg, #140d27 0%, #1a1035 100%)',
                                                    backgroundColor: ZAFlix.colors.card
                                                }}>
                                                    {colItemLandscape ? (
                                                        <img
                                                            src={colItemLandscape}
                                                            alt={colItem.Name || ''}
                                                            loading='lazy'
                                                            className='zaflix-image-fade-in'
                                                            onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <MovieIcon style={{ fontSize: '1.5rem', color: ZAFlix.colors.accent, opacity: 0.4 }} />
                                                            <span style={{ fontSize: '0.65rem', color: ZAFlix.colors.textSecondary, opacity: 0.5, textAlign: 'center', padding: '0 6px' }}>
                                                                {colItem.Name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
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

                    {/* More Like This recommended section — portrait poster grid */}
                    {isSimilarPending ? (
                        <div style={{ marginTop: '25px' }}>
                            <h3 style={sectionTitleStyle}>More Like This</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                                gap: '15px'
                            }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i}>
                                        <div className='skeleton-card' style={{
                                            width: '100%',
                                            paddingTop: '150%',
                                            borderRadius: ZAFlix.radii.card
                                        }} />
                                        <div className='skeleton-card' style={{ width: '80%', height: 13, borderRadius: 4, marginTop: 6 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : similarItems.length > 0 && (
                        <div style={{ marginTop: '25px' }}>
                            <h3 style={sectionTitleStyle}>More Like This</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                                gap: '15px'
                            }}>
                                {similarItems.map((similarItem) => {
                                    const posterTag = similarItem.ImageTags?.Primary;
                                    const similarPoster = apiClient
                                        ? apiClient.getUrl(`Items/${similarItem.Id}/Images/Primary?quality=85${posterTag ? `&tag=${posterTag}` : ''}`)
                                        : '';
                                    return (
                                        <div
                                            key={similarItem.Id}
                                            onClick={() => Events.trigger(document, 'open-zaflix-details', [similarItem])}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Events.trigger(document, 'open-zaflix-details', [similarItem]); } }}
                                            role='button'
                                            tabIndex={0}
                                            className='zaflix-focus-visible will-change-transform'
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s ease', minWidth: 0, overflow: 'hidden', borderRadius: ZAFlix.radii.card }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{
                                                position: 'relative',
                                                paddingTop: '150%',
                                                borderRadius: ZAFlix.radii.card,
                                                overflow: 'hidden',
                                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                                backgroundColor: ZAFlix.colors.card
                                            }}>
                                                {similarPoster ? (
                                                    <img
                                                        src={similarPoster}
                                                        alt={similarItem.Name}
                                                        loading='lazy'
                                                        className='zaflix-image-fade-in'
                                                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                ) : null}
                                            </div>
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
        </div>,
        document.body
    );
};

export default React.memo(DetailsModal);