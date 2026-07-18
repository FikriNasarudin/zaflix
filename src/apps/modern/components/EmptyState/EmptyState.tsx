import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ZAFlix } from '../../styles/theme';

interface EmptyStateProps {
    icon?: string;
    title: string;
    message: string;
    suggestions?: { label: string; path: string }[];
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = '🎬', title, message, suggestions }) => {
    const navigate = useNavigate();

    return (
        <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: ZAFlix.colors.textSecondary
        }}>
            <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: ZAFlix.gradients.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 32
            }}>{icon}</div>
            <h2 style={{
                color: ZAFlix.colors.textPrimary,
                fontSize: 22,
                fontWeight: 600,
                fontFamily: ZAFlix.fonts.heading,
                margin: '0 0 8px'
            }}>{title}</h2>
            <p style={{
                margin: '0 0 24px',
                fontSize: 15,
                maxWidth: 400,
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.5
            }}>{message}</p>
            {suggestions && suggestions.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {suggestions.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => navigate(s.path)}
                            style={{
                                padding: '8px 18px',
                                background: 'rgba(194, 109, 240, 0.12)',
                                border: `1px solid ${ZAFlix.colors.border}`,
                                borderRadius: 20,
                                color: ZAFlix.colors.accentLight,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(194, 109, 240, 0.25)';
                                e.currentTarget.style.borderColor = ZAFlix.colors.accent;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(194, 109, 240, 0.12)';
                                e.currentTarget.style.borderColor = ZAFlix.colors.border;
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(EmptyState);
