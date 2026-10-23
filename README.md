# 🎵 Focus Mode for YouTube Music

<div align="center">

A browser extension that transforms your YouTube Music experience with an immersive and elegant **Focus Mode**.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Rolldown-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

</div>

---

## 📖 About the Project

This project was born out of curiosity to understand **how browser extensions work**. What started as a learning experiment evolved into a complete tool that significantly enhances the YouTube Music user experience.

The extension adds a **Focus Mode** to YouTube Music, creating an immersive and minimalist interface that helps you concentrate on your music while studying, working, or simply relaxing.

Developing this extension provided deep learning about:

- Manifest V3 extension architecture
- Content Scripts and code injection into the page context
- Communication between service workers, content scripts, and the web page
- Observing and manipulating the DOM of SPA applications
- Integrating React into an extension environment

---

## ✨ Features

### Focus Mode

Immersive full-screen interface that eliminates visual distractions:

- **Featured album cover** with an ambient blurred backdrop
- **Smooth animation** for transitions between songs
- **Dynamic theme** - visualizer and highlights take the album's accent color
- **Fluid layout** - scales from small laptops to ultrawide monitors
- **Keyboard shortcuts** - `Alt+Shift+F` opens/closes it from any browser window; `ESC` to exit, `Space` to play/pause, arrows to seek and change volume
- **Remembers your layout** - the lyrics panel and video mode come back as you left them
- **Optional auto-open** when the music starts (see [Options](#options))

### Synchronized Lyrics

Integration with the **lrclib.net** API for displaying lyrics:

- **Synchronized lyrics** that follow the music in real-time, with sub-second precision (position read from the player itself)
- **Click to navigate** - jump to any part of the song by clicking on the lyrics
- **Smart auto-scroll** with user interaction detection
- **Fallback to plain lyrics** when synchronization is not available
- **Lyric caching** to avoid repeated requests — network failures are not cached, so reopening the panel retries

### Player Controls

Complete controls without leaving Focus Mode:

- **Play/Pause** - playback control
- **Next/Previous** - navigation between songs
- **Volume** - volume slider control
- **Progress** - clickable progress bar for seeking
- **Like** - add songs to favorites
- **Share** - copy the link of the song that is playing (`watch?v=…`), from any YouTube Music page

### Audio Visualizer

Animated bars that react to the music:

- **Audio Context API** for real-time frequency analysis
- **Animated fallback** when audio cannot be analyzed
- **Optimized for performance** with throttling at 20 FPS

### "Up Next" Preview

Shows what the next song in the queue will be:

- **Smart extraction** from the YouTube Music queue
- **Video filtering** - ignores video content (MVs, live performances)
- **Autoplay support** - works with radio and automatic suggestions

### Dynamic Theme

The interface adapts to the current song:

- **Vibrant accent extraction** - the cover's most present vivid hue (not a muddy average)
- **Guaranteed contrast** - the accent is lightened until it reaches WCAG AA against the dark UI
- **Optional tint of YouTube Music** - progress bar, play button and track title can use the accent too
- **CSS Custom Properties** for theme propagation

### Multiple Sessions

Opening a YouTube Music link no longer destroys your current queue:

- **Confirmation prompt** - when a link arrives while music is playing, choose between **playing it next** in the current queue, opening a new session, replacing the current one, or ignoring the link
- **One window per session** - each session is a dedicated window with its own player, queue and playback position, preserved with full fidelity
- **Sessions menu** in the nav bar - switch between sessions, close them, or open a new one (a badge shows how many are open)
- **Silent fallback** - with nothing playing, links open directly without any prompt, just like before
- **Survives browser restarts** - a session window brought back with `Ctrl+Shift+T` is recognized again; optionally, the last session reopens by itself, paused where it stopped

### Options

Right-click the extension icon → **Options** (or `edge://extensions` → Details → Extension options):

| Option | Default |
|--------|---------|
| Open Focus Mode when the music starts | off |
| Keep the YouTube Music sidebar collapsed (playlists stay in the extension's button) | on |
| Use the album color in YouTube Music | on |
| Reopen the last session when the browser starts | off |

The keyboard shortcut can be changed at `edge://extensions/shortcuts` (or `chrome://extensions/shortcuts`).

---

## 🏗️ Architecture

```
ytbMusicExtension/
├── react-app/                    # Main application
│   ├── branding/                 # Icon sources: icon.svg (32 px and up), icon-16.svg (PNGs live in public/)
│   ├── options.html              # Options page entry
│   ├── vite.config.ts            # Build: background + options page (ES modules)
│   ├── vite.content.config.ts    # Build: content script (single IIFE, no shared chunks)
│   ├── public/
│   │   ├── manifest.json         # Manifest V3 configuration
│   │   ├── _locales/             # Name and description per store language (en, pt_BR)
│   │   └── interceptor.js        # Runs in the page context (world: MAIN): player API, play next
│   ├── scripts/
│   │   └── build-firefox.mjs     # Generates the Firefox build (dist-firefox/)
│   └── src/
│       ├── background/           # Service worker: sessions, shortcut, reopen on startup
│       ├── content/              # Content script entry
│       ├── options/              # Options page
│       ├── features/
│       │   ├── focus-mode/       # Focus Mode components and modular CSS
│       │   ├── sessions/         # Link prompt and sessions menu
│       │   └── sidebar/          # Playlists popover
│       ├── hooks/                # Song/time state, controls, preferences, visualizer
│       ├── services/
│       │   ├── YTMBridge.ts          # Messages with interceptor.js
│       │   ├── TimeStateService.ts   # Single source of time/duration
│       │   ├── DomWatcher.ts         # One MutationObserver shared by all injected UI
│       │   ├── YTMHealth.ts          # Console warning when YTM changes a selector we rely on
│       │   ├── PreferencesService.ts # chrome.storage preferences
│       │   ├── LyricsService.ts      # Lyrics fetching and LRC parsing
│       │   ├── ColorService.ts       # Accent color extraction
│       │   └── ...
│       ├── constants.ts          # Messages and every YouTube Music selector
│       └── types/                # TypeScript definitions
```

The content script is built separately as a single IIFE: scripts declared in the manifest cannot use `import`, so it never shares chunks with the background or the options page.

---

## 🛠️ Tech Stack

| Technology | Version | Usage |
|------------|--------|-----|
| **React** | 19.2 | Focus Mode Interface |
| **TypeScript** | 5.9 | Static typing |
| **Vite (Rolldown)** | 7.2 | Build and bundling |
| **Vitest** | 4.1 | Unit tests |
| **Manifest V3** | - | Extension architecture |
| **qrcode.react** | 4.2 | PIX QR Code generation |

---

## 🚀 Installation

### For Developers

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FlipNeves/ytbMusicExtension.git
   cd ytbMusicExtension/react-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build            # Chrome / Edge / other Chromium browsers → dist/
   npm run build:firefox    # Firefox (128+) → dist-firefox/
   ```

4. **Load in the browser:**

   **Chrome / Edge / Brave / Opera (Chromium 111+):**
   - Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
   - Enable **Developer mode**
   - Click on **Load unpacked**
   - Select the `react-app/dist` folder

   **Firefox (128+):**
   - Go to `about:debugging#/runtime/this-firefox`
   - Click on **Load Temporary Add-on...**
   - Select the `react-app/dist-firefox/manifest.json` file
   - Note: in Firefox, MV3 host permissions are opt-in — open the extension entry in `about:addons` and grant access to `music.youtube.com` (sessions and the shortcut depend on it)

   **Permissions:** only `storage` plus access to `music.youtube.com` — no "read your browsing history" warning.

5. **Run the tests (optional):**
   ```bash
   npm test
   ```

### For Users

The extension is available in the extension stores:

- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/focus-music-player/pldfnpciekkfilhlaeoncmejmdhkhjci)

**Chrome, Brave, Opera and other Chromium browsers (manual install):**

1. Download the `.zip` from the [latest release](https://github.com/FlipNeves/ytbMusicExtension/releases/latest)
2. Extract it to a folder you will keep (the extension stops working if the folder is deleted)
3. Go to `chrome://extensions` and enable **Developer mode**
4. Click on **Load unpacked** and select the extracted `dist` folder

Manual installs do not update automatically. To update, extract the new `.zip` over the same folder and click the reload button on the extension card; your settings are kept.

---

## How to Use

1. Open [YouTube Music](https://music.youtube.com)
2. Play a song
3. Click the **Focus Mode** button that appears in the interface
4. Enjoy the immersive experience!

### Shortcuts

| Shortcut | Action |
|--------|------|
| `Alt+Shift+F` | Open/close Focus Mode (works from any browser window) |
| `ESC` | Exit Focus Mode |
| `Space` | Play/Pause |
| `←` / `→` | Seek -10s / +10s |
| `↑` / `↓` | Volume +5 / -5 |
| Click on album cover | Play/Pause |
| Click on progress bar | Seek in song |
| Click on lyric | Jump to that part |

---

## 📝 Learnings

This project was a learning journey about:

### Browser Extensions

- **Manifest V3** - The new extension architecture with service workers
- **Content Scripts** - Code injection into web pages
- **Message Passing** - Communication between different contexts
- **Web Accessible Resources** - Files accessible by the page

### Frontend Development

- **React 19** - Use of hooks and modern patterns
- **TypeScript** - Typing for better DX and maintainability
- **Vite with Rolldown** - Fast and efficient build
- **Modular CSS** - Organization of styles by component

### Advanced Techniques

- **MutationObserver** - Observing DOM changes
- **Web Audio API** - Frequency analysis for visualizer
- **Canvas API** - Color extraction from images
- **PostMessage API** - Cross-context communication

---

## 🤝 Contributing

Contributions are welcome!

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

<div align="center">

**If this project helped you, consider giving it a ⭐!**

</div>