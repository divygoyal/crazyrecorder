# YourBrand — Project Context & History

> This document provides full context for AI assistants (GitHub Copilot, Claude, etc.) working on this codebase.

## What This Project Is

This is a **fork of [Recordly](https://github.com/webadderall/Recordly)** — an open-source screen recording and video editing desktop app. We are rebranding it and building a Chrome extension version alongside it.

- **License:** AGPLv3 (source code must remain public on GitHub)
- **Original repo:** `webadderall/Recordly`
- **Our fork:** `divygoyal/Recordly`
- **Brand name:** `YourBrand` (placeholder — will be replaced with final name)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop app | Electron + React 18 + TypeScript |
| Video preview | PixiJS v8 (WebGL canvas) |
| Video encoding | FFmpeg (ffmpeg-static) + WebCodecs + mediabunny (MP4 mux) |
| GIF export | gif.js |
| Screen capture (Windows) | WGC (Windows Graphics Capture) via custom C++ binary (`wgc-capture.exe`) |
| Screen capture (macOS) | ScreenCaptureKit via Swift binary |
| Cursor tracking | uiohook-napi (global keyboard/mouse hooks) |
| UI styling | Tailwind CSS + Radix UI primitives |
| Build | Vite + electron-builder |
| Testing | Vitest |
| Chrome extension | React + TypeScript + Vite (MV3) |

---

## Project Structure

```
Recordly/
├── electron/                    # Electron main process
│   ├── main.ts                  # App lifecycle, tray, menus, window management
│   ├── windows.ts               # Window creation (HUD overlay, editor, source selector)
│   ├── preload.ts               # IPC bridge (contextBridge → electronAPI)
│   ├── cursorHider.ts           # Cursor visibility control during recording
│   ├── ipc/
│   │   └── handlers.ts          # ALL IPC handlers (~4400 lines) — recording, capture, export, projects
│   └── native/
│       ├── wgc-capture/         # C++ Windows Graphics Capture binary (CMake project)
│       ├── cursor-monitor/      # C++ cursor position monitor (CMake project)
│       └── ScreenCaptureKitRecorder.swift  # macOS capture
├── src/                         # React renderer process
│   ├── App.tsx                  # Router — switches on windowType (hud-overlay, editor, etc.)
│   ├── components/
│   │   ├── video-editor/
│   │   │   ├── VideoEditor.tsx  # Main editor component (~3000 lines)
│   │   │   ├── VideoPlayback.tsx # PixiJS video preview (~1800 lines)
│   │   │   ├── SettingsPanel.tsx # Left sidebar settings
│   │   │   ├── TutorialHelp.tsx  # Help/feedback dialogs
│   │   │   ├── types.ts         # Core types (ZoomRegion, CursorTelemetry, etc.)
│   │   │   ├── projectPersistence.ts # .yourbrand project file format
│   │   │   ├── editorPreferences.ts  # Persistent editor settings
│   │   │   ├── videoPlayback/
│   │   │   │   ├── layoutUtils.ts    # PixiJS canvas layout & sizing
│   │   │   │   ├── cursorRenderer.ts # PixiJS cursor overlay rendering
│   │   │   │   └── cursorSway.ts     # Cursor sway animation
│   │   │   └── timeline/
│   │   │       ├── TimelineEditor.tsx # Timeline with zoom/trim/speed regions
│   │   │       └── zoomSuggestionUtils.ts # Auto-zoom algorithm (cursor-based)
│   │   ├── launch/              # Recording HUD overlay UI
│   │   ├── countdown/           # Countdown overlay
│   │   └── ui/                  # Shared UI primitives (Radix-based)
│   ├── hooks/
│   │   └── useScreenRecorder.ts # Core recording logic (~450 lines)
│   ├── lib/
│   │   ├── exporter/            # MP4/GIF/audio export pipeline (WebCodecs + mediabunny)
│   │   ├── geometry/            # Squircle, math utils
│   │   ├── wallpapers.ts        # Background wallpaper management
│   │   └── customFonts.ts       # Google Fonts integration
│   ├── contexts/
│   │   ├── I18nContext.tsx       # Internationalization (en, es, zh-CN)
│   │   └── ShortcutsContext.tsx  # Keyboard shortcuts
│   └── i18n/locales/            # Translation files (3 languages × 7 namespaces)
├── packages/
│   └── chrome-extension/        # Chrome extension (MV3)
│       ├── manifest.json        # Permissions: tabCapture, desktopCapture, offscreen
│       ├── src/
│       │   ├── background/service-worker.ts  # Extension lifecycle & recording management
│       │   ├── popup/Popup.tsx               # Recording controls popup
│       │   ├── offscreen/index.ts            # MediaRecorder (runs in offscreen document)
│       │   ├── editor/Editor.tsx             # Post-recording editor page
│       │   ├── content/cursor-tracker.ts     # Mouse tracking content script
│       │   └── storage/db.ts                 # IndexedDB for recordings & projects
│       ├── vite.config.ts
│       └── package.json
├── NOTICE                       # AGPLv3 attribution (Recordly + OpenScreen)
├── LICENSE.md                   # AGPLv3 full text
├── electron-builder.json5       # Desktop app build config
└── package.json
```

---

## What Has Been Done

### Phase 1: Rebranding (Complete)
- Replaced all `Recordly`/`recordly` references → `YourBrand`/`yourbrand` across 32 files
- Updated: package.json, electron-builder, App.tsx, main.ts, windows.ts, all i18n locales (en/es/zh-CN), types.ts, projectPersistence.ts, editorPreferences.ts, TutorialHelp.tsx, I18nContext.tsx, customFonts.ts, useScreenRecorder.ts, handlers.ts, ScreenCaptureKitRecorder.swift
- Copied icon files with `yourbrand-` prefix to `public/app-icons/`
- Backward compatibility preserved: `.recordly` and `.openscreen` project files still open
- Added `NOTICE` file for AGPLv3 license compliance

### Phase 2: Chrome Extension (Complete — MVP)
- Built a full MV3 Chrome extension in `packages/chrome-extension/`
- Features: tab capture, desktop capture, mic/webcam toggles, offscreen MediaRecorder, editor page with timeline/trim/export, cursor tracking content script, IndexedDB storage
- Builds with: `npm run build:extension`
- Load unpacked from `packages/chrome-extension/dist/`

### Phase 3: Bug Fixes Applied

#### Video Loading Fix (editor showed white screen after recording)
- **Root cause:** `finalizeStoredVideo()` in handlers.ts had a `waitForFileReady()` function that polled file size and timed out, returning `success: false` — so `currentVideoPath` was never set
- **Fix:** Removed `waitForFileReady()`, restored original simple `finalizeStoredVideo()`
- **Files:** `electron/ipc/handlers.ts`

#### Mux Error Handling
- **Root cause:** `muxNativeWindowsRecording()` could fail silently, losing the video path
- **Fix:** Added try/catch with fallback to original recording path in `useScreenRecorder.ts`
- **Files:** `src/hooks/useScreenRecorder.ts`

#### WGC Capture Resolution (Windows DPI scaling)
- **Root cause:** WGC config didn't include `width`/`height`, so it captured at LOGICAL pixels (1536×864 at 125% DPI) instead of PHYSICAL pixels (1920×1080)
- **Fix:** Added physical pixel dimensions to WGC config using `display.size * display.scaleFactor`
- **Files:** `electron/ipc/handlers.ts` (line ~3000)

#### Blurry Preview Fix
- **Root cause:** WebGL bilinear filtering produces blur when downscaling 1920px video texture to ~1000px canvas. Bilinear only samples 4 neighboring pixels — insufficient for 2x+ downscale.
- **Fix:** Enabled **mipmapping** on the video texture (`source.autoGenerateMipmaps = true` + `source.scaleMode = 'linear'`). Mipmaps pre-compute optimized lower-resolution versions so the GPU picks the sharpest one (trilinear filtering).
- **Files:** `src/components/video-editor/VideoPlayback.tsx` (line ~1133, VideoSource config)
- **Note:** Some softness is inherent when showing 1920px in ~1000px (1.9x downscale). Exported video is always full 1080p.

#### Editor Layout — Larger Preview
- **Change:** Made the video preview area significantly larger to show more detail
- **Before:** Preview `flex-[7]`, settings panel `max-w-[332px]`, vertical split 67/33, padding `gap-3 p-4`
- **After:** Preview `flex-[9]`, settings panel `max-w-[280px]`, vertical split 75/25, padding `gap-1 p-2`
- **Files:** `src/components/video-editor/VideoEditor.tsx` (layout divs + PanelGroup), `src/components/video-editor/SettingsPanel.tsx` (panel width constraints)

#### Preview Fidelity Follow-Up
- **Root cause:** The editor preview still spent GPU work on inactive motion-blur filters and rendered at plain device pixel ratio on lower-density displays, making the live preview look softer than necessary.
- **Fix:** Added preview oversampling (`1.5x` minimum, `2x` cap), only attach motion-blur filters when the blur effect is actually enabled, aligned `VideoPlayback` fallback padding with the project default, and increased the editor preview panel default split from `75` to `78`.
- **Files:** `src/components/video-editor/VideoPlayback.tsx`, `src/components/video-editor/VideoEditor.tsx`, `src/lib/exporter/frameRenderer.ts`, `src/components/video-editor/videoPlayback/renderQuality.ts`

#### Windows Capture Bitrate Fix
- **Root cause:** Native Windows capture encoded H.264 at a fixed **20 Mbps**, which is too low for crisp 1080p/1440p recordings and caused visible compression artifacts in the source video before it even reached the editor.
- **Fix:** Replaced the fixed bitrate with a resolution/FPS-scaled bitrate heuristic in both native Media Foundation encoder implementations, with higher targets for 720p/1080p/1440p/4K and safe min/max clamps.
- **Files:** `electron/native/wgc-capture/src/mf_encoder.cpp`, `electron/native/windows-capture/src/mf_encoder.cpp`

---

## What Still Needs To Be Done

### Brand Name
- Replace `YourBrand`/`yourbrand` placeholder with final chosen name
- Create proper logo/icons

### Desktop App
- Design and replace icon files (currently using Recordly's icons with `yourbrand-` prefix)
- Test full recording → edit → export flow on clean Windows install
- Build Windows installer: `npm run build:win`
- Whisper runtime (auto-captions) — build script fails on Windows due to `tar` extraction issue

### Chrome Extension
- Test in Chrome (load unpacked from `packages/chrome-extension/dist/`)
- Add proper GIF export (currently placeholder using WebM fallback)
- Integrate shared editor components from desktop app for richer editing
- Publish to Chrome Web Store

### Distribution
- Push all changes to GitHub: `git add -A && git commit && git push`
- Create GitHub releases
- Set up CI/CD (`.github/workflows/`)

---

## Key Architecture Decisions

### Recording Flow (Desktop — Windows)
1. User clicks Record → `useScreenRecorder.ts` → IPC `start-native-screen-recording`
2. `handlers.ts` spawns `wgc-capture.exe` with JSON config (outputPath, fps, width, height, audio settings)
3. WGC captures frames via Windows Graphics Capture API → H.264 encode via Media Foundation → MP4
4. Cursor telemetry captured in parallel via `uiohook-napi`
5. User clicks Stop → `stopNativeScreenRecording` sends "stop\n" to WGC stdin
6. If audio was captured (system + mic), `muxNativeWindowsRecording` runs FFmpeg to merge
7. `finalizeStoredVideo` sets `currentVideoPath` and persists cursor telemetry to `.cursor.json`
8. `switchToEditor` closes HUD window, creates editor window
9. Editor's `loadInitialData()` calls `getCurrentVideoPath()` → loads video in PixiJS

### Video Preview Rendering
- PixiJS Application with `resolution: devicePixelRatio`, `autoDensity: true`
- `VideoSource.from(videoElement)` creates live texture from hidden `<video>` element
- **Mipmapping enabled** (`autoGenerateMipmaps: true`, `scaleMode: 'linear'`) for sharp downscaling
- `layoutVideoContent()` in `layoutUtils.ts` calculates scale/position based on container size
- Default padding = 50 → video uses 80% of canvas width (`paddingScale = 1.0 - (padding/100)*0.4`)
- ResizeObserver triggers relayout when container changes
- Cursor overlay rendered as PixiJS sprites on top of video
- Canvas CSS: `style.width/height = '100%'` to fill the flex container

### Auto-Zoom (Already Built)
- Cursor telemetry (position + clicks) saved during recording to `.cursor.json`
- `zoomSuggestionUtils.ts` detects interaction moments (clicks, dwells, text selections)
- Magic wand button in timeline toolbar triggers `handleSuggestZooms()`
- Creates `ZoomRegion[]` on the timeline with configurable depth and focus point

### Chrome Extension Architecture
- MV3 service worker manages state and routing
- Offscreen document runs MediaRecorder (service workers can't access it)
- Tab capture via `chrome.tabCapture.getMediaStreamId()`
- Desktop capture via `chrome.desktopCapture.chooseDesktopMedia()`
- After recording, opens `editor.html` tab with recording ID → loads from IndexedDB
- Cursor tracking via content script injection on recorded tab

---

## Common Development Commands

```bash
# Desktop app
npm run dev              # Start Electron app in dev mode
npm run test             # Run 104 tests (vitest)
npm run build:win        # Build Windows installer
npm run build:extension  # Build Chrome extension

# Chrome extension
cd packages/chrome-extension
npm run build            # Build to dist/
npm run dev              # Watch mode

# Native modules (after installing CMake + VS Build Tools)
npm run build:windows-capture  # Build wgc-capture.exe
npm run build:cursor-monitor   # Build cursor-monitor.exe
```

---

## Important Files for Common Tasks

| Task | Files |
|------|-------|
| Add new IPC handler | `electron/ipc/handlers.ts`, `electron/preload.ts` |
| Modify recording behavior | `src/hooks/useScreenRecorder.ts`, `electron/ipc/handlers.ts` |
| Change editor UI | `src/components/video-editor/VideoEditor.tsx` |
| Fix video preview | `src/components/video-editor/VideoPlayback.tsx`, `videoPlayback/layoutUtils.ts` |
| Modify export pipeline | `src/lib/exporter/videoExporter.ts`, `gifExporter.ts` |
| Add translations | `src/i18n/locales/{en,es,zh-CN}/*.json` |
| Change branding | Search for `YourBrand`/`yourbrand` globally |
| Modify Chrome extension | `packages/chrome-extension/src/` |
| WGC capture settings | `electron/ipc/handlers.ts` (~line 2990), `electron/native/wgc-capture/src/main.cpp` |
