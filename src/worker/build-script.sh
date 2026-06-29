#!/bin/bash
set -e

echo "[Worker] Starting Android Build Container..."

# Setup Android SDK Environment
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

echo "[Worker] Installing dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq > /dev/null
apt-get install -y -qq openjdk-17-jdk wget unzip zip > /dev/null

echo "[Worker] Downloading Android SDK Command Line Tools..."
mkdir -p $ANDROID_SDK_ROOT/cmdline-tools
wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O cmdline-tools.zip
unzip -q cmdline-tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools
rm cmdline-tools.zip
mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest

echo "[Worker] Accepting SDK licenses..."
yes | sdkmanager --licenses > /dev/null

echo "[Worker] Extracting project.zip..."
cd /workspace
unzip -q project.zip
rm project.zip

echo "[Worker] Ensuring local.properties has sdk.dir..."
echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties

echo "[Worker] Preparing Gradle wrapper..."
# Ensure gradlew has execution permissions if it exists
if [ -f "gradlew" ]; then
    chmod +x gradlew
    echo "[Worker] Running ./gradlew assembleDebug"
    ./gradlew assembleDebug --no-daemon --console=plain
else
    echo "[Worker] gradlew not found. Attempting to install and run Gradle directly."
    apt-get install -y -qq gradle > /dev/null
    gradle assembleDebug --no-daemon --console=plain
fi

echo "[Worker] Build successful!"
echo "[Worker] Detecting generated APKs..."

# Find all APKs and copy them to the root workspace directory
find app/build/outputs/apk -name "*.apk" -exec cp {} /workspace/output.apk \;

if [ -f "/workspace/output.apk" ]; then
    echo "[Worker] APK successfully moved to /workspace/output.apk"
else
    echo "[Worker] WARNING: No APK found after build."
fi

echo "[Worker] Container execution finished."
