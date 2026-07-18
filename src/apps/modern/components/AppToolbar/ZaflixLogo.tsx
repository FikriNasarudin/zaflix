import React, { FC } from 'react';
import { Link } from 'react-router-dom';

const ZaflixLogo: FC = () => {
    return (
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: '24px' }}>
            <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '1.7rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                display: 'inline-block'
            }}>
                <span style={{
                    background: 'linear-gradient(135deg, #00d2ff 0%, #00a8ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>ZA</span>
                <span style={{
                    background: 'linear-gradient(135deg, #9b51e0 0%, #e040fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>FLIX</span>
            </span>
        </Link>
    );
};

export default ZaflixLogo;
