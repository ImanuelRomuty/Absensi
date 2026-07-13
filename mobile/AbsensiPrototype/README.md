# AbsensiPrototype (Mobile)

KMP Compose app for employee attendance against the live API.

## Run (Android)

1. Open `mobile/AbsensiPrototype` in Android Studio.
2. Run `androidApp` on a device/emulator with GPS.
3. Allow location permission.
4. Login: `ani@masarif.local` / `Password123!`
5. Use **Clock In / Clock Out** (must be inside assigned office geofence from seed location).

API base URL: `https://absensi-f955.onrender.com` (see `shared/.../config/AppConfig.kt`).

## Features

- Login + session (multiplatform settings)
- Bottom nav: Absensi, Riwayat, Profil
- GPS punch with geofence errors from API
- Offline punch queue (retry when network returns)

## Build APK

```bash
cd mobile/AbsensiPrototype
./gradlew :androidApp:assembleDebug
```

APK: `androidApp/build/outputs/apk/debug/androidApp-debug.apk`
