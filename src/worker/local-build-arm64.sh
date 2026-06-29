#!/bin/bash
set -e; export DEBIAN_FRONTEND=noninteractive
JOB_ID="${1:-unknown}"; WORKSPACE_DIR="${2:-/tmp/workspace}"
cd "$WORKSPACE_DIR"
echo "[Worker|ARM64] Job:$JOB_ID Arch:$(uname -m)"
if ! command -v java &>/dev/null; then apt-get update -qq && apt-get install -y -qq openjdk-17-jdk wget unzip zip >/dev/null; fi
echo "[Worker|ARM64] Java:$(java -version 2>&1|head -1)"
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
if [ ! -f "$ANDROID_SDK_ROOT/platforms/android-34/source.properties" ]; then echo "[Worker|ARM64] SDK setup..."; android-sdk-setup; fi
if [ -f project.zip ]; then unzip -qo project.zip; else echo "ERROR: no project.zip"; exit 1; fi
echo "sdk.dir=$ANDROID_SDK_ROOT">local.properties
if [ -f gradlew ]; then chmod +x gradlew; echo "[Worker] ./gradlew assembleDebug"; ./gradlew assembleDebug --no-daemon --console=plain 2>&1
else PD=$(find . -maxdepth 3 -name gradlew 2>/dev/null|head -1)
  if [ -n "$PD" ]; then cd "$(dirname "$PD")"; echo "sdk.dir=$ANDROID_SDK_ROOT">local.properties; chmod +x gradlew; ./gradlew assembleDebug --no-daemon --console=plain 2>&1; cd "$WORKSPACE_DIR"
  else echo "ERROR: No gradlew"; exit 1; fi
fi
APK=$(find . -name "*.apk" ! -name "*unaligned*"|head -1)
if [ -n "$APK" ]; then cp "$APK" "$WORKSPACE_DIR/output.apk"
  SZ=$(stat -c%s "$WORKSPACE_DIR/output.apk"); SHA=$(sha256sum "$WORKSPACE_DIR/output.apk"|awk '{print $1}')
  echo "{\"size\":$SZ,\"sha256\":\"$SHA\",\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"name\":\"app-debug.apk\",\"arch\":\"arm64\"}">"$WORKSPACE_DIR/metadata.json"
  echo "[Worker|ARM64] APK:${SZ}b OK"
else echo "ERROR: No APK"; exit 1; fi
