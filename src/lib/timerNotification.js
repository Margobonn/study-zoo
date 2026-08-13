import { Capacitor, registerPlugin } from '@capacitor/core';

// Native Android only — a custom local plugin (see android/app/src/main/
// java/com/studyzoo/app/{TimerForegroundService,TimerNotificationPlugin}.java)
// backing the persistent countdown notification. No web equivalent: a
// browser tab can't post an OS-level ongoing notification the same way.
const TimerNotification = Capacitor.getPlatform() === 'android'
  ? registerPlugin('TimerNotification')
  : null;

export async function startOrUpdateTimerNotification(label, endTimeMillis) {
  if (!TimerNotification) return;
  try { await TimerNotification.startOrUpdate({ label, endTimeMillis }); }
  catch (e) { /* native plugin unavailable */ }
}

export async function stopTimerNotification() {
  if (!TimerNotification) return;
  try { await TimerNotification.stop(); }
  catch (e) { /* native plugin unavailable */ }
}
