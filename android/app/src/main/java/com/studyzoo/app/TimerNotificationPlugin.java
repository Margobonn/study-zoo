package com.studyzoo.app;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TimerNotification")
public class TimerNotificationPlugin extends Plugin {

  @PluginMethod
  public void startOrUpdate(PluginCall call) {
    Long endTimeMillis = call.getLong("endTimeMillis");
    if (endTimeMillis == null) {
      call.reject("endTimeMillis is required");
      return;
    }
    String label = call.getString("label", "Estudio");

    Intent intent = new Intent(getContext(), TimerForegroundService.class);
    intent.putExtra(TimerForegroundService.EXTRA_LABEL, label);
    intent.putExtra(TimerForegroundService.EXTRA_END_TIME, endTimeMillis);
    ContextCompat.startForegroundService(getContext(), intent);
    call.resolve();
  }

  @PluginMethod
  public void stop(PluginCall call) {
    // stopService (not a stop-flavored startService) — doesn't hit
    // Android's "can't start a service from the background" restriction,
    // since it isn't starting anything.
    getContext().stopService(new Intent(getContext(), TimerForegroundService.class));
    call.resolve();
  }
}
