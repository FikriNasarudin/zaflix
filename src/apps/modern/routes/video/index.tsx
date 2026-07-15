import Box from '@mui/material/Box/Box';
import Fade from '@mui/material/Fade/Fade';
import React, { useRef, type FC, useEffect, useState } from 'react';

import RemotePlayButton from 'apps/modern/components/AppToolbar/RemotePlayButton';
import SyncPlayButton from 'apps/modern/components/AppToolbar/SyncPlayButton';
import AppToolbar from 'components/toolbar/AppToolbar';
import ViewManagerPage from 'components/viewManager/ViewManagerPage';
import { EventType } from 'constants/eventType';
import Events, { type Event } from 'utils/events';
import Typography from '@mui/material/Typography';

import EndScreen from '../../components/VideoPlayer/EndScreen';
import { ZAFlix } from '../../styles/theme';

const SHORTCUT_HINTS = [
    { key: 'Space', label: 'Play/Pause' },
    { key: 'J', label: 'Rewind 10s' },
    { key: 'L', label: 'Forward 10s' },
    { key: 'F', label: 'Fullscreen' },
    { key: 'M', label: 'Mute' }
];

/**
 * Video player page component that renders mui controls for the top controls and the legacy view for everything else.
 */
const VideoPage: FC = () => {
    const documentRef = useRef<Document>(document);
    const [ isVisible, setIsVisible ] = useState(true);
    const [ videoTitle, setVideoTitle ] = useState<string>('');
    const [ showShortcuts, setShowShortcuts ] = useState(false);

    const onShowVideoOsd = (_e: Event, isShowing: boolean) => {
        setIsVisible(isShowing);
    };

    const onTitleChange = (_e: Event, title: string) => {
        setVideoTitle(title);
        if (title) {
            setShowShortcuts(true);
            setTimeout(() => setShowShortcuts(false), 5000);
        }
    };

    useEffect(() => {
        const doc = documentRef.current;

        if (doc) {
            Events.on(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
            Events.on(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
        }

        // Lazy-load playbackorientation to break circular dependency:
        // playbackmanager.js side-effect imports eventually require playbackorientation.js
        // at module-evaluation time, before the PlaybackManager singleton is created.
        import('components/playback/playbackorientation');

        return () => {
            if (doc) {
                Events.off(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
                Events.off(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
            }
        };
    }, []);

    return (
        <>
            <Fade
                in={isVisible}
                easing='fade-out'
            >
                <Box
                    className='skinHeader skinHeader-withBackground skinHeader-blurred osdHeader'
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        color: 'white',
                        pointerEvents: 'unset !important',
                        background: 'rgba(10, 6, 20, 0.55)',
                        backdropFilter: 'blur(25px)',
                        borderBottom: '1.5px solid rgba(211, 82, 255, 0.12)'
                    }}
                >
                    <AppToolbar
                        isDrawerAvailable={false}
                        isDrawerOpen={false}
                        isBackButtonAvailable
                        isUserMenuAvailable={false}
                        buttons={
                            <>
                                <SyncPlayButton />
                                <RemotePlayButton />
                            </>
                        }
                        className='padded-left padded-right'
                    >
                        <Typography
                            sx={{
                                fontFamily: ZAFlix.fonts.heading,
                                fontWeight: 700,
                                textShadow: ZAFlix.shadows.textGlowSubtle,
                                fontSize: '1.1rem'
                            }}
                        >
                            {videoTitle}
                        </Typography>
                    </AppToolbar>
                </Box>
            </Fade>

            {/* Keyboard shortcut hints toast */}
            <Fade in={showShortcuts && isVisible}>
                <div style={{
                    position: 'absolute',
                    top: '70px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    maxWidth: '90%'
                }}>
                    {SHORTCUT_HINTS.map(hint => (
                        <div
                            key={hint.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(10, 6, 20, 0.7)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(211, 82, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                color: ZAFlix.colors.textSecondary
                            }}
                        >
                            <kbd style={{
                                background: 'rgba(211, 82, 255, 0.15)',
                                borderRadius: '3px',
                                padding: '1px 6px',
                                fontFamily: 'inherit',
                                fontWeight: 700,
                                color: ZAFlix.colors.accentLight,
                                fontSize: '10px'
                            }}>{hint.key}</kbd>
                            <span>{hint.label}</span>
                        </div>
                    ))}
                </div>
            </Fade>

            <ViewManagerPage
                controller='playback/video/index'
                view='playback/video/index.html'
                type='video-osd'
                isFullscreen
                isNowPlayingBarEnabled={false}
                isThemeMediaSupported
            />

            <EndScreen />
        </>
    );
};

export default VideoPage;
