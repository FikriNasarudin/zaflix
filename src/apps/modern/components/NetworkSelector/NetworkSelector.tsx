import React from 'react';

import { useApi } from 'hooks/useApi';
import Dashboard from 'utils/dashboard';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ZAFlix } from '../../styles/theme';

const NETWORKS = [
    { name: 'Netflix' },
    { name: 'Disney+' },
    { name: 'Hulu' },
    { name: 'HBO' },
    { name: 'Prime Video' },
    { name: 'Apple TV+' }
];

const NetworkSelector = () => {
    const { __legacyApiClient__: apiClient } = useApi();
    const { isMobile } = useMediaQuery();

    const handleNetworkClick = (networkName: string) => {
        if (!apiClient) return;

        apiClient.getItems(apiClient.getCurrentUserId(), {
            IncludeItemTypes: 'Studio',
            SearchTerm: networkName,
            Recursive: true
        }).then((result: any) => {
            if (result && result.Items && result.Items.length > 0) {
                const studio = result.Items[0];
                Dashboard.navigate(`details?id=${studio.Id}&serverId=${apiClient.serverId()}`);
            } else {
                Dashboard.navigate(`search?query=${encodeURIComponent(networkName)}`);
            }
        }).catch(() => {
            Dashboard.navigate(`search?query=${encodeURIComponent(networkName)}`);
        });
    };

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
            {NETWORKS.map((net) => (
                <button
                    key={net.name}
                    onClick={() => handleNetworkClick(net.name)}
                    style={{
                        flex: '0 0 auto',
                        padding: isMobile ? '6px 14px' : '8px 18px',
                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                        fontWeight: 'bold',
                        color: ZAFlix.colors.textPrimary,
                        background: ZAFlix.colors.card,
                        border: `1.5px solid ${ZAFlix.colors.border}`,
                        borderRadius: ZAFlix.radii.chip,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = ZAFlix.colors.accent;
                        e.currentTarget.style.boxShadow = ZAFlix.shadows.glow;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = ZAFlix.colors.border;
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    {net.name}
                </button>
            ))}
        </div>
    );
};

export default NetworkSelector;
