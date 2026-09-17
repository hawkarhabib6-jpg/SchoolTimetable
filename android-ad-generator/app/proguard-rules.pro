# Media3 Transformer resolves codecs/effects reflectively in places.
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# FFmpegKit (optional engine) uses JNI callbacks.
-keep class com.arthenica.ffmpegkit.** { *; }
-dontwarn com.arthenica.ffmpegkit.**
