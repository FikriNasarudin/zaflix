package com.zaflix.app

import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.getcapacitor.BridgeActivity
import com.zaflix.app.BuildConfig

class NativeShellBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun init(): String {
        val deviceId = android.provider.Settings.Secure.getString(
            activity.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "unknown"
        return """{"deviceId":"$deviceId","deviceName":"${activity.deviceName}"}"""
    }

    @JavascriptInterface
    fun deviceId(): String {
        return android.provider.Settings.Secure.getString(
            activity.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "unknown"
    }

    @JavascriptInterface
    fun deviceName(): String {
        return activity.deviceName
    }

    @JavascriptInterface
    fun appName(): String = "Zaflix"

    @JavascriptInterface
    fun appVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun exit() {
        activity.finishAndRemoveTask()
    }

    @JavascriptInterface
    fun supports(command: String): Boolean {
        return when (command.lowercase()) {
            "exit" -> true
            "externallinks" -> true
            "displaylanguage" -> true
            "displaymode" -> true
            "screensaver" -> true
            "subtitleappearance" -> true
            "subtitleburnin" -> true
            "fileinput" -> false
            "remotecontrol" -> true
            "remotevideo" -> true
            "fullscreen" -> true
            "htmlaudioautoplay" -> true
            "htmlvideoautoplay" -> true
            "physicalvolumecontrol" -> false
            "sharing" -> true
            "filedownload" -> true
            "chromecast" -> true
            else -> true
        }
    }

    @JavascriptInterface
    fun getDefaultLayout(): String = "modern"

    @JavascriptInterface
    fun getDeviceProfile(builder: String, version: String): String {
        return """{
  "MaxStreamingBitrate": 150000000,
  "MaxStaticBitrate": 150000000,
  "MusicStreamingTranscodingBitrate": 192000,
  "DirectPlayProfiles": [
    {"Container": "mp4,mkv,webm,avi,mov,ts", "Type": "Video", "VideoCodec": "h264,hevc,vp8,vp9,av1", "AudioCodec": "aac,mp3,ac3,eac3,flac,opus,vorbis,dts,dca"},
    {"Container": "mp4,mkv,ts", "Type": "Video", "VideoCodec": "h264,hevc,vp8,vp9,av1", "AudioCodec": "aac,mp3,ac3,eac3,flac,opus,vorbis", "SubtitleCodec": "srt,ass,ssa,pgs,vtt"},
    {"Container": "asf", "Type": "Video", "VideoCodec": "wmv2,wmv3,vc1"},
    {"Container": "m4v", "Type": "Video", "VideoCodec": "h264,hevc", "AudioCodec": "aac,ac3,eac3"}
  ],
  "TranscodingProfiles": [
    {"Container": "ts", "Type": "Video", "VideoCodec": "h264", "AudioCodec": "aac,ac3,eac3,mp3", "Context": "Streaming", "Protocol": "hls"},
    {"Container": "jpeg", "Type": "Photo", "Protocol": "http", "MaxWidth": 1920, "MaxHeight": 1080}
  ],
  "ContainerProfiles": [],
  "CodecProfiles": [
    {
      "Type": "Video",
      "Conditions": [
        {"Condition": "NotEqual", "Property": "IsAnamorphic", "Value": "true", "IsRequired": false},
        {"Condition": "EqualsAny", "Property": "VideoProfile", "Value": "high|main|baseline|high10|high422|high444", "IsRequired": false}
      ]
    }
  ],
  "ResponseProfiles": [],
  "SubtitleProfiles": [
    {"Format": "srt", "Method": "Embed"},
    {"Format": "ass", "Method": "Embed"},
    {"Format": "ssa", "Method": "Embed"},
    {"Format": "vtt", "Method": "External"},
    {"Format": "sub", "Method": "Embed"}
  ]
}"""
    }

    @JavascriptInterface
    fun screen(): String {
        val display = activity.windowManager.defaultDisplay
        val metrics = android.util.DisplayMetrics()
        display.getRealMetrics(metrics)
        return """{"width":${metrics.widthPixels},"height":${metrics.heightPixels}}"""
    }
}

class MainActivity : BridgeActivity() {
    val deviceName: String by lazy {
        "${Build.MANUFACTURER} ${Build.MODEL}"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        bridge.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }

        bridge.webView.addJavascriptInterface(
            NativeShellBridge(this),
            "NativeShell"
        )

        registerPlugin(ZaflixPlayerPlugin::class.java)

        val isTvFlavor = BuildConfig.FLAVOR == "tv"
        bridge.webView.evaluateJavascript(
            "window.appMode = 'android';" +
            "window.appModeTv = $isTvFlavor;" +
            "console.log('[Zaflix] appMode=android, appModeTv=' + window.appModeTv);",
            null
        )
    }
}
