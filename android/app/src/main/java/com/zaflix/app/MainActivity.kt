package com.zaflix.app

import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

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
            else -> true
        }
    }

    @JavascriptInterface
    fun getDefaultLayout(): String = "modern"

    @JavascriptInterface
    fun getDeviceProfile(builder: String, version: String): String? {
        return null
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

        bridge.webView.evaluateJavascript(
            "window.appMode = 'android';" +
            "window.appModeTv = ${BuildConfig.FLAVOR == "tv"};" +
            "console.log('[Zaflix] appMode=android, appModeTv=' + window.appModeTv);",
            null
        )
    }
}
