#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "[Worker] Starting Local Android Build Pipeline..."
JOB_ID=$1
WORKSPACE_DIR=$2

cd "$WORKSPACE_DIR"
echo "[Worker] Workspace: $WORKSPACE_DIR"

if ! command -v java &> /dev/null; then
    echo "[Worker] Java not found. Installing OpenJDK 17..."
    apt-get update -qq > /dev/null
    apt-get install -y -qq openjdk-17-jdk wget unzip zip > /dev/null
    echo "[Worker] Java installed: $(java -version 2>&1 | head -n 1)"
else
    echo "[Worker] Java found: $(java -version 2>&1 | head -n 1)"
fi

if ! command -v unzip &> /dev/null; then
    echo "[Worker] Unzip not found. Installing..."
    apt-get install -y -qq unzip zip > /dev/null
fi

# Setup Android SDK
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

if [ ! -d "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin" ]; then
    echo "[Worker] Downloading Android SDK Command Line Tools..."
    mkdir -p $ANDROID_SDK_ROOT/cmdline-tools
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O cmdline-tools.zip
    unzip -q cmdline-tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools
    rm cmdline-tools.zip
    mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest
fi

echo "[Worker] Accepting SDK licenses..."
yes | sdkmanager --licenses > /dev/null

echo "[Worker] Extracting project.zip..."
if [ -f "project.zip" ]; then
    unzip -qo project.zip
else
    echo "[Worker] ERROR: project.zip not found!"
    exit 1
fi

echo "[Worker] Injecting local.properties..."
echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties

echo "[Worker] Preparing Gradle build..."
if [ -f "gradlew" ]; then
    chmod +x gradlew
    echo "[Worker] Executing ./gradlew assembleDebug"
    ./gradlew assembleDebug --no-daemon --console=plain
else
    echo "[Worker] gradlew not found. Looking for nested projects..."
    # If unzipped into a folder, try finding gradlew
    PROJECT_DIR=$(find . -maxdepth 2 -name gradlew | head -n 1)
    if [ -n "$PROJECT_DIR" ]; then
        cd $(dirname $PROJECT_DIR)
        echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties
        chmod +x gradlew
        echo "[Worker] Executing ./gradlew assembleDebug in $(pwd)"
        ./gradlew assembleDebug --no-daemon --console=plain
        cd "$WORKSPACE_DIR"
    else
        echo "[Worker] ERROR: No gradlew found in project."
        exit 1
    fi
fi

echo "[Worker] Build completed successfully."
echo "[Worker] Locating generated APKs..."

# Search for APKs
APK_PATH=$(find . -name "*.apk" | grep -v "unaligned" | head -n 1)

if [ -n "$APK_PATH" ]; then
    cp "$APK_PATH" "$WORKSPACE_DIR/output.apk"
    echo "[Worker] APK successfully moved to $WORKSPACE_DIR/output.apk"
    
    # Store metadata
    APK_SIZE=$(stat -c%s "$WORKSPACE_DIR/output.apk")
    APK_SHA=$(sha256sum "$WORKSPACE_DIR/output.apk" | awk '{print $1}')
    cat <<EOF > "$WORKSPACE_DIR/metadata.json"
{
  "size": $APK_SIZE,
  "sha256": "$APK_SHA",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "name": "app-debug.apk"
}
EOF
    echo "[Worker] Metadata generated."
else
    echo "[Worker] ERROR: No APK found after successful build."
    exit 1
fi
