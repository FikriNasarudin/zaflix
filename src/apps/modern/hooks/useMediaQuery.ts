import { useEffect, useState } from 'react';

import { ZAFlix } from '../styles/theme';

export const useMediaQuery = () => {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        isMobile: width < ZAFlix.breakpoints.mobile,
        isTablet: width >= ZAFlix.breakpoints.mobile && width < ZAFlix.breakpoints.tablet,
        isDesktop: width >= ZAFlix.breakpoints.tablet,
        width
    };
};
