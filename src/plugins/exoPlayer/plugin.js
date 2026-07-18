import { appHost } from '../../components/apphost';

let currentPosition = 0;
let currentDuration = 0;
let isPaused = false;
let isMutedState = false;
let currentVolume = 1;
let playbackRate = 1;
let src = null;
let playerListeners = {};
let timePollInterval = null;
let mediaStreams = null;

function hasNativePlayer() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ZaflixPlayer;
}

function native() {
    return window.Capacitor.Plugins.ZaflixPlayer;
}

function stopTimePoll() {
    if (timePollInterval) {
        clearInterval(timePollInterval);
        timePollInterval = null;
    }
}

window.ZaflixPlayer = {
    onEvent(eventName, data) {
        const listeners = playerListeners[eventName] || [];
        listeners.forEach(fn => fn(data));

        switch (eventName) {
            case 'onEnded':
                (playerListeners['ended'] || []).forEach(fn => fn({}));
                stopTimePoll();
                isPaused = true;
                break;
            case 'onError':
                (playerListeners['error'] || []).forEach(fn => fn({ error: data }));
                break;
        }
    },
    addEventListener(event, fn) {
        if (!playerListeners[event]) playerListeners[event] = [];
        playerListeners[event].push(fn);
    },
    removeEventListener(event, fn) {
        if (!playerListeners[event]) return;
        playerListeners[event] = playerListeners[event].filter(f => f !== fn);
    }
};

export default class ExoPlayerPlugin {
    constructor() {
        this.name = 'ExoPlayer';
        this.type = 'mediaplayer';
        this.id = 'exoplayer';
        this.priority = 0;
        this.isLocalPlayer = true;
    }

    canPlayMediaType(mediaType) {
        return mediaType === 'Video' || mediaType === 'VideoAudio';
    }

    async play(options) {
        if (!hasNativePlayer()) {
            throw new Error('Native ExoPlayer not available');
        }

        src = options.url || null;
        isPaused = false;
        mediaStreams = options.mediaSource?.MediaStreams || null;

        await native().loadSource({
            url: options.url,
            mimeType: options.mimeType || '',
            startPositionMs: (options.playerStartPositionTicks || 0) / 10000
        });

        const dur = await native().getDuration();
        currentDuration = dur.duration || 0;

        startTimePoll();
    }

    async stop(destroyPlayer) {
        stopTimePoll();
        if (hasNativePlayer()) {
            if (destroyPlayer) {
                await native().release();
            } else {
                await native().stop();
            }
        }
        src = null;
        currentPosition = 0;
    }

    async destroy() {
        stopTimePoll();
        if (hasNativePlayer()) {
            await native().release();
        }
        playerListeners = {};
        src = null;
    }

    currentTime(val) {
        if (val !== undefined) {
            currentPosition = val * 1000;
            if (hasNativePlayer()) {
                native().seek({ positionMs: currentPosition });
            }
            return val;
        }
        return currentPosition / 1000;
    }

    duration() {
        return currentDuration;
    }

    async pause() {
        isPaused = true;
        if (hasNativePlayer()) {
            await native().pause();
        }
    }

    async unpause() {
        isPaused = false;
        if (hasNativePlayer()) {
            await native().play();
        }
    }

    paused() {
        return isPaused;
    }

    currentSrc() {
        return src;
    }

    async setVolume(val) {
        currentVolume = val;
        if (hasNativePlayer()) {
            await native().setVolume({ volume: val });
        }
    }

    getVolume() {
        return currentVolume;
    }

    async setMute(mute) {
        isMutedState = mute;
        if (hasNativePlayer()) {
            await native().setMute({ muted: mute });
        }
    }

    isMuted() {
        return isMutedState;
    }

    volumeUp() {
        this.setVolume(Math.min(1, (this.getVolume() || 0) + 0.1));
    }

    volumeDown() {
        this.setVolume(Math.max(0, (this.getVolume() || 0) - 0.1));
    }

    setPlaybackRate(rate) {
        playbackRate = rate;
        if (hasNativePlayer()) {
            native().setRate({ rate });
        }
    }

    getPlaybackRate() {
        return playbackRate;
    }

    setSubtitleStreamIndex(index) {
        if (!hasNativePlayer()) return;
        let mapped = index;
        if (mediaStreams) {
            const textStreams = mediaStreams.filter(s => s.Type === 'Subtitle');
            const idx = textStreams.findIndex(s => s.Index === index);
            if (idx >= 0) mapped = idx;
        }
        native().setSubtitleStream({ index: mapped });
    }

    setAudioStreamIndex(index) {
        if (!hasNativePlayer()) return;
        let mapped = index;
        if (mediaStreams) {
            const audioStreams = mediaStreams.filter(s => s.Type === 'Audio');
            const idx = audioStreams.findIndex(s => s.Index === index);
            if (idx >= 0) mapped = idx;
        }
        native().setAudioStream({ index: mapped });
    }

    canSetAudioStreamIndex() {
        return true;
    }

    supports(feature) {
        return ['PictureInPicture', 'PlaybackRate'].indexOf(feature) === -1;
    }

    on(event, fn) {
        window.ZaflixPlayer.addEventListener(event, fn);
    }

    off(event, fn) {
        window.ZaflixPlayer.removeEventListener(event, fn);
    }

    getDeviceProfile(item) {
        return appHost.getDeviceProfile(item);
    }

    resume() {
        this.unpause();
    }

    seekable() {
        return true;
    }

    getBufferedRanges() {
        return [];
    }
}

function startTimePoll() {
    stopTimePoll();
    timePollInterval = setInterval(async () => {
        if (!hasNativePlayer()) return;
        try {
            const pos = await native().getPosition();
            const dur = await native().getDuration();
            currentPosition = pos.position || 0;
            currentDuration = dur.duration || 0;
            const listeners = playerListeners['timeupdate'] || [];
            listeners.forEach(fn => fn({
                currentTime: currentPosition / 1000,
                duration: currentDuration / 1000
            }));
        } catch (_) {}
    }, 250);
}
