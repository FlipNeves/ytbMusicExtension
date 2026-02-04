# 🎵 Focus Music Player - YouTube Music Extension

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

- **Featured album cover** with a blurred background effect
- **Smooth animation** for transitions between songs
- **Dynamic theme** - interface colors are automatically extracted from the album cover
- **Keyboard shortcut** - press `ESC` to quickly exit

### Synchronized Lyrics

Integration with the **lrclib.net** API for displaying lyrics:

- **Synchronized lyrics** that follow the music in real-time
- **Click to navigate** - jump to any part of the song by clicking on the lyrics
- **Smart auto-scroll** with user interaction detection
- **Fallback to plain lyrics** when synchronization is not available
- **Lyric caching** to avoid repeated requests

### Player Controls

Complete controls without leaving Focus Mode:

- **Play/Pause** - playback control
- **Next/Previous** - navigation between songs
- **Volume** - volume slider control
- **Progress** - clickable progress bar for seeking
- **Like** - add songs to favorites
- **Share** - copy the song link

### Audio Visualizer

Animated bars that react to the music:

- **Audio Context API** for real-time frequency analysis
- **Animated fallback** when audio cannot be analyzed
- **Optimized for performance** with throttling at 30 FPS

### "Up Next" Preview

Shows what the next song in the queue will be:

- **Smart extraction** from the YouTube Music queue
- **Video filtering** - ignores video content (MVs, live performances)
- **Autoplay support** - works with radio and automatic suggestions

### Dynamic Theme

The interface adapts to the current song:

- **Dominant color extraction** from the album cover
- **Automatic brightness adjustment** to ensure readability
- **CSS Custom Properties** for theme propagation

---

## 🏗️ Architecture

```
ytbMusicExtension/
├── react-app/                    # Main application
│   ├── public/
│   │   ├── manifest.json         # Manifest V3 configuration
│   │   └── interceptor.js        # Script injected into the page context
│   └── src/
│       ├── features/
│       │   └── focus-mode/       # Focus Mode components
│       │       ├── FocusMode.tsx     # Main component
│       │       ├── Player.tsx        # Music player
│       │       ├── Lyrics.tsx        # Lyrics display
│       │       ├── Controls.tsx      # Media controls
│       │       ├── Visualizer.tsx    # Audio visualizer
│       │       ├── UpNext.tsx        # Next song
│       │       └── styles/           # Modular CSS styles
│       ├── hooks/
│       │   ├── useYTMObserver.ts     # Facade for YTM observation
│       │   ├── useSongState.ts       # Current song state
│       │   ├── usePlayerControls.ts  # Player controls
│       │   ├── useUpNext.ts          # Next song in queue
│       │   └── useVisualizer.ts      # Audio visualizer
│       ├── services/
│       │   ├── LyricsService.ts      # Lyrics fetching
│       │   ├── ColorService.ts       # Color extraction
│       │   ├── TimeService.ts        # Time formatting
│       │   └── YTMBridge.ts          # Communication with YTM
│       └── types/                    # TypeScript definitions
```

---

## 🛠️ Tech Stack

| Technology | Version | Usage |
|------------|--------|-----|
| **React** | 19.2 | Focus Mode Interface |
| **TypeScript** | 5.9 | Static typing |
| **Vite (Rolldown)** | 7.2 | Build and bundling |
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
   npm run build
   ```

4. **Load in the browser:**
   - Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
   - Enable **Developer mode**
   - Click on **Load unpacked**
   - Select the `react-app/dist` folder

### For Users

The extension is available in the extension stores:

- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/focus-music-player/pldfnpciekkfilhlaeoncmejmdhkhjci)

---

## How to Use

1. Open [YouTube Music](https://music.youtube.com)
2. Play a song
3. Click the **Focus Mode** button that appears in the interface
4. Enjoy the immersive experience!

### Shortcuts

| Shortcut | Action |
|--------|------|
| `ESC` | Exit Focus Mode |
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