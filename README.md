# IZO IPTV — Android & Fire Stick App

Premium IPTV player app for Android phones, tablets, and Amazon Fire Stick / Android TV.

## Features

- 📡 Live TV with EPG (Electronic Programme Guide)
- 🎬 Movies & Series (VOD) with resume
- 🔍 Universal search
- 🎮 Full D-pad navigation for Fire Stick
- 🔐 Secure auth via izoiptv.com
- ⚙ Settings & hidden admin panel

## Tech Stack

- React Native (react-native-tvos) — supports Android phone + Fire Stick in one codebase
- VLC media player for reliable IPTV stream playback
- React Navigation for screen routing
- AsyncStorage for local persistence
- Zustand + Context for state
- Axios for HTTP

---

## Prerequisites

- Node.js 18+
- JDK 17 (required for Android build)
- Android SDK (API 34)
- Android Studio (recommended for emulator)

### Install JDK 17 (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### Install Android SDK
```bash
# Download Android command-line tools
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-*.zip -d cmdline-tools/
mv cmdline-tools/cmdline-tools cmdline-tools/latest

# Add to environment
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accept licenses and install required packages
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;25.1.8937393"
```

---

## Build Instructions

### 1. Install dependencies
```bash
cd ~/projects/izoiptv-app
npm install
```

### 2. Build debug APK
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Build release APK (requires signing key)
```bash
cd android
./gradlew assembleRelease
```

---

## Sideload to Fire Stick

### Enable developer mode on Fire Stick:
1. Go to Settings → My Fire TV → About
2. Click "Build" 7 times to enable Developer Options
3. Go to Settings → My Fire TV → Developer Options
4. Enable "ADB Debugging" and "Apps from Unknown Sources"

### Install via ADB:
```bash
# Find Fire Stick IP: Settings → My Fire TV → About → Network
adb connect <FIRE_STICK_IP>:5555
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Or use the Downloader app:
1. Install "Downloader" from Fire TV app store
2. Upload the APK to any URL
3. Use Downloader to navigate to the URL and install

---

## Adding Users (Admin)

Users are managed from the IZO IPTV website admin panel:

1. Go to https://www.izoiptv.com/admin/login
2. Navigate to **App Users** section
3. Click **Add User**
4. Fill in:
   - Username & Password (for app login)
   - Xtream Server URL
   - Xtream Username & Password
   - Subscription Expiry Date
5. The app will fetch these credentials on next login

### To update credentials:
Click **Edit** on any user row in the App Users section. Changes take effect on the user's next app launch (the app fetches fresh config on startup).

### To revoke access:
Click **Revoke** to set `isActive = false`. The user will be blocked on next API call.

---

## Hidden Admin Panel

In the app, go to Settings → tap the version number **5 times** to unlock the admin panel.

Admin panel features:
- View active Xtream playlist config
- Force refresh from server
- Clear EPG cache
- Test stream URL directly
- View app logs
- Toggle test/production server

---

## Project Structure

```
src/
├── screens/          # All app screens
│   ├── LoginScreen.js
│   ├── HomeScreen.js
│   ├── LiveTVScreen.js
│   ├── PlayerScreen.js
│   ├── MoviesScreen.js
│   ├── SeriesScreen.js
│   ├── SearchScreen.js
│   ├── SettingsScreen.js
│   └── AdminScreen.js
├── components/       # Reusable UI components
│   ├── FocusableButton.js
│   ├── LoadingSpinner.js
│   ├── ContentRow.js
│   ├── EPGGuide.js
│   └── ChannelList.js
├── services/         # API & data services
│   ├── api.js        — izoiptv.com API
│   ├── xtream.js     — Xtream Codes API
│   ├── storage.js    — AsyncStorage helpers
│   └── epg.js        — EPG parsing & cache
├── context/          # React Context providers
│   ├── AuthContext.js
│   └── PlayerContext.js
├── theme/            # Design tokens
│   └── colors.js     — Colors, typography, spacing
├── utils/
│   └── helpers.js    — Utility functions
└── App.js            — Root component & navigation
```

---

## API Endpoints (Website)

The app communicates with https://www.izoiptv.com:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/app/login` | Authenticate, returns JWT + Xtream config |
| GET | `/api/app/config` | Get fresh Xtream credentials |
| GET | `/api/app/subscription` | Check subscription status |
| POST | `/api/app/refresh` | Force refresh playlist config |

---

## Fire Stick Navigation

All screens are D-pad navigable:
- **D-pad up/down/left/right** — move focus between items
- **OK/Select** — activate focused item
- **Back** — go back / close overlay
- **Long press Back** — exit app
- **Play/Pause** — toggle playback
- **Menu** — show/hide player overlay

---

## License

Private — IZO IPTV. All rights reserved.
