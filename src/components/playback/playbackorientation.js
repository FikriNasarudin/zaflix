import { playbackManager } from './playbackmanager';
import layoutManager from '../layoutManager';
import Events from '../../utils/events.ts';

let orientationLocked;

function onOrientationChangeSuccess() {
    orientationLocked = true;
}

function onOrientationChangeError(err) {
    orientationLocked = false;
    console.error('error locking orientation: ' + err);
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches;
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function shouldAutoOrientate() {
    return layoutManager.mobile || isStandalone() || isTouchDevice();
}

function requestFullscreenAndOrientation() {
    // On Capacitor Android, use native plugins for reliable orientation locking
    if (window.Capacitor?.isNativePlatform()) {
        if (window.Capacitor.Plugins?.ScreenOrientation) {
            window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'landscape' })
                .then(() => { orientationLocked = true; })
                .catch(err => { orientationLocked = false; console.error('Capacitor orientation lock failed:', err); });
        }
        if (window.Capacitor.Plugins?.StatusBar && window.appMode !== 'android-tv') {
            window.Capacitor.Plugins.StatusBar.hide();
        }
        return;
    }

    // Web fallback: request fullscreen
    const el = document.documentElement;
    const fsFn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fsFn && !document.fullscreenElement) {
        try {
            fsFn.call(el);
        } catch (e) {
            // User gesture may be missing or API not supported
        }
    }

    // Web fallback: orientation.lock
    const screenOrientation = window.screen.orientation || window.screen.mozOrientation || window.screen.msOrientation;
    if (screenOrientation?.lock) {
        try {
            const promise = screenOrientation.lock('landscape');
            if (promise?.then) {
                promise.then(onOrientationChangeSuccess, onOrientationChangeError);
            } else {
                orientationLocked = !!promise;
            }
            return;
        } catch (err) {
            onOrientationChangeError(err);
        }
    }

    // Fallback: prefixed lockOrientation (older Android / iOS)
    const legacyLock = window.screen.lockOrientation || window.screen.mozLockOrientation || window.screen.msLockOrientation;
    if (legacyLock) {
        try {
            const result = legacyLock('landscape');
            if (result?.then) {
                result.then(onOrientationChangeSuccess, onOrientationChangeError);
            } else {
                orientationLocked = !!result;
            }
        } catch (err) {
            onOrientationChangeError(err);
        }
    }
}

function exitFullscreenAndOrientation() {
    // On Capacitor Android, use native plugins to unlock orientation and restore status bar
    if (window.Capacitor?.isNativePlatform()) {
        if (orientationLocked && window.Capacitor.Plugins?.ScreenOrientation) {
            window.Capacitor.Plugins.ScreenOrientation.unlock().catch(err => {
                console.error('Capacitor orientation unlock failed:', err);
            });
        }
        if (window.Capacitor.Plugins?.StatusBar) {
            window.Capacitor.Plugins.StatusBar.show();
        }
        orientationLocked = false;
        return;
    }

    // Web fallback: exit fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        const exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exitFn) {
            try {
                exitFn.call(document);
            } catch (e) {
                // ignore
            }
        }
    }

    // Web fallback: unlock orientation
    if (orientationLocked) {
        const screenOrientation = window.screen.orientation || window.screen.mozOrientation || window.screen.msOrientation;
        if (screenOrientation?.unlock) {
            try {
                screenOrientation.unlock();
            } catch (e) {
                // ignore
            }
        } else {
            const legacyUnlock = window.screen.unlockOrientation || window.screen.mozUnlockOrientation || window.screen.msUnlockOrientation;
            if (legacyUnlock) {
                try {
                    legacyUnlock();
                } catch (e) {
                    // ignore
                }
            }
        }
        orientationLocked = false;
    }
}

Events.on(playbackManager, 'playbackstart', function (e, player) {
    const isLocalVideo = player.isLocalPlayer && !player.isExternalPlayer && playbackManager.isPlayingVideo(player);

    if (isLocalVideo && shouldAutoOrientate()) {
        requestFullscreenAndOrientation();
    }
});

Events.on(playbackManager, 'playbackstop', function (e, playbackStopInfo) {
    if (!playbackStopInfo.nextMediaType) {
        exitFullscreenAndOrientation();
    }
});
