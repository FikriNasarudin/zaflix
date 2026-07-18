export const ZAFlix = {
    colors: {
        bg: '#0a0614',
        bgLight: '#0f0a1e',
        card: '#140d27',
        cardHover: '#1a1035',
        accent: '#c26df0',
        accentDark: '#8c3bb8',
        accentLight: '#d991ff',
        accentHover: 'rgba(194, 109, 240, 0.2)',
        cyan: '#00f0ff',
        textPrimary: '#ffffff',
        textSecondary: '#dcd9fd',
        border: 'rgba(211, 82, 255, 0.25)',
        borderSubtle: 'rgba(211, 82, 255, 0.12)',
        borderHover: 'rgba(211, 82, 255, 0.4)',
        overlay: 'rgba(5, 3, 10, 0.94)',
        red: '#ff2d55'
    },
    gradients: {
        accent: 'linear-gradient(135deg, #00f0ff 0%, #d352ff 100%)',
        accentSoft: 'linear-gradient(135deg, rgba(211, 82, 255, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
        backdropLeft: 'linear-gradient(to right, rgba(10, 6, 20, 0.95) 0%, rgba(10, 6, 20, 0.7) 50%, rgba(10, 6, 20, 0) 100%)',
        backdropBottom: 'linear-gradient(to top, rgba(10, 6, 20, 1) 0%, rgba(10, 6, 20, 0.2) 60%, rgba(10, 6, 20, 0) 100%)',
        modalBottom: 'linear-gradient(to top, #0a0614 0%, rgba(10, 6, 20, 0.2) 80%, rgba(10, 6, 20, 0) 100%)',
        cardOverlay: 'linear-gradient(to top, rgba(10, 6, 20, 0.5) 0%, rgba(10, 6, 20, 0) 40%)',
        glassmorphism: 'rgba(10, 6, 20, 0.55)'
    },
    shadows: {
        card: '0 4px 15px rgba(0,0,0,0.5)',
        cardHover: '0 8px 25px rgba(0,0,0,0.7), 0 0 15px rgba(194, 109, 240, 0.2)',
        glow: '0 0 12px rgba(194, 109, 240, 0.4)',
        glowStrong: '0 0 20px rgba(211, 82, 255, 0.4)',
        button: '0 4px 15px rgba(211, 82, 255, 0.4)',
        modal: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(211, 82, 255, 0.2)',
        textGlow: '0 0 10px rgba(211, 82, 255, 0.5)',
        textGlowSubtle: '0 0 10px rgba(194, 109, 240, 0.25)'
    },
    radii: {
        card: '8px',
        button: '6px',
        chip: '20px',
        modal: '12px',
        circle: '50%'
    },
    breakpoints: {
        mobile: 600,
        tablet: 1024,
        desktop: 1200
    },
    fonts: {
        heading: 'Outfit, sans-serif',
        body: 'Inter, sans-serif'
    }
} as const;

// Shared in-memory cache for API responses (used by Billboard, MediaRow, etc.)
const apiCache = new Map<string, any>();

export function getCacheKey(...parts: (string | undefined | null)[]) {
    return parts.filter(Boolean).join('_');
}

export function getCached<T = any>(key: string): T | undefined {
    return apiCache.get(key) as T | undefined;
}

export function setCache(key: string, value: any) {
    apiCache.set(key, value);
}
