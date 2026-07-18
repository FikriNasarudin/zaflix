import React from 'react';
import { ZAFlix } from '../../styles/theme';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export const CardSkeleton: React.FC<{ width?: string }> = ({ width }) => {
    const { isMobile, isTablet } = useMediaQuery();
    const cardWidth = width || (isMobile ? '105px' : isTablet ? '135px' : '150px');

    return (
        <div style={{ flex: '0 0 auto', width: cardWidth }}>
            <div
                className='skeleton-card'
                style={{
                    width: '100%',
                    paddingTop: '150%',
                    borderRadius: ZAFlix.radii.card,
                    border: '1px solid rgba(211, 82, 255, 0.08)'
                }}
            />
            <div className='skeleton-card' style={{ width: '70%', height: 12, borderRadius: 4, marginTop: 6 }} />
        </div>
    );
};

export const RowSkeleton: React.FC = () => {
    const { isMobile } = useMediaQuery();
    return (
        <div style={{ marginBottom: '30px', textAlign: 'left' }}>
            <div className='skeleton-card' style={{ width: isMobile ? '140px' : '200px', height: 20, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden', padding: '8px 2px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

export const BillboardSkeleton: React.FC = () => {
    const { isMobile } = useMediaQuery();
    return (
        <div style={{
            width: '100%',
            height: isMobile ? '280px' : '500px',
            borderRadius: ZAFlix.radii.modal,
            overflow: 'hidden',
            marginBottom: '20px',
            position: 'relative'
        }}>
            <div className='skeleton-card' style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '40px',
                left: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div className='skeleton-card' style={{ width: '300px', height: 32, borderRadius: 4 }} />
                <div className='skeleton-card' style={{ width: '200px', height: 16, borderRadius: 4 }} />
                <div className='skeleton-card' style={{ width: '120px', height: 36, borderRadius: 20 }} />
            </div>
        </div>
    );
};
