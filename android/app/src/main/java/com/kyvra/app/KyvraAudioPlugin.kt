package com.kyvra.app

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import androidx.core.content.ContextCompat
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
import java.util.concurrent.ConcurrentLinkedQueue

@CapacitorPlugin(name = "KyvraAudio")
class KyvraAudioPlugin : Plugin() {

    private var controller: MediaController? = null
    private val pendingActions = ConcurrentLinkedQueue<(MediaController) -> Unit>()

    override fun load() {
        val sessionToken = SessionToken(
            context,
            ComponentName(context, KyvraPlaybackService::class.java)
        )
        val future = MediaController.Builder(context, sessionToken).buildAsync()
        future.addListener({
            try {
                val ctrl = future.get()
                controller = ctrl
                ctrl.addListener(playerListener)
                
                // Execute any queued commands buffered during app startup
                while (!pendingActions.isEmpty()) {
                    pendingActions.poll()?.invoke(ctrl)
                }
            } catch (e: Exception) {
                val data = JSObject()
                data.put("message", "Falha ao inicializar MediaController: ${e.message}")
                notifyListeners("playbackError", data)
            }
        }, MoreExecutors.directExecutor())
    }

    private fun withController(action: (MediaController) -> Unit) {
        val ctrl = controller
        if (ctrl != null) {
            activity.runOnUiThread { action(ctrl) }
        } else {
            pendingActions.add { ctrlReady ->
                activity.runOnUiThread { action(ctrlReady) }
            }
        }
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
            data.put("message", error.message ?: "Erro de reprodução desconhecido")
            notifyListeners("playbackError", data)
        }
    }

    private fun ensureForegroundServiceStarted() {
        try {
            val intent = Intent(context, KyvraPlaybackService::class.java)
            ContextCompat.startForegroundService(context, intent)
        } catch (_e: Exception) {
            // Ignorado em caso de restricao
        }
    }

    // Define a fila inteira de faixas que serão tocadas
    @PluginMethod
    fun setQueue(call: PluginCall) {
        ensureForegroundServiceStarted()
        val tracksArray: JSArray = call.getArray("tracks") ?: JSArray()
        val startIndex = call.getInt("startIndex", 0) ?: 0

        val mediaItems = mutableListOf<MediaItem>()
        for (i in 0 until tracksArray.length()) {
            val t = tracksArray.getJSONObject(i)
            val title = t.optString("title", "")
            val artist = t.optString("artist", "Kyvra")
            val albumTitle = t.optString("albumTitle", "Kyvra")
            val coverUrl = t.optString("coverUrl", "")
            val mediaId = t.optString("id", "")
            val audioUrl = t.optString("audioUrl", "")

            if (audioUrl.isEmpty()) continue

            val metadataBuilder = MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .setAlbumTitle(albumTitle)

            if (coverUrl.isNotEmpty()) {
                try {
                    metadataBuilder.setArtworkUri(Uri.parse(coverUrl))
                } catch (_: Exception) {}
            }

            mediaItems.add(
                MediaItem.Builder()
                    .setMediaId(mediaId)
                    .setUri(audioUrl)
                    .setMediaMetadata(metadataBuilder.build())
                    .build()
            )
        }

        withController { ctrl ->
            if (mediaItems.isNotEmpty()) {
                val validIndex = if (startIndex in 0 until mediaItems.size) startIndex else 0
                ctrl.setMediaItems(mediaItems, validIndex, 0L)
                ctrl.prepare()
                ctrl.play()
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        ensureForegroundServiceStarted()
        withController { ctrl ->
            ctrl.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        withController { ctrl ->
            ctrl.pause()
            call.resolve()
        }
    }

    @PluginMethod
    fun skipToNext(call: PluginCall) {
        withController { ctrl ->
            ctrl.seekToNext()
            call.resolve()
        }
    }

    @PluginMethod
    fun skipToPrevious(call: PluginCall) {
        withController { ctrl ->
            ctrl.seekToPrevious()
            call.resolve()
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = call.getLong("positionMs") ?: 0L
        withController { ctrl ->
            ctrl.seekTo(positionMs)
            call.resolve()
        }
    }

    @PluginMethod
    fun getPosition(call: PluginCall) {
        withController { ctrl ->
            val ret = JSObject()
            ret.put("positionMs", ctrl.currentPosition)
            ret.put("durationMs", ctrl.duration)
            ret.put("isPlaying", ctrl.isPlaying)
            call.resolve(ret)
        }
    }
}
