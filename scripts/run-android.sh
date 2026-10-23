#!/bin/zsh
# ============================================================
# Try the staff app on this Mac in the Android emulator.
#
#   ./scripts/run-android.sh            installs public/downloads/AshaDeepFaculty.apk
#   ./scripts/run-android.sh path.apk   installs another build
#
# Starts the "AshaDeep_Phone" virtual phone if it is not already
# running, waits for it to boot, installs the APK and opens the app.
# ============================================================
set -e
source "$(dirname "$0")/../android-env.sh"
APK="${1:-$(dirname "$0")/../public/downloads/AshaDeepFaculty.apk}"
AVD=AshaDeep_Phone

if ! adb devices | grep -q "emulator-"; then
  echo "Starting the $AVD emulator…"
  nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -no-snapshot-save -gpu auto >/tmp/ashadeep-emulator.log 2>&1 &
fi

echo "Waiting for the phone to boot…"
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done

echo "Installing $(basename "$APK")…"
# A build signed with another key cannot update in place; replace it.
adb install -r "$APK" || { adb uninstall in.ashadeepadarsh.faculty >/dev/null 2>&1; adb install "$APK"; }

adb shell monkey -p in.ashadeepadarsh.faculty -c android.intent.category.LAUNCHER 1 >/dev/null
echo "Asha Deep Faculty is open in the emulator."
