/**
 * Handles audio playback for the Tonnetz.
 */
class TonnetzAudio {
  constructor(Tone) {
    this.Tone = Tone;
    this.synth = null;
  }

  /**
   * Starts the audio context and initializes the synthesizer.
   */
  async start() {
    if (this.Tone.context.state !== 'running') {
      await this.Tone.start();
    }
    if (!this.synth) {
      this.synth = new this.Tone.PolySynth(this.Tone.Synth).toDestination();
    }
  }

  /**
   * Plays a chord.
   * @param {string[]} notes - The notes of the chord to play.
   * @param {string} [duration="0.7"] - The duration of the chord.
   */
  playChord(notes, duration = "0.7") {
    if (this.synth) {
      this.synth.triggerAttackRelease(notes, duration);
    }
  }
}

/**
 * Manages the user interface of the Tonnetz.
 */
class TonnetzUI {
  constructor(selector, audio) {
    this.container = document.querySelector(selector);
    this.audio = audio;
    this.svg = null;
    this.activeNote = null;
    this.notesData = [
      // Major chords
      { note: 'Ab', coords: [0, 0] }, { note: 'Eb', coords: [1, 0] }, { note: 'Bb', coords: [2, 0] }, { note: 'F', coords: [3, 0] }, { note: 'C', coords: [4, 0] }, { note: 'G', coords: [5, 0] }, { note: 'D', coords: [6, 0] }, { note: 'A', coords: [7, 0] }, { note: 'E', coords: [8, 0] }, { note: 'B', coords: [9, 0] },
      // Minor chords
      { note: 'Fm', coords: [0, 1], type: 'minor' }, { note: 'Cm', coords: [1, 1], type: 'minor' }, { note: 'Gm', coords: [2, 1], type: 'minor' }, { note: 'Dm', coords: [3, 1], type: 'minor' }, { note: 'Am', coords: [4, 1], type: 'minor' }, { note: 'Em', coords: [5, 1], type: 'minor' }, { note: 'Bm', coords: [6, 1], type: 'minor' }, { note: 'F#m', coords: [7, 1], type: 'minor' },
    ];
    this.chords = {
        'C': ['C4', 'E4', 'G4'], 'G': ['G4', 'B4', 'D5'], 'D': ['D4', 'F#4', 'A4'], 'A': ['A4', 'C#5', 'E5'], 'E': ['E4', 'G#4', 'B4'], 'B': ['B4', 'D#5', 'F#5'],
        'Am': ['A4', 'C5', 'E5'], 'Em': ['E4', 'G4', 'B4'], 'Bm': ['B4', 'D5', 'F#5'], 'F#m': ['F#4', 'A4', 'C#5'], 'C#m': ['C#4', 'E4', 'G#4'],
        'F': ['F4', 'A4', 'C5'], 'Bb': ['Bb4', 'D5', 'F5'], 'Eb': ['Eb4', 'G4', 'Bb4'], 'Ab': ['Ab4', 'C5', 'Eb5'],
        'Cm': ['C4', 'Eb4', 'G4'], 'Gm': ['G4', 'Bb4', 'D5'], 'Dm': ['D4', 'F4', 'A4'],
    };
    this.init();
  }

  init() {
    this.drawTonnetz();
    this.setupEventListeners();
  }

  drawTonnetz() {
    const svgWidth = 500, svgHeight = 300;
    let svgContent = `<svg width="${svgWidth}" height="${svgHeight}">`;
    this.notesData.forEach(({ note, coords }) => {
      let [x, y] = coords;
      let cx = 50 + x * 50;
      let cy = 50 + y * 50;
      svgContent += `<circle cx="${cx}" cy="${cy}" r="18" fill="#dae1ee" stroke="#395886" data-note="${note}" />`;
      svgContent += `<text x="${cx}" y="${cy}" dy=".3em" text-anchor="middle" fill="#1a2438" data-note="${note}">${note.replace('m', '')}</text>`;
    });
    svgContent += "</svg>";
    this.container.innerHTML = svgContent;
    this.svg = this.container.querySelector('svg');
  }

  setupEventListeners() {
    this.svg.addEventListener('mouseover', (e) => this.handleMouseOver(e));
    this.svg.addEventListener('mouseout', (e) => this.handleMouseOut(e));
    this.svg.addEventListener('click', (e) => this.handleMouseClick(e));

    document.getElementById('transformation-controls').addEventListener('click', (e) => {
      const transform = e.target.dataset.transform;
      if (transform) {
        this.applyTransformation(transform);
      }
    });
  }

  handleMouseOver(e) {
    const note = e.target.dataset.note;
    if (note && this.chords[note]) {
      this.highlightChord(note);
    }
  }

  handleMouseOut() {
    this.clearHighlights();
  }

  async handleMouseClick(e) {
    const note = e.target.dataset.note;
    if (note && this.chords[note]) {
      this.activeNote = note;
      await this.audio.start();
      this.audio.playChord(this.chords[note]);
      this.highlightChord(note);
    }
  }

  highlightChord(note) {
    this.clearHighlights();
    const chordNotes = this.getChordNotes(note);
    chordNotes.forEach(chordNote => {
      this.svg.querySelectorAll(`[data-note="${chordNote}"]`).forEach(el => {
        el.setAttribute('fill', '#395886');
        if (el.tagName === 'text') {
          el.setAttribute('fill', '#fff');
        }
      });
    });
  }

  clearHighlights() {
    this.svg.querySelectorAll('circle').forEach(circle => circle.setAttribute('fill', '#dae1ee'));
    this.svg.querySelectorAll('text').forEach(text => text.setAttribute('fill', '#1a2438'));
  }

  getChordNotes(note) {
    // This is a simplified logic. A more robust implementation would calculate the notes based on music theory.
    const root = note.replace('m', '');
    const isMinor = note.endsWith('m');
    const fifth = this.findFifth(root);
    const third = isMinor ? this.findMinorThird(root) : this.findMajorThird(root);
    return [root, third, fifth].filter(Boolean);
  }

  findFifth(note) {
    const circleOfFifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
    const index = circleOfFifths.indexOf(note);
    return index !== -1 ? circleOfFifths[(index + 1) % 12] : null;
  }

  findMajorThird(note) {
    const majorThirds = { 'C': 'E', 'G': 'B', 'D': 'F#', 'A': 'C#', 'E': 'G#', 'B': 'D#', 'F#': 'A#', 'F': 'A', 'Bb': 'D', 'Eb': 'G', 'Ab': 'C' };
    return majorThirds[note];
  }

  findMinorThird(note) {
    const minorThirds = { 'C': 'Eb', 'G': 'Bb', 'D': 'F', 'A': 'C', 'E': 'G', 'B': 'D', 'F#': 'A' };
    return minorThirds[note];
  }

  applyTransformation(type) {
    if (!this.activeNote) return;

    let nextNote;
    const isMinor = this.activeNote.endsWith('m');

    switch (type) {
      case 'P': // Parallel
        nextNote = isMinor ? this.activeNote.replace('m', '') : `${this.activeNote}m`;
        break;
      case 'R': // Relative
        nextNote = isMinor ? this.findRelativeMajor(this.activeNote) : this.findRelativeMinor(this.activeNote);
        break;
      case 'L': // Leittonwechsel
        nextNote = isMinor ? this.findLeittonwechselMajor(this.activeNote) : this.findLeittonwechselMinor(this.activeNote);
        break;
    }

    if (nextNote && this.chords[nextNote]) {
      this.activeNote = nextNote;
      this.highlightChord(this.activeNote);
      this.audio.playChord(this.chords[this.activeNote]);
    }
  }

  findRelativeMajor(minorNote) {
    const map = { 'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'Gm': 'Bb', 'Dm': 'F', 'Cm': 'Eb' };
    return map[minorNote];
  }

  findRelativeMinor(majorNote) {
    const map = { 'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m', 'F': 'Dm', 'Bb': 'Gm', 'Eb': 'Cm' };
    return map[majorNote];
  }

  findLeittonwechselMajor(minorNote) {
    const map = { 'Am': 'F', 'Em': 'C', 'Bm': 'G', 'F#m': 'D', 'C#m': 'A' };
    return map[minorNote];
  }

  findLeittonwechselMinor(majorNote) {
    const map = { 'C': 'Em', 'G': 'Bm', 'D': 'F#m', 'A': 'C#m', 'E': 'G#m' };
    return map[majorNote];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.Tone) {
    const audio = new TonnetzAudio(window.Tone);
    new TonnetzUI('#tonnetz-svg', audio);
  } else {
    const playChordButton = document.getElementById("playChord");
    if (playChordButton) {
      playChordButton.style.display = "none";
    }
  }
});
