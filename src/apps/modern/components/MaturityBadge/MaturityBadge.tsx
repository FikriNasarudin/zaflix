import React from 'react';

import { ZAFlix } from '../../styles/theme';

const RATING_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'G':       { bg: 'rgba(76, 175, 80, 0.2)',  border: 'rgba(76, 175, 80, 0.5)',  text: '#81c784' },
    'PG':      { bg: 'rgba(255, 193, 7, 0.2)',  border: 'rgba(255, 193, 7, 0.5)',  text: '#ffd54f' },
    'PG-13':   { bg: 'rgba(255, 152, 0, 0.2)',  border: 'rgba(255, 152, 0, 0.5)',  text: '#ffb74d' },
    'R':       { bg: 'rgba(244, 67, 54, 0.2)',  border: 'rgba(244, 67, 54, 0.5)',  text: '#e57373' },
    'NC-17':   { bg: 'rgba(183, 28, 28, 0.2)',  border: 'rgba(183, 28, 28, 0.5)',  text: '#ef5350' },
    'TV-Y':    { bg: 'rgba(76, 175, 80, 0.2)',  border: 'rgba(76, 175, 80, 0.5)',  text: '#81c784' },
    'TV-Y7':   { bg: 'rgba(139, 195, 74, 0.2)', border: 'rgba(139, 195, 74, 0.5)', text: '#aed581' },
    'TV-G':    { bg: 'rgba(76, 175, 80, 0.2)',  border: 'rgba(76, 175, 80, 0.5)',  text: '#81c784' },
    'TV-PG':   { bg: 'rgba(255, 193, 7, 0.2)',  border: 'rgba(255, 193, 7, 0.5)',  text: '#ffd54f' },
    'TV-14':   { bg: 'rgba(255, 152, 0, 0.2)',  border: 'rgba(255, 152, 0, 0.5)',  text: '#ffb74d' },
    'TV-MA':   { bg: 'rgba(244, 67, 54, 0.2)',  border: 'rgba(244, 67, 54, 0.5)',  text: '#e57373' },
    'NR':      { bg: 'rgba(158, 158, 158, 0.2)', border: 'rgba(158, 158, 158, 0.5)', text: '#bdbdbd' }
};

const DEFAULT_COLOR = { bg: 'rgba(158, 158, 158, 0.15)', border: 'rgba(158, 158, 158, 0.3)', text: '#9e9e9e' };

interface MaturityBadgeProps {
    rating?: string | null;
    style?: React.CSSProperties;
}

const MaturityBadge: React.FC<MaturityBadgeProps> = ({ rating, style }) => {
    if (!rating) return null;

    const colors = RATING_COLORS[rating] || DEFAULT_COLOR;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: colors.text,
            lineHeight: '1.4',
            letterSpacing: '0.5px',
            ...style
        }}>
            {rating}
        </span>
    );
};

export default React.memo(MaturityBadge);
