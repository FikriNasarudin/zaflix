#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo " Zaflix Android Local Dev Setup"
echo "========================================="

JAVA_DIR="$HOME/java"
ANDROID_DIR="$HOME/Android"
JAVA_VERSION="17.0.14+7"
JAVA_ARCHIVE="OpenJDK17U-jdk_x64_linux_hotspot_17.0.14_7.tar.gz"
JAVA_URL="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/$JAVA_ARCHIVE"

# ----- JDK -----
if [ ! -f "$JAVA_DIR/bin/java" ]; then
    echo "[1/4] Installing JDK 17 (Temurin)..."
    mkdir -p "$JAVA_DIR"
    wget -q --show-progress "$JAVA_URL" -O "/tmp/$JAVA_ARCHIVE"
    tar -xzf "/tmp/$JAVA_ARCHIVE" -C "$JAVA_DIR" --strip-components=1
    rm "/tmp/$JAVA_ARCHIVE"
else
    echo "[1/4] JDK 17 already installed"
fi

# ----- Android SDK -----
SDK_ZIP="$ANDROID_DIR/cmdline-tools.zip"
SDK_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

if [ ! -d "$ANDROID_DIR/cmdline-tools" ]; then
    echo "[2/4] Installing Android SDK command-line tools..."
    mkdir -p "$ANDROID_DIR"
    wget -q --show-progress "$SDK_TOOLS_URL" -O "$SDK_ZIP"
    unzip -q "$SDK_ZIP" -d "/tmp/cmdline-tools"
    mkdir -p "$ANDROID_DIR/cmdline-tools/latest"
    mv /tmp/cmdline-tools/cmdline-tools/* "$ANDROID_DIR/cmdline-tools/latest/"
    rm -rf "/tmp/cmdline-tools" "$SDK_ZIP"
else
    echo "[2/4] Android SDK command-line tools already installed"
fi

# ----- Environment variables -----
SHELL_RC="$HOME/.zshrc"
if ! grep -q "JAVA_HOME" "$SHELL_RC" 2>/dev/null; then
    echo "[3/4] Adding environment variables to $SHELL_RC..."
    {
        echo ""
        echo "# Zaflix Android setup"
        echo "export JAVA_HOME=\"$JAVA_DIR\""
        echo "export ANDROID_HOME=\"$ANDROID_DIR\""
        echo "export PATH=\"\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH\""
    } >> "$SHELL_RC"
else
    echo "[3/4] Environment variables already set"
fi

# Source in current session
export JAVA_HOME="$JAVA_DIR"
export ANDROID_HOME="$ANDROID_DIR"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# ----- Configure Gradle JDK -----
GRADLE_PROPS="$HOME/projects/lab/zaflix/android/gradle.properties"
if ! grep -q "org.gradle.java.home" "$GRADLE_PROPS" 2>/dev/null; then
    echo "" >> "$GRADLE_PROPS"
    echo "# Gradle JDK" >> "$GRADLE_PROPS"
    echo "org.gradle.java.home=$JAVA_DIR" >> "$GRADLE_PROPS"
fi

# ----- Accept licenses & install SDK -----
echo "[4/4] Accepting Android SDK licenses and installing platforms..."
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses 2>/dev/null || true
sdkmanager --sdk_root="$ANDROID_HOME" \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    > /dev/null

echo ""
echo "========================================="
echo " Setup complete!"
echo "========================================="
echo ""
echo "Run these commands to build TV debug APK:"
echo "  cd $HOME/projects/lab/zaflix/android"
echo "  ./gradlew assembleTvDebug"
echo ""
echo "Or install on a connected device:"
echo "  npx cap run android --target tv"
