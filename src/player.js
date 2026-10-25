/**
 * player.js - Core Audio Player Engine
 * 
 * Handles audio playback using system-level audio players (afplay on macOS,
 * ffplay as fallback). Manages play/pause/stop/resume and track state.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.process = null;        // The child process running the audio player
    this.currentTrack = null;   // Currently loaded track metadata
    this.state = 'stopped';     // 'playing' | 'paused' | 'stopped'
    this.startTime = null;      // Timestamp when playback started
    this.elapsed = 0;           // Elapsed time in seconds
    this.timer = null;          // Interval timer for tracking elapsed time
    this.volume = 50;           // Volume level (0-100)
    this.playerCommand = this._detectPlayer();
  }

  /**
   * Detect the available audio player command on the system.
   * Prefers afplay (macOS) then ffplay, then aplay (Linux).
   */
  _detectPlayer() {
    const players = ['afplay', 'ffplay', 'aplay', 'paplay'];
    for (const player of players) {
      try {
        execSync(`which ${player}`, { stdio: 'ignore' });
        return player;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Build the command arguments based on the detected player.
   */
  _buildArgs(filePath) {
    const vol = this.volume / 100;
    switch (this.playerCommand) {
      case 'afplay':
        return [filePath, '-v', String(vol)];
      case 'ffplay':
        return ['-nodisp', '-autoexit', '-volume', String(this.volume), filePath];
      case 'aplay':
        return [filePath];
      default:
        return [filePath];
    }
  }

  /**
   * Play a track. Stops any currently playing track first.
   * @param {object} track - Track object with at least { filePath, title, duration }
   */
  play(track) {
    if (!this.playerCommand) {
      this.emit('error', 'No audio player found. Install afplay, ffplay, or aplay.');
      return false;
    }

    // Stop any currently playing track
    this.stop();

    this.currentTrack = track;
    const args = this._buildArgs(track.filePath);

    try {
      this.process = spawn(this.playerCommand, args, {
        stdio: 'ignore',
        detached: false,
      });

      // Capture reference to THIS process so stale close events
      // from previously killed processes don't trigger trackEnd
      const currentProcess = this.process;

      this.state = 'playing';
      this.startTime = Date.now();
      this.elapsed = 0;

      // Start the elapsed time tracker
      this._startTimer();

      currentProcess.on('close', (code) => {
        // Only handle if this is still the active process
        if (currentProcess !== this.process) return;
        if (this.state === 'playing') {
          this._stopTimer();
          this.state = 'stopped';
          this.emit('trackEnd', this.currentTrack);
        }
      });

      currentProcess.on('error', (err) => {
        if (currentProcess !== this.process) return;
        this.emit('error', `Playback error: ${err.message}`);
        this.state = 'stopped';
        this._stopTimer();
      });

      this.emit('play', track);
      return true;
    } catch (err) {
      this.emit('error', `Failed to start playback: ${err.message}`);
      return false;
    }
  }

  /**
   * Stop the currently playing track.
   */
  stop() {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        // Process may have already exited
      }
      this.process = null;
    }
    this._stopTimer();
    this.state = 'stopped';
    this.elapsed = 0;
    this.emit('stop');
  }

  /**
   * Pause playback (stop the process but remember position).
   * Note: afplay doesn't support true pause, so we kill and remember elapsed.
   */
  pause() {
    if (this.state !== 'playing' || !this.process) return;

    try {
      if (this.playerCommand === 'afplay') {
        // afplay supports SIGSTOP for pausing
        this.process.kill('SIGSTOP');
      } else {
        this.process.kill('SIGSTOP');
      }
    } catch {
      // Fallback: kill and remember position
    }

    this._stopTimer();
    this.state = 'paused';
    this.emit('pause');
  }

  /**
   * Resume playback after pause.
   */
  resume() {
    if (this.state !== 'paused' || !this.process) return;

    try {
      this.process.kill('SIGCONT');
    } catch {
      // If resume fails, try replaying
      this.play(this.currentTrack);
      return;
    }

    this.state = 'playing';
    this._startTimer();
    this.emit('resume');
  }

  /**
   * Set volume (0-100).
   */
  setVolume(level) {
    this.volume = Math.max(0, Math.min(100, level));
    // Volume changes take effect on next track (most CLI players don't support live volume)
    this.emit('volumeChange', this.volume);
  }

  /**
   * Get the current playback progress as a percentage.
   */
  getProgress() {
    if (!this.currentTrack || !this.currentTrack.duration) return 0;
    return Math.min(100, (this.elapsed / this.currentTrack.duration) * 100);
  }

  /**
   * Get formatted elapsed time string (MM:SS).
   */
  getElapsedFormatted() {
    const mins = Math.floor(this.elapsed / 60);
    const secs = Math.floor(this.elapsed % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Get formatted duration string (MM:SS).
   */
  getDurationFormatted() {
    if (!this.currentTrack || !this.currentTrack.duration) return '00:00';
    const mins = Math.floor(this.currentTrack.duration / 60);
    const secs = Math.floor(this.currentTrack.duration % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /** Start the elapsed time tracking interval */
  _startTimer() {
    this._stopTimer();
    this.timer = setInterval(() => {
      this.elapsed += 0.5;
      this.emit('tick', this.elapsed);
    }, 500);
  }

  /** Stop the elapsed time tracking interval */
  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Clean up resources */
  destroy() {
    this.stop();
    this.removeAllListeners();
  }
}

module.exports = AudioPlayer;
