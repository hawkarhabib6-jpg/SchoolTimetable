package com.herem.adstudio.data.render

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.herem.adstudio.R

/**
 * Keeps the process alive and foreground-visible for the length of a render.
 *
 * The service does not own the export — [com.herem.adstudio.data.repository.RenderRepositoryImpl]
 * does. Its only job is the foreground notification, so a user who leaves the editor (or
 * locks the screen) does not have their 40-second x264 pass killed by the OS.
 */
class ExportService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopForegroundCompat()
                stopSelf()
            }

            else -> {
                val percent = intent?.getIntExtra(EXTRA_PROGRESS, 0) ?: 0
                startForegroundCompat(percent)
            }
        }
        return START_NOT_STICKY
    }

    private fun startForegroundCompat(percent: Int) {
        ensureChannel()
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.export_progress, percent))
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .setProgress(100, percent, percent <= 0)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROCESSING,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    @Suppress("DEPRECATION")
    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            stopForeground(true)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.export_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            )
        )
    }

    companion object {
        private const val CHANNEL_ID = "exports"
        private const val NOTIFICATION_ID = 42
        private const val ACTION_STOP = "com.herem.adstudio.STOP_EXPORT"
        private const val EXTRA_PROGRESS = "progress"

        fun update(context: Context, percent: Int) {
            val intent = Intent(context, ExportService::class.java)
                .putExtra(EXTRA_PROGRESS, percent)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, ExportService::class.java).setAction(ACTION_STOP)
            runCatching { context.startService(intent) }
        }
    }
}
