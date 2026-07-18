import React, { StrictMode, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import { type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import OffsetAppBar from 'components/OffsetAppBar';
import ThemeCss from 'components/ThemeCss';
import { useApi } from 'hooks/useApi';

import AppToolbar from './components/AppToolbar';
import BottomNav from './components/BottomNav/BottomNav';
import AppDrawer, { isDrawerPath } from './components/drawers/AppDrawer';
import LibraryToolbar from './features/libraries/components/LibraryToolbar';
import { LibraryProvider } from './features/libraries/hooks/useLibrary';
import { isLibraryPath } from './features/libraries/utils/path';
import { useScrollToTop } from './hooks/useScrollToTop';

import './AppOverrides.scss';
import './styles/modern.styles.css';

export const Component = () => {
    const [ isDrawerActive, setIsDrawerActive ] = useState(false);
    const { user } = useApi();
    const location = useLocation();

    useScrollToTop();

    const isMediumScreen = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const isDrawerAvailable = isDrawerPath(location.pathname) && Boolean(user) && !isMediumScreen;
    const isDrawerOpen = isDrawerActive && isDrawerAvailable;

    const onToggleDrawer = useCallback(() => {
        setIsDrawerActive(!isDrawerActive);
    }, [ isDrawerActive, setIsDrawerActive ]);

    return (
        <LibraryProvider>
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                }}
            >
                <a href='#main-content' className='zaflix-skip-link'>
                    Skip to content
                </a>
                <StrictMode>
                    <OffsetAppBar dense elevation={4}>
                        <AppToolbar
                            isDrawerAvailable={!isMediumScreen && isDrawerAvailable}
                            isDrawerOpen={isDrawerOpen}
                            onDrawerButtonClick={onToggleDrawer}
                        />
                        {isLibraryPath(location.pathname) && <LibraryToolbar />}
                    </OffsetAppBar>

                    {
                        isDrawerAvailable && (
                            <AppDrawer
                                open={isDrawerOpen}
                                onClose={onToggleDrawer}
                                onOpen={onToggleDrawer}
                            />
                        )
                    }
                </StrictMode>

                <Box
                    component='main'
                    id='main-content'
                    sx={{
                        position: 'relative',
                        width: '100%',
                        flexGrow: 1,
                        paddingBottom: { xs: '60px', md: 0 }
                    }}
                >
                    <AppBody>
                        <div className='zaflix-page-transition' key={location.pathname}>
                            <Outlet />
                        </div>
                    </AppBody>
                </Box>
                <BottomNav />
            </Box>
            <ThemeCss />
            <CustomCss />
        </LibraryProvider>
    );
};
