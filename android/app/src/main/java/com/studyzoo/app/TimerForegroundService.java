package com.studyzoo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

// Keeps a persistent, non-dismissible notification showing the current
// timer phase with a live countdown while a study/break session is
// running — even with the app backgrounded or the screen locked.
//
// The countdown itself costs no battery beyond posting the notification
// once per start/update: setUsesChronometer + setChronometerCountDown
// hands the per-second ticking to the Android system UI itself, the same
// mechanism the stock Clock app's timer uses. No repeated JS-to-native
// calls are needed to keep it moving.
public class TimerForegroundService extends Service {
  public static final String CHANNEL_ID = "study_timer_channel";
  public static final int NOTIFICATION_ID = 5501;

  public static final String EXTRA_LABEL = "label";
  public static final String EXTRA_END_TIME = "endTimeMillis";

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String label = intent != null ? intent.getStringExtra(EXTRA_LABEL) : "Estudio";
    long endTimeMillis = intent != null
      ? intent.getLongExtra(EXTRA_END_TIME, System.currentTimeMillis())
      : System.currentTimeMillis();

    createChannelIfNeeded();
    Notification notification = buildNotification(label, endTimeMillis);
    ServiceCompat.startForeground(
      this,
      NOTIFICATION_ID,
      notification,
      Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0
    );
    return START_STICKY;
  }

  private Notification buildNotification(String label, long endTimeMillis) {
    Intent openIntent = new Intent(this, MainActivity.class);
    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
      | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : 0);
    PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, openIntent, piFlags);

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(label)
      .setContentText("Study Zoo")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setWhen(endTimeMillis)
      .setShowWhen(true)
      .setContentIntent(contentPendingIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .build();
  }

  private void createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
        NotificationChannel channel = new NotificationChannel(
          CHANNEL_ID, "Temporizador activo", NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Muestra la fase y el tiempo restante mientras estudiás");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
      }
    }
  }

  @Override
  public void onDestroy() {
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
    super.onDestroy();
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
