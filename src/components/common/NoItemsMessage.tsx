import React, { type FC } from 'react';
import globalize from 'lib/globalize';

interface NoItemsMessageProps {
    message?: string;
    icon?: React.ReactNode;
}

const NoItemsMessage: FC<NoItemsMessageProps> = ({
    message = 'MessageNoItemsAvailable',
    icon
}) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#dcd9fd'
        }}>
            <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(211, 82, 255, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                fontSize: 36
            }}>
                {icon || '?'}
            </div>
            <h2 style={{
                color: '#ffffff',
                fontSize: 24,
                fontWeight: 600,
                fontFamily: 'Outfit, sans-serif',
                margin: '0 0 8px'
            }}>
                {globalize.translate('MessageNothingHere')}
            </h2>
            <p style={{
                margin: 0,
                fontSize: 15,
                color: '#dcd9fd',
                maxWidth: 400
            }}>
                {globalize.translate(message)}
            </p>
        </div>
    );
};

export default NoItemsMessage;
