# 🎵 Song Terminal — Terminal Music Player

A beautiful, feature-rich **terminal-based music player** built entirely with **Node.js**. Play, pause, stop, and navigate songs directly from the command line with a stunning visual interface.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎵 **Audio Playback** | Play WAV, MP3, OGG, FLAC, AAC, M4A files |
| ⏯️ **Play/Pause/Stop** | Full playback control with keyboard shortcuts |
| ⏭️ **Track Navigation** | Next, previous, and quick-jump to any track |
| 🔀 **Shuffle Mode** | Randomize track order with Fisher-Yates shuffle |
| 🔁 **Repeat Modes** | Off → Repeat All → Repeat One |
| 🔊 **Volume Control** | Adjustable volume (0-100%) |
| 📊 **Audio Visualizer** | Animated ASCII bar visualizer during playback |
| 📂 **Library Scanner** | Auto-scans directories for audio files |
| 🔍 **Search** | Find tracks by title, artist, or filename |
| 📁 **Add Directories** | Dynamically add more music folders at runtime |
| 📄 **Pagination** | Browse large libraries with page navigation |
| 🎨 **Beautiful UI** | Colorful terminal UI with gradient headers & box drawings |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **Audio Player** (one of the following):
  - `afplay` (built-in on macOS)
  - `ffplay` (from FFmpeg)
  - `aplay` (Linux/ALSA)
- **FFprobe** (optional, for accurate track durations — part of FFmpeg)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd song-terminal

# Install dependencies
npm install
```

### Add Music

Place your audio files (`.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`) in the `music/` folder:

```
song-terminal/
├── music/
│   ├── my_song.mp3
│   ├── ambient_track.wav
│   └── playlist/
│       ├── rock_anthem.mp3
│       └── jazz_night.ogg
```

### Run the Player

```bash
# Start with default music directory
npm start

# Or specify a custom music directory
node index.js /path/to/your/music
```

---

## 🎹 Keyboard Controls

| Key | Action |
|-----|--------|
| `SPACE` | Play / Pause |
| `S` | Stop playback |
| `N` | Next track |
| `P` | Previous track |
| `ENTER` | Play highlighted track |
| `↑` / `↓` | Navigate track list |
| `+` / `=` | Volume up (+10%) |
| `-` | Volume down (-10%) |
| `R` | Cycle repeat mode (Off → All → One) |
| `H` | Toggle shuffle mode |
| `L` | Reset library view |
| `F` | Search tracks |
| `A` | Add music directory |
| `1-9` | Quick play track by number (current page) |
| `→` / `]` / `.` | Next page |
| `←` / `[` / `,` | Previous page |
| `Q` / `Ctrl+C` | Quit |

---

## 🏗️ Project Architecture

```
song-terminal/
├── index.js              # Main entry point & application controller
├── src/
│   ├── player.js         # Audio playback engine (afplay/ffplay wrapper)
│   ├── library.js        # Music library scanner & playlist manager
│   └── ui.js             # Terminal UI renderer (colors, boxes, visualizer)
├── music/                # Default music directory
├── package.json          # Project configuration & dependencies
└── README.md             # This file
```

### Module Breakdown

#### `index.js` — Application Controller
- Initializes all modules and manages application state
- Handles raw keyboard input (stdin in raw mode)
- Coordinates between player, library, and UI
- Manages interactive modes (search, add directory)

#### `src/player.js` — Audio Player Engine
- Wraps system audio players (`afplay`, `ffplay`, `aplay`) via `child_process.spawn()`
- Manages playback state (playing, paused, stopped)
- Tracks elapsed time and progress
- Uses `SIGSTOP`/`SIGCONT` signals for pause/resume
- Emits events (`play`, `pause`, `stop`, `trackEnd`, `error`)

#### `src/library.js` — Music Library Manager
- Recursively scans directories for supported audio files
- Extracts track metadata (duration via `ffprobe`, file size, format)
- Manages playlist state with shuffle (Fisher-Yates algorithm) and repeat modes
- Provides search functionality across track titles and filenames

#### `src/ui.js` — Terminal UI Renderer
- Renders colorful box-drawing UI with Unicode characters
- Gradient-colored ASCII art header
- Animated audio visualizer using block characters (`▁▂▃▄▅▆▇█`)
- Progress bar with elapsed/total time display
- Volume indicator with emoji and bar visualization
- Paginated track list with highlight for current track

---

## 🛠️ Key Concepts Demonstrated

| Concept | Implementation |
|---------|---------------|
| **CLI Development** | Raw stdin handling, keypress events, terminal control sequences |
| **File Handling** | Recursive directory scanning, file metadata extraction |
| **Process Management** | `child_process.spawn()`, signal handling (`SIGSTOP`, `SIGCONT`, `SIGTERM`) |
| **Event-Driven Architecture** | `EventEmitter` for player state changes |
| **State Management** | Application state machine (play/pause/stop/search modes) |
| **Algorithm Implementation** | Fisher-Yates shuffle, pagination logic |
| **Terminal Graphics** | ANSI colors, Unicode box-drawing, block elements for visualizer |

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chalk` | ^4.1.2 | Terminal string styling & colors |
| `cli-table3` | ^0.6.5 | Formatted table output |
| `figlet` | ^1.12.0 | ASCII art text generation |
| `inquirer` | ^8.2.6 | Interactive CLI prompts |
| `ora` | ^5.4.1 | Elegant terminal spinners |

---

## 📝 License

ISC License — See [LICENSE](LICENSE) for details.
