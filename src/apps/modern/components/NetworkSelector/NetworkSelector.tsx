import React from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ZAFlix } from '../../styles/theme';

const GENRES = [
    'All', 'Action', 'Comedy', 'Drama', 'Thriller',
    'Science Fiction', 'Horror', 'Anime', 'Documentary',
    'Romance', 'Adventure', 'Fantasy'
];

interface GenreSelectorProps {
    selectedGenre: string | null;
    onGenreChange: (genre: string | null) => void;
}

const GenreSelector: React.FC<GenreSelectorProps> = ({ selectedGenre, onGenreChange }) => {
    const { isMobile } = useMediaQuery();

    return (
        <div
            className='zaflix-hide-scrollbar'
            style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                padding: '5px 0 15px 0',
                WebkitOverflowScrolling: 'touch',
                width: '100%',
                textAlign: 'left'
            }}
        >
            {GENRES.map((genre) => {
                const isActive = genre === 'All' ? selectedGenre === null : selectedGenre === genre;
                return (
                    <button
                        key={genre}
                        onClick={() => onGenreChange(genre === 'All' ? null : genre)}
                        style={{
                            flex: '0 0 auto',
                            padding: isMobile ? '6px 14px' : '8px 18px',
                            fontSize: isMobile ? '0.8rem' : '0.9rem',
                            fontWeight: 'bold',
                            color: isActive ? ZAFlix.colors.accent : ZAFlix.colors.textPrimary,
                            background: isActive ? 'rgba(194, 109, 240, 0.15)' : ZAFlix.colors.card,
                            border: `1.5px solid ${isActive ? ZAFlix.colors.accent : ZAFlix.colors.border}`,
                            borderRadius: ZAFlix.radii.chip,
                            cursor: 'pointer',
                            boxShadow: isActive ? ZAFlix.shadows.glow : '0 4px 10px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.borderColor = ZAFlix.colors.accent;
                                e.currentTarget.style.boxShadow = ZAFlix.shadows.glow;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.borderColor = ZAFlix.colors.border;
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {genre}
                    </button>
                );
            })}
        </div>
    );
};

export default GenreSelector;
