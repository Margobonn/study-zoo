# Study Zoo → Capacitor: estado y checklist

## Qué se hizo en esta sesión (sin poder correr npm)

Esta máquina no tiene Node.js, npm, Java ni Android Studio instalados (lo
verifiqué directamente). Windows tampoco puede correr Xcode bajo ninguna
circunstancia — Xcode es exclusivo de macOS, eso no depende de qué instale
acá. Por eso no pude ejecutar ninguno de los comandos de Capacitor
(`npm install`, `npx cap init/add/sync`, `gradlew assembleRelease`, ni abrir
Android Studio/Xcode), y no pude "verificar que compile en un emulador" como
pedías. Lo que sí hice, sin depender de esas herramientas:

- Reestructuré la app (antes un único `index.html` con React vía CDN) en un
  proyecto Vite real, con `package.json`, `vite.config.js`, y el código
  fuente en `src/`. Esto es un requisito previo real para Capacitor: necesita
  una carpeta `dist/` generada por un bundler, no scripts CDN.
- La versión anterior (CDN + Babel en el navegador) quedó respaldada en
  `legacy-standalone/` por si la necesitás mientras no tengas el entorno
  nativo andando.
- Escribí `capacitor.config.ts` con `webDir: 'dist'` y un `appId` de
  **placeholder** (`com.studyzoo.app` — tenés que cambiarlo, ver más abajo).
- Agregué `@capacitor/preferences` como storage nativo (con fallback a
  `localStorage` en web) y `@capacitor/local-notifications` para que el
  timer avise aunque la app esté en segundo plano o la pantalla bloqueada.
- Escribí `.gitignore` con lo que corresponde ignorar.
- Verifiqué con Babel (en el navegador) que los 4 archivos fuente nuevos
  (`App.jsx`, `main.jsx`, `storage.js`, `notifications.js`) no tienen errores
  de sintaxis, y que `package.json`/`capacitor.config.ts` son válidos. Esto
  **no** reemplaza un build real — no pude instalar dependencias, ni correr
  Vite, ni abrir un emulador. Falta esa verificación real.

## Decisión pendiente: el App ID

Definí `com.studyzoo.app` como placeholder en `capacitor.config.ts`. **No
puedo elegir esto por vos** porque es permanente: una vez publicada la app en
Google Play o App Store, no se puede cambiar sin crear una ficha nueva desde
cero. Decime qué dominio/nombre usar (ej. `com.tunombre.estudiozoo`) y lo
actualizo antes de que corras `npx cap init`.

---

## 1. Instalar lo que falta (elegí una opción)

**Opción A — lo instalás vos** en tu máquina de desarrollo habitual (lo más
común si ya tenés Android Studio/Xcode en otra compu).

**Opción B — lo instalo yo acá vía `winget`**, si me confirmás que querés eso.
Con esto:
- Puedo instalar Node.js LTS sin problema (descarga rápida, ~30MB).
- Instalar Android Studio + Android SDK + un emulador es una descarga de
  varios GB y puede tardar bastante; te lo pregunto aparte antes de hacerlo.
- iOS sigue sin poder hacerse desde Windows pase lo que pase (ver sección
  iOS más abajo para las alternativas reales: Mac propia, Mac prestada, o un
  servicio de build en la nube como Codemagic/Ionic Appflow/GitHub Actions
  con runner macOS).

## 2. Primera vez que configurás el proyecto (una sola vez)

Corré esto en la carpeta `study-zoo/`, en orden:

```bash
npm install
npx cap init "Study Zoo" "com.tunombre.estudiozoo" --web-dir=dist
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

(`cap init` va a preguntar lo mismo que ya está en `capacitor.config.ts`;
como el archivo ya existe, podés saltear ese paso y solo ajustar el `appId`
a mano en `capacitor.config.ts` — hacé UNA de las dos cosas, no ambas.)

## 3. Flujo de trabajo normal, cada vez que cambiás código

**Este es el orden que pediste, siempre en el mismo sentido:**

```bash
npm run build      # 1. compila React → dist/
npx cap sync        # 2. copia dist/ a android/ e ios/, sincroniza plugins
```

Después:
- **Android:** `npx cap open android` (abre Android Studio) → correr en
  emulador/dispositivo con el botón ▶ normal de Android Studio.
- **iOS** (solo desde una Mac): `npx cap open ios` (abre Xcode) → correr con
  ▶.

Atajo: usá `npm run sync` (ya lo dejé en `package.json`) para encadenar build
+ sync en un solo comando.

---

## 4. Android — configuración específica

### Ícono y splash screen

Con tu ícono base de 1024×1024px guardado como `assets/icon.png` (creá la
carpeta `assets/` en la raíz del proyecto):

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

Esto genera automáticamente todos los tamaños de ícono y splash para
`android/app/src/main/res/`.

### applicationId

Después de `npx cap add android`, confirmá en
`android/app/build.gradle` que:

```gradle
android {
    defaultConfig {
        applicationId "com.tunombre.estudiozoo"  // debe coincidir con capacitor.config.ts
```

### versionCode / versionName

En el mismo bloque `defaultConfig`:

```gradle
defaultConfig {
    versionCode 1        // entero, subilo +1 en cada release que subas a Play
    versionName "1.0.0"  // string visible al usuario, semver
}
```

### Build de release

```bash
cd android
./gradlew bundleRelease
```

Esto genera el `.aab` en
`android/app/build/outputs/bundle/release/app-release.aab` — es el archivo
que subís a Google Play Console. (`assembleRelease` genera un `.apk` en vez
de `.aab`; Play Store hoy pide `.aab`, usá `bundleRelease`.)

**Necesitás firmar el build** con un keystore antes de que esto funcione en
modo release real (sin firmar, el build falla o genera un artefacto sin
firma que Play Store rechaza). Generá el keystore una vez:

```bash
keytool -genkey -v -keystore study-zoo-release.keystore -alias studyzoo -keyalg RSA -keysize 2048 -validity 10000
```

Guardalo fuera del repo (no lo subas a git — ya está en `.gitignore`) y
configurá `android/app/build.gradle` con un bloque `signingConfigs` que
apunte a él (o usá Play App Signing, que es lo que recomienda Google hoy:
subís un build firmado con una key de subida, y Google gestiona la key final
— es más simple y evita perder la key original).

---

## 5. iOS — configuración específica

**Importante:** todo esto requiere una Mac con Xcode instalado. No hay forma
de saltear esto desde Windows — ni yo ni ninguna herramienta puede generar
un build firmado de iOS sin macOS real (o un runner macOS en la nube). Si no
tenés una Mac a mano, opciones: pedir prestada una, o usar un servicio como
Codemagic / GitHub Actions (runner `macos-latest`) / Ionic Appflow que
compilan iOS en la nube por vos.

### Ícono y splash

Mismo comando que Android, una vez que tengas `assets/icon.png`:

```bash
npx capacitor-assets generate --ios
```

### Bundle Identifier

En Xcode: seleccioná el proyecto `App` en el navegador izquierdo → target
`App` → pestaña **General** → campo **Bundle Identifier** → debe coincidir
con el `appId` de `capacitor.config.ts`.

### Display Name

Mismo lugar (target `App` → **General**) → campo **Display Name** — este sí
puede ser distinto al Bundle ID (ej. "Study Zoo" con espacios y emojis si
querés).

### Checklist de firma (Signing & Capabilities) — para cuando tengas la cuenta de Apple Developer

En Xcode: target `App` → pestaña **Signing & Capabilities**:

1. Tildar **Automatically manage signing**.
2. **Team**: elegir tu cuenta de Apple Developer (aparece acá una vez que
   inicies sesión en Xcode → Settings → Accounts con tu Apple ID de
   developer).
3. Xcode va a generar solo el **Provisioning Profile** y el
   **Signing Certificate** si el team está bien seleccionado.
4. Repetir la verificación de **Bundle Identifier** (paso anterior) — tiene
   que ser único en todo App Store Connect.
5. En **App Store Connect** (web), crear la ficha de la app con el mismo
   Bundle ID antes de poder subir el build desde Xcode (Product → Archive →
   Distribute App → App Store Connect).

---

## 6. Notificaciones nativas del timer — ya implementado en el código

`src/lib/notifications.js` usa `@capacitor/local-notifications`: al arrancar
una fase del timer se programa una notificación nativa para el momento en
que termina (`schedulePhaseEndNotification`), y se cancela si pausás,
reiniciás, saltás de fase, o si estirás la sesión (se reprograma con el
nuevo horario). Esto es lo que permite que te avise aunque la app esté en
segundo plano o la pantalla bloqueada — el beep de Web Audio del código
anterior solo suena con la app en primer plano.

El pedido de permiso a Android/iOS se hace automáticamente la primera vez
que arrancás un timer (patrón recomendado: pedir el permiso en contexto, no
apenas abrís la app).

**No hace falta ningún truco de "mantener viva la app"**: el timer ya se
calcula con `Date.now()` contra un `endTime` guardado, no con un contador
que corre en el fondo. Aunque el sistema operativo suspenda el JS de la app
mientras la pantalla está bloqueada (que es lo normal en Android/iOS), al
volver a abrir la app el tiempo restante se recalcula correctamente sola.
Meter un foreground service o un wake lock para esto sería innecesario,
gastaría batería, y en iOS ni siquiera está permitido para este caso de uso.

## 7. `localStorage` en el WebView — confirmado con matices

Funciona out-of-the-box dentro del WebView de Capacitor, como decías. Aun
así, ya cambié el storage a `@capacitor/preferences` en nativo (con
`localStorage` como fallback solo en la build web), porque `Preferences` usa
`UserDefaults`/`SharedPreferences` por debajo, que sobrevive mejor a
limpiezas de caché del sistema operativo que el `localStorage` de un
WebView. Es la alternativa "más confiable" que vos mismo mencionabas en el
pedido — ya está aplicada, no queda pendiente.

---

## 8. Qué NO subir a git

Ya está en `.gitignore`, resumen:

- `node_modules/` — se reinstala con `npm install`.
- `dist/` — se regenera con `npm run build`.
- `android/app/build/`, `android/.gradle/`, `android/local.properties` —
  artefactos de Gradle, se regeneran solos.
- `ios/App/Pods/`, `ios/App/build/`, `ios/App/DerivedData/`, carpetas
  `xcuserdata/` — artefactos de CocoaPods/Xcode.
- `*.keystore`, `*.jks`, `*.p12`, `*.mobileprovision`, `*.cer`, `.env` —
  material de firma y secretos. Nunca en git, ni siquiera en un repo privado.

**Ojo con una idea común pero equivocada:** las carpetas `android/` e `ios/`
en sí **sí se deben commitear completas** (no ignorarlas enteras) — es la
recomendación oficial de Capacitor, porque `npx cap add` no siempre puede
regenerar el 100% de la configuración nativa si la borrás, y las
herramientas de CI/build esperan encontrarlas ya presentes en el repo.

---

## 9. Comandos exactos — resumen final

**Antes que nada (una sola vez):**
```bash
npm install
npx cap add android
npx cap add ios
```

**Cada vez que cambiás código (build → sync → abrir IDE nativo):**
```bash
npm run build
npx cap sync
npx cap open android   # o: npx cap open ios (solo desde Mac)
```

**Generar el `.aab` de Android para Play Store:**
```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# archivo resultante: android/app/build/outputs/bundle/release/app-release.aab
```

**Generar el build de iOS para App Store Connect (solo desde una Mac con Xcode):**
```bash
npm run build
npx cap sync ios
npx cap open ios
```
Y en Xcode: **Product → Archive** → una vez terminado el archive, **Distribute
App → App Store Connect → Upload**.
