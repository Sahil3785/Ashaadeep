#!/bin/zsh
# ============================================================
# Android build environment for this project.
#
#   source ./android-env.sh
#
# Points at the JDK and SDK installed under your home folder, so
# nothing here needs admin rights or touches the system Java.
# ============================================================
export JAVA_HOME="$(/usr/bin/find "$HOME/Library/Java/JavaVirtualMachines" -maxdepth 1 -name 'jdk-21*' | head -1)/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
