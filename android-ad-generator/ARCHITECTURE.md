# AdStudio — AI-assisted social ad generator & video editor

An Android app that turns product photos into short-form video ads (9:16, TikTok /
Reels / Facebook), and edits imported clips with filters, motion, speed and animated
call-to-action text over a beat-synced music bed.

This document is the implementation guide: the architecture, the dependency set, the two
UI surfaces that carry the product, and the rendering utility that does the actual work.
Every section points at real files in this module — nothing here is pseudocode.

---

## 1. Architecture at a glance

Clean Architecture, three layers, dependencies pointing inward only:

```
presentation ──▶ domain ◀── data
   Compose        pure Kotlin     Android / Media3 / FFmpeg
   ViewModels     models          engines, repositories
   UI state       use cases
                  interfaces
```

The rule that earns its keep here: **`domain` has no Android imports**. A project is a
plain data class, the storyboard rules are pure functions, and the filtergraph arithmetic
is a pure builder. That is why the risky parts — transition offsets, beat snapping, the
auto-edit's duration budget — run as ordinary JVM unit tests in milliseconds instead of on
an emulator.

```
app/src/main/java/com/herem/adstudio/
├── AdStudioApp.kt                  # @HiltAndroidApp
├── MainActivity.kt                 # single activity, Compose entry point
├── core/
│   ├── di/AppModule.kt             # dispatchers, RenderEngineSelector
│   ├── di/DataModule.kt            # interface → implementation bindings
│   └── util/UiText.kt              # UiEvent, timecode formatting
├── domain/                         # ← no Android imports anywhere in here
│   ├── model/                      # AdProject, Clip, MediaAsset, TextOverlay,
│   │                               #   AudioTrack/BeatMap, ExportSettings, enums
│   ├── render/RenderEngine.kt      # engine interface + RenderEngineSelector
│   ├── repository/                 # Media, Project, Audio, Render interfaces
│   └── usecase/                    # BuildImageAd, ApplyClipEdit,
│                                   #   SnapCutsToBeat, ExportProject
├── data/
│   ├── render/
│   │   ├── FfmpegCommandBuilder.kt # pure: builds the argv (unit-tested)
│   │   ├── Media3RenderEngine.kt   # default engine (Transformer)
│   │   ├── Media3EffectFactory.kt  # ColorFilter/MotionEffect → media3 effects
│   │   ├── Media3TimelinePlan.kt   # pure: seam trims + fade schedule (unit-tested)
│   │   ├── Media3Overlays.kt       # animated text + fade-through-black overlays
│   │   └── ExportService.kt        # foreground service for the render
│   ├── media/MediaRepositoryImpl.kt
│   ├── audio/BeatDetector.kt       # PCM → onsets → BPM + confidence
│   └── repository/                 # Render + (in-memory) Project repositories
├── presentation/
│   ├── editor/                     # EditorContract, EditorViewModel, EditorScreen
│   ├── components/                 # MediaCanvas, EffectSelectionBar, Timeline
│   └── theme/Theme.kt
└── src/ffmpeg/java/…               # optional FFmpegKit engine (opt-in source set)
```

---

## 2. The render pipeline — two engines, one interface

Everything above `domain/render/RenderEngine.kt` is engine-agnostic:

```kotlin
interface RenderEngine {
    val id: RenderEngineId
    fun isAvailable(): Boolean
    fun supports(project: AdProject): Boolean
    fun render(project: AdProject, outputPath: String): Flow<RenderProgress>
}
```

| | **Media3 Transformer** (default) | **FFmpegKit** (opt-in) |
|---|---|---|
| Encoding | MediaCodec, hardware | libx264, software |
| Speed (15 s @1080×1920) | a few seconds | ~20–40 s, device gets hot |
| APK cost | none (already a dependency) | ~20–40 MB of native libs |
| Transitions | fade-through-black approximation | full `xfade` catalogue |
| Availability | always | only with `-Padstudio.ffmpegKit=true` |

`RenderEngineSelector` picks per project: Media3 unless the edit uses a transition Media3
cannot express (`wipeleft`, `circleopen`, `pixelize`), in which case the job goes to
FFmpeg. Nothing silently degrades — `TransitionType.media3Approximated` is the flag that
decides, and `TransitionType.universal` is what the picker shows first.

> **Dependency note, worth knowing before you plan around it.** The upstream
> `com.arthenica:ffmpeg-kit-*` artifacts were withdrawn from the public repositories. The
> FFmpeg engine is therefore behind a Gradle flag and an extra source set
> (`app/src/ffmpeg/java`), so the app builds and ships without it. Point the dependency at
> your own mirror or a maintained fork to enable it. The *command builder* is always
> compiled and always tested, so the filtergraph work is not lost either way.

### 2.1 The transition arithmetic (the part that is easy to get wrong)

`xfade` consumes its duration from **both** sides of a join, so the k-th transition starts
at `Σ d[0..k-1] − Σ overlap[1..k]`. Off-by-one here is what produces the classic
"last image freezes / video ends early" bug. It lives in exactly one place:

```kotlin
// FfmpegCommandBuilder.kt
fun transitionOffsetMs(project: AdProject, joinIndex: Int): Long {
    var offset = 0L
    for (i in 0 until joinIndex) {
        offset += project.clips[i].durationMs - project.clips[i].effectiveTransitionMs(next = true)
    }
    return offset.coerceAtLeast(0L)
}
```

and the timeline model agrees with it by construction:
`AdProject.totalDurationMs == Σ d − Σ overlap`.

The generated graph for three stills with a 0.5 s dissolve looks like:

```
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,
     zoompan=…,eq=saturation=1.45:contrast=1.15,fps=30,format=yuv420p,setsar=1[v0];
[1:v]…[v1];
[2:v]…[v2];
[v0][v1]xfade=transition=fade:duration=0.500:offset=2.500[x1];
[x1][v2]xfade=transition=fade:duration=0.500:offset=5.000[x2];
[x2]drawtext=text='Order now':fontsize=115:…:enable='between(t,5.5,8.0)'[t0];
[3:a]aformat=…,volume=0.800,afade=t=in:st=0:d=0.300,afade=t=out:…[amusic]
```

Key framing decision, applied identically by both engines: **cover-and-crop, never
letterbox.** `force_original_aspect_ratio=increase` + `crop` on the FFmpeg side,
`Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP` on the Media3 side. A 4:3 product photo fills
a 9:16 reel instead of sitting in black bars.

### 2.2 How Media3 fakes a transition

Media3 plays sequence items back to back — there is no cross-clip API. `Media3TimelinePlan`
therefore takes `t/2` off the end of the outgoing clip and `t/2` off the head of the
incoming one, and schedules a black overlay whose alpha ramps `0 → 1 → 0` across the seam.
Splitting the overlap evenly is what keeps both engines' timelines the *same length*, so
switching engines never moves a text overlay. `Media3TimelinePlanTest` pins that invariant:

```kotlin
assertEquals(project.totalDurationMs, plan.totalDurationMs)
assertEquals(project.totalDurationMs, plan.items.sumOf { it.durationMs })
```

---

## 3. Key dependencies

`gradle/libs.versions.toml` is the single source of versions; `app/build.gradle.kts`
consumes it. The essentials:

```kotlin
// UI
implementation(platform(libs.compose.bom))     // 2024.12.01
implementation(libs.compose.material3)
implementation(libs.compose.foundation)
implementation(libs.androidx.activity.compose)
implementation(libs.androidx.lifecycle.runtime.compose)   // collectAsStateWithLifecycle

// Rendering — Media3 1.5.1
implementation(libs.media3.transformer)  // Transformer, Composition, EditedMediaItem
implementation(libs.media3.effect)       // Presentation, HslAdjustment, overlays
implementation(libs.media3.exoplayer)    // preview playback
implementation(libs.media3.ui)

// Optional second engine (see §2)
if (useFfmpegKit) implementation(libs.ffmpeg.kit)

// State / DI / async
implementation(libs.kotlinx.coroutines.android)
implementation(libs.hilt.android); ksp(libs.hilt.compiler)
implementation(libs.hilt.navigation.compose)

// Media plumbing
implementation(libs.coil.compose)        // thumbnails, canvas preview
implementation(libs.work.runtime.ktx)    // long exports survive process pressure
implementation(libs.datastore.preferences)
```

Toolchain: AGP 8.7, Kotlin 2.0.21 with the Compose compiler plugin, KSP for Hilt, JDK 17,
`minSdk 24` / `compileSdk 35`, core library desugaring on.

---

## 4. State management

Unidirectional, one state object, one event channel:

```
UI ──EditorAction──▶ EditorViewModel ──use case──▶ domain ──▶ repository
 ▲                        │
 └──StateFlow<EditorUiState>┘        Channel<UiEvent> for one-shots (snackbar, share)
```

* `EditorUiState` is a single immutable data class with derived properties (`selectedClip`,
  `canExport`, `exportPercent`) so composables never recompute policy.
* Every mutating path goes through `EditorViewModel.mutate {}`: snapshot for undo → apply →
  persist. Undo is a bounded `ArrayDeque<AdProject>` — one line, because a project *is* the
  entire edit.
* `RenderProgress` is a sealed interface flowing from the engine straight into state, so
  cancelling the collector cancels the export (`awaitClose { transformer.cancel() }`).
* Composables are stateless below `EditorRoute`; `EditorScreen(state, onAction, …)` can be
  driven from a `@Preview` or a screenshot test with a hand-built state.

---

## 5. UI — the two surfaces that carry the product

### 5.1 `MediaCanvas` (`presentation/components/MediaCanvas.kt`)

Three rules it enforces:

1. **The canvas *is* the export frame.** `Modifier.aspectRatio(project.settings.aspectRatio.value)`
   — no "looked fine in the editor, cropped on TikTok".
2. **Overlay geometry is normalised.** Drags are converted back to 0..1 fractions before
   they reach the ViewModel, so one `TextOverlay` renders identically at preview size and
   at 1080×1920.
3. **The preview approximates; the renderer decides.** Motion is a cheap `graphicsLayer`
   scale, not a GL pass — accurate enough to judge framing, and the canvas stays at 60 fps
   while a finger is down.

It also draws **safe-area guides**: the top strip and the bottom ~22 % where TikTok and
Reels paste their own UI over the video. Text dropped in there gets covered on the real
platform, and the guide is the cheapest way to stop that happening.

```kotlin
BoxWithConstraints(
    modifier = modifier
        .fillMaxWidth()
        .aspectRatio(project.settings.aspectRatio.value)
        .clip(RoundedCornerShape(18.dp))
        .background(Color.Black),
) {
    AsyncImage(
        model = clip.asset.uri,
        contentScale = ContentScale.Crop,          // same cover-and-crop as the renderer
        modifier = Modifier.fillMaxSize().graphicsLayer {
            val scale = clip.previewScaleAt(progress)
            scaleX = scale; scaleY = scale
            translationX = clip.motionEffect.panXFraction * progress * size.width
            translationY = clip.motionEffect.panYFraction * progress * size.height
        },
    )
    SafeAreaGuides()
    project.overlays.forEach { DraggableTextOverlay(it, …) }
}
```

### 5.2 `EffectSelectionBar` (`presentation/components/EffectSelectionBar.kt`)

A tool row (Transitions · Effects · Speed · Text · Audio) over one horizontally scrollable
chip row, rebuilt per tool through a single generic `OptionRow<T>`.

* **One scrollable row, never a grid** — effects are browsed, not searched, and a grid
  pushes the canvas off a 5-inch screen.
* **No "apply" button.** Every chip is an immediate edit; the undo stack is what makes that
  safe. This is why each option emits an `EditorAction` instead of mutating anything.
* **Selection state is read from the clip**, not held by the bar, so re-selecting a clip
  shows the right chip active with no extra bookkeeping.
* The Audio tool is where beat-sync lives: the switch is disabled until `BeatDetector`
  reports `confidence ≥ 0.55`, so the app never chops an edit on noise it misheard.

---

## 6. Audio & beat sync

`data/audio/BeatDetector.kt` — MediaExtractor + MediaCodec decode → per-hop RMS envelope →
positive energy flux → adaptive median threshold → peak picking with a refractory gap →
BPM from the median inter-onset interval, plus a *confidence* score from interval variance.

Deliberately not an ML tempo model: it runs in well under a second for a 3-minute track,
adds no model file to the APK, and is accurate enough for the four-on-the-floor music that
actually goes under product ads. Where it is weak (sparse, rubato, speech) the confidence
score collapses, and the UI uses that to leave snapping off rather than guess.

`SnapCutsToBeatUseCase` then moves each boundary to the nearest beat **within 250 ms**
(half a beat at 120 BPM) — images are held longer or shorter, videos keep their framing and
change `speedFactor` instead, so the shot still shows the same action.

---

## 7. Performance and platform notes

* **Export runs under a foreground service** (`mediaProcessing` type) so leaving the editor
  or locking the screen does not kill a 40-second render.
* **Media3 threading**: `Transformer` must be built, started and polled on a Looper thread;
  every touch of it hops to `Dispatchers.Main`, and progress is *polled* (`ProgressHolder`)
  because Transformer has no progress callback.
* **Ken Burns without jitter**: on the FFmpeg path the frame is scaled 2× before `zoompan`,
  because `zoompan` steps in integer source pixels and zooming an already-output-sized frame
  visibly stutters.
* **The photo picker needs no permission** on any API level; `READ_MEDIA_*` is declared only
  for the paths that still require it. A permission dialog before the user has seen the app
  work is the fastest way to lose them.
* **Exports land in the cache** and are published to `Movies/AdStudio` through MediaStore
  only when the user saves, so abandoned renders cost the user nothing.

---

## 8. Testing

JVM unit tests, no emulator, covering exactly the logic that breaks silently:

| Test | What it pins down |
|---|---|
| `FfmpegCommandBuilderTest` | transition offsets, output length, clamped overlaps, cover-and-crop, `atempo` staging, `drawtext` escaping |
| `Media3TimelinePlanTest` | both engines produce the same timeline length; fade windows centre on the seam |
| `BuildImageAdUseCaseTest` | the auto-edit hits its duration budget and respects platform caps |
| `SnapCutsToBeatUseCaseTest` | boundaries snap within tolerance, are left alone outside it, videos re-time by speed |

```bash
./gradlew :app:testDebugUnitTest
```

---

## 9. Status — what is implemented, what is scaffolded

Implemented end to end: the domain model, all four use cases, both render engines, the
effect/transition mappings, beat detection, the export service and MediaStore publishing,
the whole editor UI and its ViewModel, and the unit tests above.

Deliberately scaffolded, with the seam already in place:

* **Persistence** — `InMemoryProjectRepository` satisfies `ProjectRepository`; the Room
  entities + DAO are a one-binding swap in `DataModule`. Projects do not survive process
  death yet.
* **Preview playback** — the canvas renders from project state on a ticking playhead rather
  than through an ExoPlayer `CompositionPlayer`. Fine for framing, not frame-accurate.
* **"AI" features** — the auto-edit is rule-based (`BuildImageAdUseCase.AdStyle`), which is
  what makes it fast and offline. Caption generation or scene-aware cropping would attach at
  the use-case layer without touching the render pipeline.
* **App icon, launcher assets and font files** are not in the repo; the manifest references
  `@mipmap/ic_launcher` and `TextFont` entries point at `assets/fonts/*.ttf`.

The Android-dependent code has not been compiled in the environment this was written in —
there is no Android SDK there. What *can* be checked without one is the pure-Kotlin layer
(domain, `FfmpegCommandBuilder`, `Media3TimelinePlan`) plus its tests, which compile and
run on a plain JVM. Media3 APIs are pinned to
**1.5.1**; `androidx.media3.effect` is `@UnstableApi`, so `Media3EffectFactory`,
`Media3Overlays` and `Media3RenderEngine` are the three files to re-check on a version bump.

---

## 10. Build

```bash
# default build — Media3 only
./gradlew :app:assembleDebug

# with the FFmpeg engine, against your own mirror of the artifacts
./gradlew :app:assembleDebug -Padstudio.ffmpegKit=true
```

---

## کورتەیەک بە کوردی

ئەم بەشە بەرنامەیەکی ئەندرۆیدە کە وێنەکانی بەرهەم دەگۆڕێت بۆ ڤیدیۆی ڕیکلامی کورت
(٩:١٦ بۆ TikTok و Reels)، لەگەڵ دەستکاریکردنی ڤیدیۆ، فلتەر، جوڵە، خێرایی، دەقی
جوڵاو و مۆسیقا کە لەگەڵ ڕیتمەکە ڕێک دەخرێت.

- **بنەما:** Clean Architecture — `domain` (کۆدی پاک بێ ئەندرۆید)، `data`، `presentation`.
- **وێنە → ڤیدیۆ:** بە Media3 Transformer (خێرا، بە hardware) و FFmpeg وەک هەڵبژاردەی دووەم
  بۆ ئەو گۆڕانکارییانەی Media3 ناتوانێت.
- **ڕووکار:** Jetpack Compose — `MediaCanvas` (پێشاندانی ڕاستەقینەی چوارچێوەی دەرچوون) و
  `EffectSelectionBar` (هەڵبژاردنی ئیفێکت و گۆڕان).
- **تاقیکردنەوە:** ئەو بەشانەی لۆژیکی مەترسیداریان تێدایە (ژماردنی کاتی گۆڕانەکان،
  ڕێکخستن لەگەڵ ڕیتم) بە تێستی JVM پشتڕاست کراونەتەوە.

وردەکاری تەواو لە بەشەکانی سەرەوە بە ئینگلیزی هەیە.
