import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import type { SearchHint } from '@jellyfin/sdk/lib/generated-client/models/search-hint';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import DetailsModal from '../../components/DetailsModal/DetailsModal';
import { useItem } from '../../hooks/useItem';
import { useSearch } from '../../hooks/useSearch';
import { ZAFlix } from '../../styles/theme';
import '../../styles/modern.styles.css';

const GROUP_LABELS: Record<string, string> = {
    [BaseItemKind.Movie]: 'Movies',
    [BaseItemKind.Series]: 'TV Series',
    [BaseItemKind.Episode]: 'Episodes',
    [BaseItemKind.Person]: 'People',
    [BaseItemKind.MusicArtist]: 'Artists',
    [BaseItemKind.MusicAlbum]: 'Albums',
    [BaseItemKind.BoxSet]: 'Collections'
};

const GROUP_ORDER = ['Movies', 'TV Series', 'Episodes', 'People', 'Artists', 'Albums', 'Collections'];

const SkeletonCard = () => (
    <div style={{ minWidth: 160, width: 160, flexShrink: 0 }}>
        <div className="skeleton-card" style={{ width: 160, height: 240, borderRadius: ZAFlix.radii.card, marginBottom: 8 }} />
        <div className="skeleton-card" style={{ width: 100, height: 14, borderRadius: 4 }} />
    </div>
);

const SearchCard: React.FC<{ hint: SearchHint; cardW: number; cardH: number; isPerson: boolean; onSelect: (hint: SearchHint) => void; getImageUrl: (hint: SearchHint) => string }> = React.memo(({ hint, cardW, cardH, isPerson, onSelect, getImageUrl }) => {
    const handleClick = () => onSelect(hint);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(hint);
        }
    };
    return (
        <div
            key={hint.Id}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role='button'
            tabIndex={0}
            className='zaflix-focus-visible will-change-transform'
            style={{
                minWidth: cardW,
                width: cardW,
                flexShrink: 0,
                scrollSnapAlign: 'start',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderRadius: ZAFlix.radii.card
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = ZAFlix.shadows.cardHover;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{
                width: cardW,
                height: cardH,
                borderRadius: ZAFlix.radii.card,
                overflow: 'hidden',
                position: 'relative',
                background: ZAFlix.colors.card
            }}>
                {hint.PrimaryImageTag ? (
                    <img
                        src={getImageUrl(hint)}
                        alt={hint.Name || ''}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        loading="lazy"
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: ZAFlix.colors.textSecondary,
                        fontSize: 36,
                        fontWeight: 700,
                        background: ZAFlix.gradients.accentSoft
                    }}>
                        {hint.Name?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
                {hint.Type && !isPerson && (
                    <span style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(10,6,20,0.8)',
                        color: ZAFlix.colors.accentLight,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: `1px solid ${ZAFlix.colors.borderSubtle}`,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                    }}>
                        {hint.Type === BaseItemKind.Movie ? 'Movie' :
                         hint.Type === BaseItemKind.Series ? 'TV' :
                         hint.Type === BaseItemKind.Episode ? 'EP' : ''}
                    </span>
                )}
            </div>
            <div style={{ padding: '8px 2px' }}>
                <p style={{
                    margin: 0,
                    color: ZAFlix.colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>{hint.Name}</p>
                {hint.ProductionYear && (
                    <p style={{
                        margin: '2px 0 0',
                        color: ZAFlix.colors.textSecondary,
                        fontSize: 12
                    }}>{hint.ProductionYear}</p>
                )}
            </div>
        </div>
    );
});

const SearchPage: FC = () => {
    const navigate = useNavigate();
    const { __legacyApiClient__: apiClient } = useApi();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedSearchItemId, setSelectedSearchItemId] = useState<string | null>(null);
    const { data: selectedFullItem } = useItem(selectedSearchItemId || undefined);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: results, isLoading } = useSearch(debouncedQuery);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const groups = useMemo(() => {
        if (!results || results.length === 0) return [];
        const map = new Map<string, SearchHint[]>();
        for (const hint of results) {
            const label = GROUP_LABELS[hint.Type!] || hint.Type || 'Other';
            if (!map.has(label)) map.set(label, []);
            map.get(label)!.push(hint);
        }
        return GROUP_ORDER.filter(k => map.has(k)).map(k => ({ title: k, items: map.get(k)! }));
    }, [results]);

    const getImageUrl = (hint: SearchHint) => {
        if (!apiClient || !hint.Id) return '';
        return apiClient.getUrl(`Items/${hint.Id}/Images/Primary?quality=90${hint.PrimaryImageTag ? `&tag=${hint.PrimaryImageTag}` : ''}`);
    };

    const handleSelect = (hint: SearchHint) => {
        setSelectedSearchItemId(hint.Id || null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (query) { setQuery(''); return; }
            navigate(-1);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: ZAFlix.colors.bg,
            padding: '40px 24px',
            fontFamily: ZAFlix.fonts.body
        }}>
            <div style={{
                maxWidth: 900,
                margin: '0 auto'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: ZAFlix.colors.textSecondary,
                        cursor: 'pointer',
                        padding: '8px 0',
                        marginBottom: 24,
                        fontSize: 14,
                        fontFamily: ZAFlix.fonts.body,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <span style={{ fontSize: 18 }}>←</span> Back
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: ZAFlix.gradients.glassmorphism,
                    border: `1px solid ${ZAFlix.colors.border}`,
                    borderRadius: 12,
                    padding: '14px 20px',
                    marginBottom: 40,
                    backdropFilter: 'blur(20px)',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                }}>
                    <span style={{ fontSize: 20, flexShrink: 0, opacity: 0.5 }}>🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search movies, TV shows, people..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: ZAFlix.colors.textPrimary,
                            fontSize: 18,
                            fontFamily: ZAFlix.fonts.body,
                            caretColor: ZAFlix.colors.accent
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: ZAFlix.colors.textSecondary,
                                cursor: 'pointer',
                                fontSize: 18,
                                padding: '4px 8px',
                                borderRadius: '50%'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {!debouncedQuery && (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 20px',
                        color: ZAFlix.colors.textSecondary
                    }}>
                        <div style={{
                            width: 64, height: 64,
                            borderRadius: '50%',
                            background: ZAFlix.gradients.accentSoft,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: 28
                        }}>🎬</div>
                        <h2 style={{
                            color: ZAFlix.colors.textPrimary,
                            fontSize: 24,
                            fontWeight: 600,
                            fontFamily: ZAFlix.fonts.heading,
                            margin: '0 0 8px'
                        }}>Find something to watch</h2>
                        <p style={{ margin: 0, fontSize: 15 }}>Start typing to search across your media library</p>
                    </div>
                )}

                {debouncedQuery && isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i}>
                                <div className="skeleton-card" style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 16 }} />
                                <div style={{ display: 'flex', gap: 16, overflow: 'hidden' }}>
                                    {[1, 2, 3, 4, 5].map(j => <SkeletonCard key={j} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {debouncedQuery && !isLoading && groups.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 20px',
                        color: ZAFlix.colors.textSecondary
                    }}>
                        <div style={{
                            width: 64, height: 64,
                            borderRadius: '50%',
                            background: ZAFlix.gradients.accentSoft,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: 28
                        }}>🔍</div>
                        <h2 style={{
                            color: ZAFlix.colors.textPrimary,
                            fontSize: 24,
                            fontWeight: 600,
                            fontFamily: ZAFlix.fonts.heading,
                            margin: '0 0 8px'
                        }}>No results found</h2>
                        <p style={{ margin: 0, fontSize: 15 }}>Try a different search term</p>
                    </div>
                )}

                {debouncedQuery && !isLoading && groups.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                        {groups.map(group => (
                            <section key={group.title}>
                                <h3 style={{
                                    color: ZAFlix.colors.textPrimary,
                                    fontSize: 20,
                                    fontWeight: 600,
                                    fontFamily: ZAFlix.fonts.heading,
                                    margin: '0 0 16px'
                                }}>{group.title}</h3>
                                <div style={{
                                    display: 'flex',
                                    gap: 14,
                                    overflowX: 'auto',
                                    paddingBottom: 8,
                                    scrollSnapType: 'x mandatory',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                                    className="zaflix-hide-scrollbar"
                                >
                                    {group.items.map(hint => {
                                        const isPerson = hint.Type === BaseItemKind.Person || hint.Type === BaseItemKind.MusicArtist;
                                        const cardW = isPerson ? 130 : 170;
                                        const cardH = isPerson ? 170 : 255;
                                        return (
                                            <SearchCard
                                                key={hint.Id}
                                                hint={hint}
                                                cardW={cardW}
                                                cardH={cardH}
                                                isPerson={isPerson}
                                                onSelect={handleSelect}
                                                getImageUrl={getImageUrl}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
            {selectedFullItem && (
                <DetailsModal
                    item={selectedFullItem}
                    onClose={() => setSelectedSearchItemId(null)}
                />
            )}
        </div>
    );
};

export default SearchPage;
