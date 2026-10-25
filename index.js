#!/usr/bin/env node

/**
 * Song Terminal - Terminal Music Player
 * 
 * A beautiful, feature-rich terminal-based music player built with Node.js.
 * Supports play, pause, stop, next, previous, shuffle, repeat, volume
 * control, and more — all from the command line.
 * 
 * Usage:
 *   node index.js                    # Use default ./music directory
 *   node index.js /path/to/music     # Specify custom music directory
 * 
 * Controls:
 *   SPACE  - Play / Pause
 *   S      - Stop
 *   N      - Next track
 *   P      - Previous track
 *   +/=    - Volume up
 *   -      - Volume down
 *   R      - Cycle repeat mode (Off → All → One)
 *   H      - Toggle shuffle
 *   L      - Show library (paginated)
 *   F      - Search tracks
 *   A      - Add music directory
 *   1-9    - Quick play track by number
 *   >/. /] - Next page
 *   </, /[ - Previous page
 *   Q      - Quit
 */

const path = require('path');
const readline = require('readline');
const AudioPlayer = require('./src/player');
const MusicLibrary = require('./src/library');
const TerminalUI = require('./src/ui');

// ═══════════════════════════════════════════════════════════════
// Application State
// ═══════════════════════════════════════════════════════════════
const musicDir = process.argv[2] || path.join(__dirname, 'music');
const player = new AudioPlayer();
const library = new MusicLibrary(musicDir);
const ui = new TerminalUI();

let currentPage = 0;
const pageSize = 8;
let refreshTimer = null;
let isSearchMode = false;
let isAddDirMode = false;
let inputBuffer = '';

// ═══════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════
function init() {
  // Setup raw mode for keypress detection
  readline.emitKeypressEvents(process.stdin);

  try {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
  } catch (err) {
    // Raw mode not available — fall back to line-buffered input
  }

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Prevent stdin errors from crashing the app
  process.stdin.on('error', () => {});

  // Scan music library
  library.scan();

  // Render initial UI
  render();

  // Primary: keypress events (works in TTY terminals with raw mode)
  process.stdin.on('keypress', handleKeypress);

  // Fallback: raw data handler for terminals where keypress events don't fire
  process.stdin.on('data', (data) => {
    const char = data.toString();

    // Only use fallback if we haven't received any keypress events
    // (keypress events are preferred because they parse arrow keys, etc.)
    if (char === '\u0003') { // Ctrl+C
      quit();
      return;
    }
  });

  // Setup player events
  player.on('trackEnd', () => {
    const nextTrack = library.getNextTrack();
    if (nextTrack) {
      player.play(nextTrack);
    }
    render();
  });

  player.on('error', (err) => {
    render();
    ui.renderStatus(err, 'error');
  });

  // Start UI refresh loop (for visualizer animation + progress updates)
  refreshTimer = setInterval(() => {
    if (player.state === 'playing' && !isSearchMode && !isAddDirMode) {
      render();
    }
  }, 800);

  // Graceful shutdown
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

// ═══════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════
function render() {
  const track = library.getCurrentTrack();
  const elapsed = player.getElapsedFormatted();
  const duration = player.getDurationFormatted();
  const progress = player.getProgress();

  ui.renderFullView(
    player.state !== 'stopped' ? track : null,
    player.state,
    elapsed,
    duration,
    player.volume,
    progress,
    library.tracks,
    library.currentIndex,
    currentPage,
    library.shuffle,
    library.repeat
  );
}

// ═══════════════════════════════════════════════════════════════
// Keypress Handler
// ═══════════════════════════════════════════════════════════════
function handleKeypress(str, key) {
  // Handle Ctrl+C
  if (key && key.ctrl && key.name === 'c') {
    quit();
    return;
  }

  // Search mode input handling
  if (isSearchMode) {
    handleSearchInput(str, key);
    return;
  }

  // Add directory mode input handling
  if (isAddDirMode) {
    handleAddDirInput(str, key);
    return;
  }

  if (!key) return;

  switch (key.name) {
    case 'space':
      togglePlayPause();
      break;

    case 'return':
      // Play the currently highlighted track
      playCurrentTrack();
      break;

    case 's':
      stopPlayback();
      break;

    case 'n':
      nextTrack();
      break;

    case 'p':
      previousTrack();
      break;

    case 'r':
      cycleRepeat();
      break;

    case 'h':
      toggleShuffle();
      break;

    case 'l':
      currentPage = 0;
      render();
      break;

    case 'f':
      enterSearchMode();
      break;

    case 'a':
      enterAddDirMode();
      break;

    case 'q':
      quit();
      break;

    case 'up':
      navigateList(-1);
      break;

    case 'down':
      navigateList(1);
      break;

    case 'right':
    case 'tab':
      nextPage();
      break;

    case 'left':
      prevPage();
      break;

    default:
      // Handle +/- for volume
      if (str === '+' || str === '=') {
        volumeUp();
      } else if (str === '-') {
        volumeDown();
      }
      // Handle 1-9 for quick play
      else if (str >= '1' && str <= '9') {
        quickPlay(parseInt(str) - 1 + (currentPage * pageSize));
      }
      // Handle ] and [ for page navigation
      else if (str === ']' || str === '.' || str === '>') {
        nextPage();
      } else if (str === '[' || str === ',' || str === '<') {
        prevPage();
      }
      break;
  }
}

// ═══════════════════════════════════════════════════════════════
// Playback Controls
// ═══════════════════════════════════════════════════════════════
function togglePlayPause() {
  if (player.state === 'playing') {
    player.pause();
  } else if (player.state === 'paused') {
    player.resume();
  } else {
    // Nothing playing, start from current track
    const track = library.getCurrentTrack();
    if (track) {
      player.play(track);
    }
  }
  render();
}

function playCurrentTrack() {
  const track = library.getCurrentTrack();
  if (track) {
    player.play(track);
  }
  render();
}

function stopPlayback() {
  player.stop();
  render();
}

function nextTrack() {
  const track = library.getNextTrack();
  if (track) {
    player.play(track);
  }
  render();
}

function previousTrack() {
  const track = library.getPreviousTrack();
  if (track) {
    player.play(track);
  }
  render();
}

function volumeUp() {
  player.setVolume(player.volume + 10);
  render();
}

function volumeDown() {
  player.setVolume(player.volume - 10);
  render();
}

function cycleRepeat() {
  library.cycleRepeat();
  render();
}

function toggleShuffle() {
  library.toggleShuffle();
  render();
}

function navigateList(direction) {
  const newIdx = library.currentIndex + direction;
  if (newIdx >= 0 && newIdx < library.tracks.length) {
    library.currentIndex = newIdx;

    // Auto-scroll pages
    const trackPage = Math.floor(newIdx / pageSize);
    if (trackPage !== currentPage) {
      currentPage = trackPage;
    }
  }
  render();
}

function quickPlay(index) {
  const track = library.jumpToTrack(index);
  if (track) {
    player.play(track);
  }
  render();
}

function nextPage() {
  const totalPages = Math.ceil(library.tracks.length / pageSize);
  if (currentPage < totalPages - 1) {
    currentPage++;
  }
  render();
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
  }
  render();
}

// ═══════════════════════════════════════════════════════════════
// Search Mode
// ═══════════════════════════════════════════════════════════════
function enterSearchMode() {
  isSearchMode = true;
  inputBuffer = '';
  render();
  const chalk = require('chalk');
  console.log(chalk.hex('#60A5FA')('\n  🔍 Search: ') + chalk.dim('(type query, ENTER to search, ESC to cancel)'));
  process.stdout.write(chalk.hex('#60A5FA')('  > '));
}

function handleSearchInput(str, key) {
  const chalk = require('chalk');

  if (key && key.name === 'escape') {
    isSearchMode = false;
    inputBuffer = '';
    render();
    return;
  }

  if (key && key.name === 'return') {
    const results = library.search(inputBuffer);
    isSearchMode = false;
    render();
    ui.renderSearchResults(results, inputBuffer);

    if (results.length > 0) {
      console.log(chalk.dim('\n  Press a number (1-9) to play, or any key to return.'));

      // Temporarily override keypress for result selection
      const originalHandler = handleKeypress;
      const resultHandler = (s, k) => {
        process.stdin.removeListener('keypress', resultHandler);
        process.stdin.on('keypress', originalHandler);

        if (s >= '1' && s <= '9') {
          const idx = parseInt(s) - 1;
          if (idx < results.length) {
            const trackIdx = library.tracks.indexOf(results[idx]);
            if (trackIdx !== -1) {
              library.jumpToTrack(trackIdx);
              player.play(results[idx]);
            }
          }
        }
        render();
      };

      process.stdin.removeListener('keypress', originalHandler);
      process.stdin.on('keypress', resultHandler);
    }

    inputBuffer = '';
    return;
  }

  if (key && key.name === 'backspace') {
    inputBuffer = inputBuffer.slice(0, -1);
  } else if (str && !key.ctrl && !key.meta) {
    inputBuffer += str;
  }

  // Redraw the input line
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(chalk.hex('#60A5FA')('  > ') + inputBuffer);
}

// ═══════════════════════════════════════════════════════════════
// Add Directory Mode
// ═══════════════════════════════════════════════════════════════
function enterAddDirMode() {
  isAddDirMode = true;
  inputBuffer = '';
  render();
  const chalk = require('chalk');
  console.log(chalk.hex('#FB923C')('\n  📂 Add Music Directory:') + chalk.dim(' (type path, ENTER to add, ESC to cancel)'));
  process.stdout.write(chalk.hex('#FB923C')('  > '));
}

function handleAddDirInput(str, key) {
  const chalk = require('chalk');

  if (key && key.name === 'escape') {
    isAddDirMode = false;
    inputBuffer = '';
    render();
    return;
  }

  if (key && key.name === 'return') {
    const dirPath = inputBuffer.trim();
    isAddDirMode = false;
    inputBuffer = '';

    if (dirPath) {
      const resolvedPath = path.resolve(dirPath);
      const added = library.addDirectory(resolvedPath);
      render();
      if (added > 0) {
        ui.renderStatus(`Added ${added} track(s) from ${resolvedPath}`, 'success');
      } else {
        ui.renderStatus(`No new audio files found in ${resolvedPath}`, 'warning');
      }
    } else {
      render();
    }
    return;
  }

  if (key && key.name === 'backspace') {
    inputBuffer = inputBuffer.slice(0, -1);
  } else if (str && !key.ctrl && !key.meta) {
    inputBuffer += str;
  }

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(chalk.hex('#FB923C')('  > ') + inputBuffer);
}

// ═══════════════════════════════════════════════════════════════
// Quit / Cleanup
// ═══════════════════════════════════════════════════════════════
function quit() {
  if (refreshTimer) clearInterval(refreshTimer);
  player.destroy();

  try {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  } catch {
    // Ignore errors during cleanup
  }

  ui.renderGoodbye();
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// Start the application
// ═══════════════════════════════════════════════════════════════
init();
