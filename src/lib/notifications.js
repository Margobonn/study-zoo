import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();
const PHASE_END_NOTIFICATION_ID = 9001;

// Fixed structure of the progressive countdown warning (seconds before the
// phase ends). What the user configures is only the starting threshold —
// a point fires only if it's <= that threshold.
export const WARNING_POINTS = [60, 30, 5, 4, 3, 2, 1];
const WARNING_NOTIFICATION_BASE_ID = 9100; // 9100..9106, one per WARNING_POINTS index

let permissionChecked = false;

async function ensurePermission() {
  if (!isNative || permissionChecked) return;
  permissionChecked = true;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    // Permission API unavailable or denied — the in-app beep still covers
    // the foreground case, so this is not fatal.
  }
}

// Schedules a local (native) notification for the moment the running phase
// is due to end, so the user is nudged even if the app is backgrounded or
// the screen is locked — the Web Audio beep alone can't do that. Also
// schedules the progressive countdown warnings (if enabled) leading up to it.
export async function scheduleAllNotifications(endTimestamp, phase, config){
  if (!isNative) return;
  await ensurePermission();

  const title = phase === 'study' ? '¡Sesión completada! 🎉' : 'Descanso terminado ☕';
  const body = phase === 'study'
    ? 'Volvé a Study Zoo para ver tu nuevo animal.'
    : 'Hora de volver a estudiar.';

  const notifications = [{
    id: PHASE_END_NOTIFICATION_ID,
    title,
    body,
    schedule: { at: new Date(endTimestamp) },
  }];

  const warnEnabled = config && config.progressWarnEnabled !== false;
  const threshold = (config && config.progressWarnThresholdSec) || 10;
  if(warnEnabled){
    WARNING_POINTS.forEach((sec, i) => {
      if(sec > threshold) return;
      const at = endTimestamp - sec * 1000;
      if(at <= Date.now()) return; // don't schedule warnings already in the past
      notifications.push({
        id: WARNING_NOTIFICATION_BASE_ID + i,
        title: '⏳',
        body: sec >= 60 ? '1 min restante' : `${sec}s restantes`,
        schedule: { at: new Date(at) },
      });
    });
  }

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    // Scheduling failures (e.g. permission denied) shouldn't crash the timer.
  }
}

export async function cancelAllNotifications() {
  if (!isNative) return;
  const ids = [
    { id: PHASE_END_NOTIFICATION_ID },
    ...WARNING_POINTS.map((_, i) => ({ id: WARNING_NOTIFICATION_BASE_ID + i })),
  ];
  try {
    await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    // Nothing pending to cancel — fine.
  }
}
