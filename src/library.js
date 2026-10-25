/**
 * library.js - Music Library Manager
 * 
 * Scans directories for audio files, extracts metadata (duration, format),
 * and manages the playlist/library state.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Supported audio formats
const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];

class MusicLibrary {
  constructor(musicDir) {
    this.musicDir = musicDir;
    this.tracks = [];
    this.playlists = {};
    this.currentPlaylist = 'All Songs';
    this.currentIndex = 0;
    this.shuffle = false;
    this.repeat = 'none'; // 'none' | 'one' | 'all'
    this.shuffleOrder = [];
  }

  /**
   * Scan the music directory for audio files and build the library.
   */
  scan() {
    this.tracks = [];

    if (!fs.existsSync(this.musicDir)) {
      fs.mkdirSync(this.musicDir, { recursive: true });
      return this.tracks;
    }

    const files = this._scanDirectory(this.musicDir);

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (SUPPORTED_FORMATS.includes(ext)) {
        const track = this._buildTrackInfo(filePath);
        if (track) {
          this.tracks.push(track);
        }
      }
    }

    // Sort by filename
    this.tracks.sort((a, b) => a.title.localeCompare(b.title));

    // Initialize shuffle order
    this._generateShuffleOrder();

    // Set up default playlist
    this.playlists['All Songs'] = this.tracks.map((_, i) => i);

    return this.tracks;
  }

  /**
   * Recursively scan a directory for files.
   */
  _scanDirectory(dir) {
    let results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(this._scanDirectory(fullPath));
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
    return results;
  }

  /**
   * Build track info object from a file path.
   */
  _buildTrackInfo(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const title = path.basename(filePath, ext)
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let duration = 0;

    // Try to get duration using ffprobe
    try {
      const result = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: 'utf8', timeout: 5000 }
      ).trim();
      duration = parseFloat(result) || 0;
    } catch {
      // If ffprobe is not available, estimate from file size for wav
      try {
        const stat = fs.statSync(filePath);
        if (ext === '.wav') {
          // Rough estimate: 44100 Hz * 2 bytes * 2 channels = 176400 bytes/sec
          duration = stat.size / 176400;
        }
      } catch {
        duration = 0;
      }
    }

    return {
      id: this.tracks.length,
      filePath,
      fileName,
      title: this._titleCase(title),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      format: ext.replace('.', '').toUpperCase(),
      duration,
      fileSize: this._getFileSize(filePath),
    };
  }

  /**
   * Convert a string to Title Case.
   */
  _titleCase(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Get the formatted file size.
   */
  _getFileSize(filePath) {
    try {
      const stat = fs.statSync(filePath);
      const bytes = stat.size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return '0 B';
    }
  }

  /**
   * Get the current track.
   */
  getCurrentTrack() {
    if (this.tracks.length === 0) return null;
    const idx = this.shuffle
      ? this.shuffleOrder[this.currentIndex]
      : this.currentIndex;
    return this.tracks[idx] || null;
  }

  /**
   * Get the next track based on repeat/shuffle settings.
   */
  getNextTrack() {
    if (this.tracks.length === 0) return null;

    if (this.repeat === 'one') {
      return this.getCurrentTrack();
    }

    this.currentIndex++;

    if (this.currentIndex >= this.tracks.length) {
      if (this.repeat === 'all') {
        this.currentIndex = 0;
        if (this.shuffle) this._generateShuffleOrder();
      } else {
        this.currentIndex = this.tracks.length - 1;
        return null; // End of playlist
      }
    }

    return this.getCurrentTrack();
  }

  /**
   * Get the previous track.
   */
  getPreviousTrack() {
    if (this.tracks.length === 0) return null;

    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.repeat === 'all' ? this.tracks.length - 1 : 0;
    }

    return this.getCurrentTrack();
  }

  /**
   * Jump to a specific track by index.
   */
  jumpToTrack(index) {
    if (index >= 0 && index < this.tracks.length) {
      if (this.shuffle) {
        // Find the position in shuffle order that corresponds to this track
        const pos = this.shuffleOrder.indexOf(index);
        if (pos !== -1) {
          this.currentIndex = pos;
        } else {
          this.currentIndex = 0;
        }
      } else {
        this.currentIndex = index;
      }
      return this.getCurrentTrack();
    }
    return null;
  }

  /**
   * Toggle shuffle mode.
   */
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle) {
      this._generateShuffleOrder();
    }
    return this.shuffle;
  }

  /**
   * Cycle repeat mode: none -> all -> one -> none
   */
  cycleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentIdx = modes.indexOf(this.repeat);
    this.repeat = modes[(currentIdx + 1) % modes.length];
    return this.repeat;
  }

  /**
   * Generate a random shuffle order.
   */
  _generateShuffleOrder() {
    this.shuffleOrder = Array.from({ length: this.tracks.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
  }

  /**
   * Add a directory to scan for music.
   */
  addDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = this._scanDirectory(dirPath);
      let added = 0;
      for (const filePath of files) {
        const ext = path.extname(filePath).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          const existing = this.tracks.find(t => t.filePath === filePath);
          if (!existing) {
            const track = this._buildTrackInfo(filePath);
            if (track) {
              track.id = this.tracks.length;
              this.tracks.push(track);
              added++;
            }
          }
        }
      }
      this._generateShuffleOrder();
      this.playlists['All Songs'] = this.tracks.map((_, i) => i);
      return added;
    }
    return 0;
  }

  /**
   * Search tracks by query.
   */
  search(query) {
    const q = query.toLowerCase();
    return this.tracks.filter(
      t => t.title.toLowerCase().includes(q) ||
           t.artist.toLowerCase().includes(q) ||
           t.fileName.toLowerCase().includes(q)
    );
  }
}

module.exports = MusicLibrary;
