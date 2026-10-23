# Mobile push notifications (Android) — optional, do after the app builds fine

The app already contains the push code (`src/push.js`). It stays silent until you finish these steps, so skipping them is safe.
Run all commands from `D:\godelicious-project\GodeliciousApp` unless stated.

1. Firebase Console (same project as the web/backend) → Project settings → Add app → **Android**.
   Package name: `com.godeliciousapp`. Download **google-services.json**.
2. Copy it to `D:\godelicious-project\GodeliciousApp\android\app\google-services.json`.
3. Install the packages (versions matched to React Native 0.75):
   ```
   npm install @react-native-firebase/app@21.14.0 @react-native-firebase/messaging@21.14.0
   ```
4. Edit `android\build.gradle` — inside `buildscript { dependencies { ... } }` add:
   ```
   classpath("com.google.gms:google-services:4.4.2")
   ```
5. Edit `android\app\build.gradle` — add this as the LAST line of the file:
   ```
   apply plugin: "com.google.gms.google-services"
   ```
6. Edit `android\app\src\main\AndroidManifest.xml` — next to the other `<uses-permission>` lines add:
   ```
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   ```
7. Rebuild: `cd android` then `.\gradlew.bat clean` then `.\gradlew.bat assembleRelease`.
8. Install the APK, sign in, allow notifications. Place a test order from the web: the admin gets a push; change the order status in admin: the phone gets a push.

If the build fails after this, remove steps 4-5 and the two packages and the app goes back to working without push; send me the error.
iOS push needs an Apple Developer account + APNs key and is not set up.
