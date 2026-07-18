import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HomeIcon from '@mui/icons-material/Home';
import MovieIcon from '@mui/icons-material/Movie';
import SearchIcon from '@mui/icons-material/Search';
import TvIcon from '@mui/icons-material/Tv';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { hapticLight } from '../../../../utils/haptics';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ZAFlix } from '../../styles/theme';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    matchFn: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
    {
        label: 'Home',
        icon: <HomeIcon />,
        path: '/home',
        matchFn: (p) => p === '/home' || (p === '/home' && !p.includes('tab='))
    },
    {
        label: 'Movies',
        icon: <MovieIcon />,
        path: '/home?tab=1',
        matchFn: (p) => p.includes('tab=1')
    },
    {
        label: 'TV Shows',
        icon: <TvIcon />,
        path: '/home?tab=2',
        matchFn: (p) => p.includes('tab=2')
    },
    {
        label: 'My List',
        icon: <FavoriteBorderIcon />,
        path: '/home?tab=4',
        matchFn: (p) => p.includes('tab=4')
    },
    {
        label: 'Search',
        icon: <SearchIcon />,
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
                        onClick={() => {
                            hapticLight();
                            navigate(item.path);
                        }}
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
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(194, 109, 240, 0.5))' : 'none',
                            display: 'flex'
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
