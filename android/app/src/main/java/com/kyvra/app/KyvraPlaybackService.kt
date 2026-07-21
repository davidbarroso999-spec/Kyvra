package com.kyvra.app

import android.app.PendingIntent
import android.content.Intent
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.CacheBitmapLoader
import androidx.media3.session.DataSourceBitmapLoader
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class KyvraPlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private lateinit var player: ExoPlayer

    override fun onCreate() {
        super.onCreate()

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
            // Pausa automaticamente ao desconectar fone (headset unplugged)
            .setHandleAudioBecomingNoisy(true)
            .build()

        // Carrega capas remotas (https) via OkHttp/Http DataSource
        val bitmapLoader = CacheBitmapLoader(
            DataSourceBitmapLoader(this, DefaultHttpDataSource.Factory())
        )

        val sessionActivityIntent = packageManager
            .getLaunchIntentForPackage(packageName)
        val sessionActivityPendingIntent = sessionActivityIntent?.let {
            PendingIntent.getActivity(
                this, 0, it,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }

        mediaSession = MediaSession.Builder(this, player)
            .setBitmapLoader(bitmapLoader)
            .apply {
                if (sessionActivityPendingIntent != null) {
                    setSessionActivity(sessionActivityPendingIntent)
                }
            }
            .build()
    }

    override fun onGetSession(
        controllerInfo: MediaSession.ControllerInfo
    ): MediaSession? = mediaSession

    // Comportamento inteligente de encerramento do serviço
    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player ?: return
        if (!player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
