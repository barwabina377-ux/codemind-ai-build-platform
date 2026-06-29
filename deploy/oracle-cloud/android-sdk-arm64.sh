#!/bin/bash
set -e
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
echo "[SDK] Arch:$(uname -m) SDK:$ANDROID_SDK_ROOT"
[ -d "$ANDROID_SDK_ROOT/platforms/android-34" ] && echo "[SDK] Already installed" && exit 0
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O /tmp/ct.zip
unzip -q /tmp/ct.zip -d "$ANDROID_SDK_ROOT/cmdline-tools"; rm /tmp/ct.zip
mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
SM="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
cat <<'W'>"$SM"
#!/bin/bash
[ "$(uname -m)" = "aarch64" ] && command -v box64 &>/dev/null && exec box64 /opt/android-sdk/cmdline-tools/latest/lib/sdkmanager "$@"
exec /opt/android-sdk/cmdline-tools/latest/lib/sdkmanager "$@"
W
chmod +x "$SM"
mkdir -p "$ANDROID_SDK_ROOT/licenses"
for h in 601085b94cd77f0b54ff86406957099ebe79c4d6 d56f5187479451eabf01fb78af6dfcb131a6481e 24333f8a63b6825ea9c5514f83c2829b004d1fee; do echo -e "\n$h">>"$ANDROID_SDK_ROOT/licenses/android-sdk-license"; done
echo "[SDK] Installing..."
"$SM" --install "platforms;android-34" "build-tools;34.0.0" "platform-tools" "extras;android;m2repository" "extras;google;m2repository" 2>&1|tail -3
echo "[SDK] Done"
