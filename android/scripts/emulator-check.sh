#!/usr/bin/env bash
set -u
adb shell svc wifi disable
adb shell svc data disable
cd android
./gradlew connectedDebugAndroidTest --console plain
fuji_result=$?
mkdir -p app/build/reports/screenshots
adb pull /sdcard/Android/data/ph.fuji.grocery/files/qa app/build/reports/screenshots/ || true
exit "$fuji_result"
