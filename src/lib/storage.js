import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

// On native platforms localStorage inside the WebView is not guaranteed to
// survive app updates/OS cleanup the way Preferences (backed by
// UserDefaults/SharedPreferences) is, so we use Preferences there and keep
// localStorage only for the plain web build.

export async function getItem(key) {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setItem(key, value) {
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeItem(key) {
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}
