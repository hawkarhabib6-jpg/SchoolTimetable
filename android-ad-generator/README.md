# AdStudio (Android)

AI-assisted social ad generator and short-form video editor: product photos → 9:16 video
ads for TikTok / Instagram Reels / Facebook, plus filters, motion, speed edits, animated
CTA text and beat-synced music over imported clips.

Kotlin · Jetpack Compose · Clean Architecture · Media3 Transformer (with an optional
FFmpeg engine) · Hilt · Coroutines/Flow.

**Read [ARCHITECTURE.md](ARCHITECTURE.md)** — it is the implementation guide: layer
layout, the render pipeline and its transition arithmetic, the dependency set, the two
UI surfaces, the beat detector, the test strategy, and an explicit list of what is
implemented versus scaffolded.

```bash
./gradlew :app:assembleDebug                          # Media3 engine only
./gradlew :app:assembleDebug -Padstudio.ffmpegKit=true # + FFmpeg engine (needs your own artifact mirror)
./gradlew :app:testDebugUnitTest                      # JVM unit tests
```

This module is self-contained and unrelated to the Electron timetable app at the
repository root; it shares only the repository.
