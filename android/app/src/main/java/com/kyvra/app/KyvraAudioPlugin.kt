package com.kyvra.app

import android.content.ComponentName
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.common.util.concurrent.MoreExecutors

@CapacitorPlugin(name = "KyvraAudio")
class KyvraAudioPlugin : Plugin() {

    private var controller: MediaController? = null

    override fun load() {
        val sessionToken = SessionToken(
            context,
            ComponentName(context, KyvraPlaybackService::class.java)
        )
        val future = MediaController.Builder(context, sessionToken).buildAsync()
        future.addListener({
            controller = future.get()
            controller?.addListener(playerListener)
        }, MoreExecutors.directExecutor())
    }

    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            val data = JSObject()
            data.put("isPlaying", isPlaying)
            notifyListeners("playbackStateChanged", data)
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val data = JSObject()
            data.put("mediaId", mediaItem?.mediaId ?: "")
            notifyListeners("trackChanged", data)
        }

        override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
            val data = JSObject()
            data.put("message", error.message ?: "unknown error")
            notifyListeners("playbackError", data)
        }
    }

    // Define a fila inteira de faixas que serão tocadas
    @PluginMethod
    fun setQueue(call: PluginCall) {
        val tracksArray: JSArray = call.getArray("tracks") ?: JSArray()
        val startIndex = call.getInt("startIndex", 0) ?: 0

        val mediaItems = mutableListOf<MediaItem>()
        for (i in 0 until tracksArray.length()) {
            val t = tracksArray.getJSONObject(i)
            val metadata = MediaMetadata.Builder()
                .setTitle(t.getString("title"))
                .setArtist(t.optString("artist", "Kyvra"))
                .setAlbumTitle(t.optString("albumTitle", ""))
                .setArtworkUri(Uri.parse(t.getString("coverUrl")))
                .build()

            mediaItems.add(
                MediaItem.Builder()
                    .setMediaId(t.getString("id"))
                    .setUri(t.getString("audioUrl"))
                    .setMediaMetadata(metadata)
                    .build()
            )
        }

        activity.runOnUiThread {
            controller?.setMediaItems(mediaItems, startIndex, 0L)
            controller?.prepare()
            controller?.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        activity.runOnUiThread {
            controller?.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity.runOnUiThread {
            controller?.pause()
            call.resolve()
        }
    }

    @PluginMethod
    fun skipToNext(call: PluginCall) {
        activity.runOnUiThread {
            controller?.seekToNext()
            call.resolve()
        }
    }

    @PluginMethod
    fun skipToPrevious(call: PluginCall) {
        activity.runOnUiThread {
            controller?.seekToPrevious()
            call.resolve()
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = call.getLong("positionMs") ?: 0L
        activity.runOnUiThread {
            controller?.seekTo(positionMs)
            call.resolve()
        }
    }

    @PluginMethod
    fun getPosition(call: PluginCall) {
        activity.runOnUiThread {
            val ret = JSObject()
            ret.put("positionMs", controller?.currentPosition ?: 0L)
            ret.put("durationMs", controller?.duration ?: 0L)
            ret.put("isPlaying", controller?.isPlaying ?: false)
            call.resolve(ret)
        }
    }
}
