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

function requestAutoFullscreen() {
    const el = document.documentElement;
    const fsFn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fsFn && !document.fullscreenElement) {
        try {
            fsFn.call(el);
        } catch (e) {
            // User gesture may be missing or API not supported
        }
    }
}

function exitAutoFullscreen() {
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
}

Events.on(playbackManager, 'playbackstart', function (e, player) {
    const isLocalVideo = player.isLocalPlayer && !player.isExternalPlayer && playbackManager.isPlayingVideo(player);

    if (isLocalVideo && shouldAutoOrientate()) {
        const lockOrientation = window.screen.lockOrientation || window.screen.mozLockOrientation || window.screen.msLockOrientation || (window.screen.orientation?.lock);

        if (lockOrientation) {
            try {
                const promise = lockOrientation('landscape');
                if (promise.then) {
                    promise.then(onOrientationChangeSuccess, onOrientationChangeError);
                } else {
                    // returns a boolean
                    orientationLocked = promise;
                }
            } catch (err) {
                onOrientationChangeError(err);
            }
        }

        requestAutoFullscreen();
    }
});

Events.on(playbackManager, 'playbackstop', function (e, playbackStopInfo) {
    if (orientationLocked && !playbackStopInfo.nextMediaType) {
        const unlockOrientation = window.screen.unlockOrientation || window.screen.mozUnlockOrientation || window.screen.msUnlockOrientation || (window.screen.orientation?.unlock);

        if (unlockOrientation) {
            try {
                unlockOrientation();
            } catch (err) {
                console.error('error unlocking orientation: ' + err);
            }
            orientationLocked = false;
        }
    }

    if (!playbackStopInfo.nextMediaType) {
        exitAutoFullscreen();
    }
});
