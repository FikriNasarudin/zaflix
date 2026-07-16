package com.zaflix.app

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.exoplayer.source.hls.HlsMediaSource
import androidx.media3.exoplayer.source.dash.DashMediaSource
import androidx.media3.exoplayer.source.smoothstreaming.SsMediaSource
import androidx.media3.exoplayer.drm.DefaultDrmSessionManagerProvider
import androidx.media3.exoplayer.drm.DrmSessionManagerProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.common.MimeTypes
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

@CapacitorPlugin(name = "ZaflixPlayer")
@UnstableApi
class ZaflixPlayerPlugin : Plugin() {

    private var player: ExoPlayer? = null
    private var positionTracker: Thread? = null
    private var running = false

    override fun load() {
        super.load()
        initPlayer()
    }

    private fun initPlayer() {
        val context = activity ?: return
        player = ExoPlayer.Builder(context).build().also { exo ->
            exo.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    val state = when (playbackState) {
                        Player.STATE_READY -> "ready"
                        Player.STATE_BUFFERING -> "buffering"
                        Player.STATE_ENDED -> "ended"
                        Player.STATE_IDLE -> "idle"
                        else -> "unknown"
                    }
                    notifyJS("onPlaybackStateChanged", JSONObject().apply {
                        put("state", state)
                    })

                    if (playbackState == Player.STATE_ENDED) {
                        notifyJS("onEnded", JSONObject())
                        stopPositionTracker()
                    }
                }

                override fun onPlayerError(error: PlaybackException) {
                    notifyJS("onError", JSONObject().apply {
                        put("code", error.errorCodeName)
                        put("message", error.localizedMessage ?: "Unknown error")
                    })
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    notifyJS("onIsPlayingChanged", JSONObject().apply {
                        put("isPlaying", isPlaying)
                    })
                }
            })
        }
    }

    @PluginMethod
    fun loadSource(call: PluginCall) {
        val url = call.getString("url") ?: return call.reject("url is required")
        val mimeType = call.getString("mimeType") ?: ""
        val drmScheme = call.getString("drmScheme") ?: ""
        val drmLicenseUrl = call.getString("drmLicenseUrl") ?: ""
        val startPositionMs = call.getDouble("startPositionMs", 0.0).toLong()

        val player = player ?: run {
            initPlayer()
            this.player
        } ?: return call.reject("player not initialized")

        val dataSourceFactory = DefaultDataSource.Factory(
            context,
            DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setUserAgent("Zaflix/1.0")
        )

        val mediaSource = buildMediaSource(dataSourceFactory, Uri.parse(url), mimeType, drmScheme, drmLicenseUrl)

        val mediaItem = MediaItem.Builder()
            .setMediaId(url)
            .setUri(url)
            .build()

        player.setMediaSource(mediaSource)
        player.seekTo(startPositionMs)
        player.prepare()
        player.play()

        startPositionTracker()
        call.resolve()
    }

    private fun buildMediaSource(
        dataSourceFactory: DefaultDataSource.Factory,
        uri: Uri,
        mimeType: String,
        drmScheme: String,
        drmLicenseUrl: String
    ): MediaSource {
        return when {
            mimeType.contains("hls") || mimeType.contains("x-mpegurl") || mimeType == "application/x-mpegURL" ->
                HlsMediaSource.Factory(dataSourceFactory).createMediaSource(uri)
            mimeType.contains("dash") || mimeType.contains("mpd") || mimeType == "application/dash+xml" ->
                DashMediaSource.Factory(dataSourceFactory).createMediaSource(uri)
            mimeType.contains("ss") || mimeType == "application/vnd.ms-sstr+xml" ->
                SsMediaSource.Factory(dataSourceFactory).createMediaSource(uri)
            else ->
                ProgressiveMediaSource.Factory(dataSourceFactory).createMediaSource(uri)
        }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        player?.play()
        call.resolve()
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        player?.pause()
        call.resolve()
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        player?.stop()
        stopPositionTracker()
        call.resolve()
    }

    @PluginMethod
    fun release(call: PluginCall) {
        stopPositionTracker()
        player?.release()
        player = null
        call.resolve()
    }

    @PluginMethod
    fun seek(call: PluginCall) {
        val positionMs = call.getDouble("positionMs", 0.0).toLong()
        player?.seekTo(positionMs)
        call.resolve()
    }

    @PluginMethod
    fun getPosition(call: PluginCall) {
        val pos = player?.currentPosition ?: 0L
        call.resolve(JSONObject().apply { put("position", pos.toDouble()) })
    }

    @PluginMethod
    fun getDuration(call: PluginCall) {
        val dur = player?.duration ?: 0L
        call.resolve(JSONObject().apply { put("duration", dur.toDouble()) })
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val vol = call.getFloat("volume", 1.0f).coerceIn(0f, 1f)
        player?.volume = vol
        call.resolve()
    }

    @PluginMethod
    fun getVolume(call: PluginCall) {
        val vol = player?.volume ?: 1f
        call.resolve(JSONObject().apply { put("volume", vol.toDouble()) })
    }

    @PluginMethod
    fun setMute(call: PluginCall) {
        val muted = call.getBoolean("muted", false)
        player?.volume = if (muted) 0f else 1f
        call.resolve()
    }

    @PluginMethod
    fun setRate(call: PluginCall) {
        val rate = call.getFloat("rate", 1.0f)
        player?.setPlaybackSpeed(rate)
        call.resolve()
    }

    @PluginMethod
    fun getRate(call: PluginCall) {
        val rate = player?.playbackParameters?.speed ?: 1f
        call.resolve(JSONObject().apply { put("rate", rate.toDouble()) })
    }

    @PluginMethod
    fun setSubtitleStream(call: PluginCall) {
        val index = call.getInt("index", -1)
        if (index >= 0) {
            player?.trackSelectionParameters = player?.trackSelectionParameters
                ?.buildUpon()
                ?.setPreferredTextLanguage(null)
                ?.setDisabledTrackTypes(setOf(C.TRACK_TYPE_TEXT))
                ?.apply {
                    if (index < player?.trackInfo?.trackGroups?.length ?: 0) {
                        val group = player?.trackInfo?.trackGroups?.get(index)
                        if (group != null) {
                            selectTracks(
                                setOf(C.TRACK_TYPE_TEXT),
                                group.type,
                                group.getFormat(0).language,
                                group.getFormat(0).sampleMimeType,
                                true
                            )
                        }
                    }
                }
                ?.build()
        }
        call.resolve()
    }

    @PluginMethod
    fun setAudioStream(call: PluginCall) {
        val index = call.getInt("index", -1)
        if (index >= 0) {
            player?.trackSelectionParameters = player?.trackSelectionParameters
                ?.buildUpon()
                ?.setPreferredAudioLanguage(null)
                ?.apply {
                    if (index < player?.trackInfo?.trackGroups?.length ?: 0) {
                        val group = player?.trackInfo?.trackGroups?.get(index)
                        if (group != null) {
                            selectTracks(
                                setOf(C.TRACK_TYPE_AUDIO),
                                group.type,
                                group.getFormat(0).language,
                                null,
                                true
                            )
                        }
                    }
                }
                ?.build()
        }
        call.resolve()
    }

    @PluginMethod
    fun getTracks(call: PluginCall) {
        val trackInfo = player?.trackInfo
        val audioTracks = mutableListOf<JSONObject>()
        val textTracks = mutableListOf<JSONObject>()

        if (trackInfo != null) {
            for (i in 0 until trackInfo.trackGroups.length) {
                val group = trackInfo.trackGroups[i]
                val format = group.getFormat(0)
                val track = JSONObject().apply {
                    put("index", i)
                    put("language", format.language ?: "")
                    put("label", format.label ?: format.language ?: "Track $i")
                    put("mimeType", format.sampleMimeType ?: "")
                }
                when (format.type) {
                    C.TRACK_TYPE_AUDIO -> audioTracks.add(track)
                    C.TRACK_TYPE_TEXT -> textTracks.add(track)
                }
            }
        }

        call.resolve(JSONObject().apply {
            put("audioTracks", audioTracks.toTypedArray())
            put("textTracks", textTracks.toTypedArray())
        })
    }

    private fun startPositionTracker() {
        stopPositionTracker()
        running = true
        positionTracker = Thread {
            while (running) {
                val pos = player?.currentPosition ?: 0L
                val dur = player?.duration ?: 0L
                val isPlaying = player?.isPlaying ?: false

                notifyJS("onTimeUpdate", JSONObject().apply {
                    put("position", pos.toDouble())
                    put("duration", dur.toDouble())
                    put("isPlaying", isPlaying)
                })

                try {
                    Thread.sleep(250)
                } catch (_: InterruptedException) {
                    break
                }
            }
        }.also { it.start() }
    }

    private fun stopPositionTracker() {
        running = false
        positionTracker?.interrupt()
        positionTracker = null
    }

    private fun notifyJS(eventName: String, data: JSONObject) {
        bridge?.let { bridge ->
            val js = "window.ZaflixPlayer && window.ZaflixPlayer.onEvent && window.ZaflixPlayer.onEvent('$eventName', $data)"
            bridge.webView.evaluateJavascript(js, null)
        }
    }

    override fun handleOnDestroy() {
        stopPositionTracker()
        player?.release()
        player = null
        super.handleOnDestroy()
    }
}
