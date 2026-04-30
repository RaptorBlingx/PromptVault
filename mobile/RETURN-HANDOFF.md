PromptVault Mobile Return Handoff

Current status:
- Mobile config validated and build-ready.
- npm ci completed successfully from lockfile.
- Expo Doctor passed 17/17 checks.
- Latest fixed APK build:
  https://expo.dev/accounts/raptorblingx/projects/promptvault-mobile-app/builds/60dfa2f3-d8a6-44d3-84a9-44bf249ddd44
- Latest fixed APK artifact:
  https://expo.dev/artifacts/eas/cXPovpcVejEXDkTuVoKZNu.apk
- Backup APK build finished:
  https://expo.dev/accounts/raptorblingx/projects/promptvault-mobile-app/builds/aa5b5c7d-5dc8-4ea1-ad00-a1c62cc605e6
- Backup APK artifact:
  https://expo.dev/artifacts/eas/n37qStQpFjuijjoVU9PBfW.apk
- Local APK copy downloaded to:
  C:\Users\Swemo\Downloads\PromptVault-preview.apk
- Local fixed APK copy downloaded to:
  C:\Users\Swemo\Downloads\PromptVault-preview-fixes.apk
- App install verified on connected device package:
  com.promptvault.mobile
- Install helper revalidated with successful `-Reinstall` run.

Files prepared for resume:
- mobile/tools/install-apk.ps1

When you return (USB path):
1. Connect phone by USB.
2. Enable USB debugging on phone and accept the RSA prompt.
3. From mobile folder, run:
   powershell -ExecutionPolicy Bypass -File .\tools\install-apk.ps1
4. If app already exists and you want to overwrite it:
   powershell -ExecutionPolicy Bypass -File .\tools\install-apk.ps1 -Reinstall
5. Note: script auto-detects local adb at C:\Users\Swemo\Android\platform-tools\adb.exe if adb is not on PATH.

When you return (same local network, no USB):
1. Connect phone and laptop to same LAN.
2. On phone browser, open the APK artifact URL and install directly.
3. If unknown-app prompt appears, allow install for your browser/files app.

Optional wireless adb setup after first USB connect:
1. adb tcpip 5555
2. adb connect PHONE_IP:5555
3. adb install -r C:\Users\Swemo\Downloads\PromptVault-preview.apk
