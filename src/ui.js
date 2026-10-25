/**
 * ui.js - Terminal UI Renderer
 * 
 * Renders the beautiful terminal interface with progress bars,
 * track info, volume indicators, and ASCII art visualizations.
 */

const chalk = require('chalk');
const Table = require('cli-table3');

// ═══════════════════════════════════════════════════════════════
// Color Palette
// ═══════════════════════════════════════════════════════════════
const colors = {
  primary: chalk.hex('#00D4AA'),       // Teal/Cyan
  secondary: chalk.hex('#FF6B9D'),     // Pink
  accent: chalk.hex('#C084FC'),        // Purple
  warning: chalk.hex('#FBBF24'),       // Yellow/Gold
  dim: chalk.hex('#6B7280'),           // Gray
  bright: chalk.hex('#F9FAFB'),        // White
  success: chalk.hex('#34D399'),       // Green
  error: chalk.hex('#F87171'),         // Red
  blue: chalk.hex('#60A5FA'),          // Blue
  orange: chalk.hex('#FB923C'),        // Orange
  gradient1: chalk.hex('#06B6D4'),     // Cyan
  gradient2: chalk.hex('#8B5CF6'),     // Violet
  gradient3: chalk.hex('#EC4899'),     // Pink
};

// ═══════════════════════════════════════════════════════════════
// Box Drawing Characters
// ═══════════════════════════════════════════════════════════════
const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  teeRight: '├',
  teeLeft: '┤',
};

class TerminalUI {
  constructor() {
    this.width = Math.min(process.stdout.columns || 80, 90);
    this.animFrame = 0;
    this.visualizerBars = 20;
  }

  /**
   * Clear the terminal screen.
   */
  clear() {
    process.stdout.write('\x1B[2J\x1B[0f');
  }

  /**
   * Draw a horizontal line.
   */
  horizontalLine(char = '─') {
    return colors.dim(char.repeat(this.width));
  }

  /**
   * Draw a box with a title.
   */
  drawBox(title, content, color = colors.primary) {
    const innerWidth = this.width - 4;
    const lines = [];

    // Top border
    const titleStr = title ? ` ${title} ` : '';
    const topPad = innerWidth - titleStr.length;
    const leftPad = Math.floor(topPad / 2);
    const rightPad = topPad - leftPad;

    lines.push(
      color(box.topLeft) +
      color(box.horizontal.repeat(leftPad)) +
      colors.bright(titleStr) +
      color(box.horizontal.repeat(rightPad)) +
      color(box.topRight)
    );

    // Content lines
    const contentLines = content.split('\n');
    for (const line of contentLines) {
      const stripped = this._stripAnsi(line);
      const padding = Math.max(0, innerWidth - stripped.length);
      lines.push(
        color(box.vertical) + ' ' + line + ' '.repeat(padding) + ' ' + color(box.vertical)
      );
    }

    // Bottom border
    lines.push(
      color(box.bottomLeft) +
      color(box.horizontal.repeat(innerWidth + 2)) +
      color(box.bottomRight)
    );

    return lines.join('\n');
  }

  /**
   * Strip ANSI escape codes from a string.
   */
  _stripAnsi(str) {
    return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  /**
   * Render the application header/banner.
   */
  renderHeader() {
    const banner = [
      '  ♪  ╔══════════════════════════════════════════╗  ♪  ',
      '     ║    🎵  S O N G  T E R M I N A L  🎵     ║     ',
      '     ║      ── Terminal Music Player ──         ║     ',
      '  ♪  ╚══════════════════════════════════════════╝  ♪  ',
    ];

    const gradientColors = [colors.gradient1, colors.gradient2, colors.gradient3, colors.gradient1];

    console.log('');
    banner.forEach((line, i) => {
      console.log(gradientColors[i % gradientColors.length](line));
    });
    console.log('');
  }

  /**
   * Render the now-playing display.
   */
  renderNowPlaying(track, playerState, elapsed, duration, volume, progress) {
    if (!track) {
      const content = colors.dim('  No track loaded. Select a song to play!');
      console.log(this.drawBox('🎵 Now Playing', content, colors.dim));
      return;
    }

    const stateIcon = playerState === 'playing' ? '▶' : playerState === 'paused' ? '⏸' : '⏹';
    const stateColor = playerState === 'playing' ? colors.success : playerState === 'paused' ? colors.warning : colors.dim;

    const lines = [];

    // Track title
    lines.push('');
    lines.push(`  ${colors.bright('♫')}  ${colors.bright(track.title)}`);
    lines.push(`     ${colors.dim(track.artist)} ${colors.dim('•')} ${colors.dim(track.album)}`);
    lines.push('');

    // Progress bar
    const barWidth = this.width - 22;
    const filled = Math.floor((progress / 100) * barWidth);
    const empty = barWidth - filled;
    const progressBar =
      colors.primary('  ') +
      colors.primary('━'.repeat(Math.max(0, filled))) +
      colors.secondary('●') +
      colors.dim('━'.repeat(Math.max(0, empty - 1)));

    lines.push(progressBar);
    lines.push(`  ${colors.dim(elapsed)}${' '.repeat(Math.max(0, barWidth - 4))}${colors.dim(duration)}`);
    lines.push('');

    // State and volume
    const volBar = this._renderVolumeBar(volume);
    lines.push(`  ${stateColor(stateIcon)} ${stateColor(playerState.toUpperCase())}     ${volBar}`);
    lines.push('');

    // Audio visualizer (animated)
    if (playerState === 'playing') {
      lines.push(this._renderVisualizer());
    }

    console.log(this.drawBox('🎵 Now Playing', lines.join('\n'), colors.primary));
  }

  /**
   * Render a volume bar.
   */
  _renderVolumeBar(volume) {
    const barLen = 15;
    const filled = Math.round((volume / 100) * barLen);
    const empty = barLen - filled;

    let icon = '🔊';
    if (volume === 0) icon = '🔇';
    else if (volume < 30) icon = '🔈';
    else if (volume < 70) icon = '🔉';

    return `${icon} ${colors.primary('█'.repeat(filled))}${colors.dim('░'.repeat(empty))} ${colors.dim(volume + '%')}`;
  }

  /**
   * Render an animated audio visualizer.
   */
  _renderVisualizer() {
    this.animFrame++;
    const bars = [];
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

    for (let i = 0; i < this.visualizerBars; i++) {
      const wave = Math.sin((this.animFrame * 0.3) + (i * 0.5));
      const noise = Math.random() * 0.4;
      const height = Math.floor(((wave + 1) / 2 + noise) * (chars.length - 1));
      const idx = Math.min(chars.length - 1, Math.max(0, height));

      const barColors = [colors.gradient1, colors.primary, colors.gradient2, colors.accent, colors.gradient3];
      const barColor = barColors[i % barColors.length];
      bars.push(barColor(chars[idx]));
    }

    return `  ${bars.join(' ')}`;
  }

  /**
   * Render the track list / library view.
   */
  renderTrackList(tracks, currentIndex, page = 0, pageSize = 10) {
    if (tracks.length === 0) {
      console.log(this.drawBox('📂 Library', colors.dim('  No songs found. Add .mp3/.wav files to the music/ folder.'), colors.accent));
      return;
    }

    const totalPages = Math.ceil(tracks.length / pageSize);
    const startIdx = page * pageSize;
    const endIdx = Math.min(startIdx + pageSize, tracks.length);
    const pageTracks = tracks.slice(startIdx, endIdx);

    const lines = [];
    lines.push('');

    pageTracks.forEach((track, i) => {
      const globalIdx = startIdx + i;
      const isPlaying = globalIdx === currentIndex;
      const num = String(globalIdx + 1).padStart(2, ' ');

      const durMins = Math.floor(track.duration / 60);
      const durSecs = Math.floor(track.duration % 60);
      const durStr = `${durMins}:${String(durSecs).padStart(2, '0')}`;

      if (isPlaying) {
        lines.push(
          `  ${colors.primary('▸')} ${colors.primary(num)}. ${colors.bright(track.title.padEnd(35).slice(0, 35))} ` +
          `${colors.dim(durStr.padStart(6))} ${colors.dim(track.format.padStart(5))} ${colors.dim(track.fileSize.padStart(8))}`
        );
      } else {
        lines.push(
          `    ${colors.dim(num)}. ${track.title.padEnd(35).slice(0, 35)} ` +
          `${colors.dim(durStr.padStart(6))} ${colors.dim(track.format.padStart(5))} ${colors.dim(track.fileSize.padStart(8))}`
        );
      }
    });

    lines.push('');
    lines.push(colors.dim(`  Page ${page + 1}/${totalPages}  •  ${tracks.length} tracks total`));
    lines.push('');

    console.log(this.drawBox('📂 Library', lines.join('\n'), colors.accent));
  }

  /**
   * Render playback controls help.
   */
  renderControls(shuffleEnabled, repeatMode) {
    const shuffleStr = shuffleEnabled
      ? colors.success('🔀 ON')
      : colors.dim('🔀 OFF');

    const repeatStr = repeatMode === 'one'
      ? colors.success('🔂 ONE')
      : repeatMode === 'all'
        ? colors.success('🔁 ALL')
        : colors.dim('🔁 OFF');

    const controls = [
      '',
      `  ${colors.bright('[SPACE]')} Play/Pause   ${colors.bright('[S]')} Stop      ${colors.bright('[N]')} Next     ${colors.bright('[P]')} Previous`,
      `  ${colors.bright('[+/-]')}   Volume       ${colors.bright('[R]')} Repeat    ${colors.bright('[H]')} Shuffle  ${colors.bright('[L]')} List`,
      `  ${colors.bright('[1-9]')}   Quick Play   ${colors.bright('[A]')} Add Dir   ${colors.bright('[F]')} Search   ${colors.bright('[Q]')} Quit`,
      '',
      `  ${shuffleStr}    ${repeatStr}`,
      '',
    ];

    console.log(this.drawBox('🎹 Controls', controls.join('\n'), colors.secondary));
  }

  /**
   * Render a status message.
   */
  renderStatus(message, type = 'info') {
    const icons = {
      info: colors.blue('ℹ'),
      success: colors.success('✓'),
      warning: colors.warning('⚠'),
      error: colors.error('✗'),
    };
    const icon = icons[type] || icons.info;
    console.log(`  ${icon}  ${message}`);
  }

  /**
   * Render the search results.
   */
  renderSearchResults(results, query) {
    if (results.length === 0) {
      console.log(this.drawBox('🔍 Search Results', colors.dim(`  No results found for "${query}"`), colors.blue));
      return;
    }

    const lines = ['', colors.dim(`  Results for "${query}":  (${results.length} found)`), ''];

    results.forEach((track, i) => {
      const num = String(i + 1).padStart(2, ' ');
      const durMins = Math.floor(track.duration / 60);
      const durSecs = Math.floor(track.duration % 60);
      const durStr = `${durMins}:${String(durSecs).padStart(2, '0')}`;

      lines.push(
        `    ${colors.dim(num)}. ${colors.bright(track.title.padEnd(35).slice(0, 35))} ${colors.dim(durStr.padStart(6))}`
      );
    });

    lines.push('');
    console.log(this.drawBox('🔍 Search Results', lines.join('\n'), colors.blue));
  }

  /**
   * Render the full player view (combines header, now playing, library, and controls).
   */
  renderFullView(track, playerState, elapsed, duration, volume, progress, tracks, currentIndex, page, shuffleEnabled, repeatMode) {
    this.clear();
    this.renderHeader();
    this.renderNowPlaying(track, playerState, elapsed, duration, volume, progress);
    console.log('');
    this.renderTrackList(tracks, currentIndex, page);
    console.log('');
    this.renderControls(shuffleEnabled, repeatMode);
  }

  /**
   * Render a goodbye screen.
   */
  renderGoodbye() {
    this.clear();
    console.log('');
    console.log(colors.gradient2('  ╭──────────────────────────────────────╮'));
    console.log(colors.gradient2('  │                                      │'));
    console.log(colors.gradient2('  │') + colors.bright('    🎵 Thanks for using Song Terminal!') + colors.gradient2(' │'));
    console.log(colors.gradient2('  │') + colors.dim('         See you next time ♪           ') + colors.gradient2('│'));
    console.log(colors.gradient2('  │                                      │'));
    console.log(colors.gradient2('  ╰──────────────────────────────────────╯'));
    console.log('');
  }
}

module.exports = TerminalUI;
