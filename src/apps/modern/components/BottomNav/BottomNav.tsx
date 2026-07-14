import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ZAFlix } from '../../styles/theme';

interface NavItem {
    label: string;
    icon: string;
    path: string;
    matchFn: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
    {
        label: 'Home',
        icon: '⌂',
        path: '/home',
        matchFn: (p) => p === '/home' || (p === '/home' && !p.includes('tab='))
    },
    {
        label: 'Movies',
        icon: '🎬',
        path: '/movies',
        matchFn: (p) => p.startsWith('/movies') || p.startsWith('/list') && p.includes('collectionType=movies')
    },
    {
        label: 'TV Shows',
        icon: '📺',
        path: '/tv',
        matchFn: (p) => p.startsWith('/tv') || p.startsWith('/list') && p.includes('collectionType=tvshows')
    },
    {
        label: 'My List',
        icon: '♡',
        path: '/home?tab=1',
        matchFn: (p) => p.includes('tab=1')
    },
    {
        label: 'Search',
        icon: '⌕',
        path: '/search',
        matchFn: (p) => p.startsWith('/search')
    }
];

const BottomNav: React.FC = () => {
    const { isMobile } = useMediaQuery();
    const location = useLocation();
    const navigate = useNavigate();

    if (!isMobile) return null;

    const activeIndex = NAV_ITEMS.findIndex((item) => item.matchFn(location.pathname + location.search));

    return (
        <nav
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                background: 'rgba(10, 6, 20, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: `1.5px solid ${ZAFlix.colors.border}`,
                zIndex: 1000,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
        >
            {NAV_ITEMS.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.path)}
                        aria-label={item.label}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            color: isActive ? ZAFlix.colors.accent : ZAFlix.colors.textSecondary,
                            transition: 'color 0.2s ease',
                            fontFamily: ZAFlix.fonts.body
                        }}
                    >
                        <span style={{
                            fontSize: '22px',
                            lineHeight: 1,
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(194, 109, 240, 0.5))' : 'none'
                        }}>
                            {item.icon}
                        </span>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: '0.3px'
                        }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
