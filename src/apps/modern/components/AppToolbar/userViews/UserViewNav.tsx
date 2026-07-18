import Button from '@mui/material/Button/Button';
import React, { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

const UserViewNav = () => {
    const location = useLocation();
    const [ searchParams ] = useSearchParams();

    // Determine active tab index
    const activeTab = useMemo(() => {
        if (location.pathname !== '/home') return -1;
        return parseInt(searchParams.get('tab') ?? '0', 10);
    }, [location.pathname, searchParams]);

    const navItems = [
        { name: 'Home', tab: 0 },
        { name: 'Movies', tab: 1 },
        { name: 'TV Shows', tab: 2 },
        { name: 'Anime', tab: 3 },
        { name: 'My List', tab: 4 },
        { name: 'Collections', tab: 5 }
    ];

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {navItems.map((item) => {
                const isActive = activeTab === item.tab;
                return (
                    <Button
                        key={item.name}
                        variant='text'
                        component={Link}
                        to={`/home?tab=${item.tab}`}
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 700,
                            fontSize: '1rem',
                            textTransform: 'none',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            transition: 'all 0.3s ease',
                            color: isActive ? '#c26df0' : 'rgba(255, 255, 255, 0.75)',
                            textShadow: isActive ? '0 0 12px rgba(194, 109, 240, 0.6)' : 'none',
                            background: isActive ? 'rgba(194, 109, 240, 0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        {item.name}
                    </Button>
                );
            })}
        </div>
    );
};

export default UserViewNav;
