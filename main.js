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
  constructor(selector, audio, graph, d3) {
    this.container = d3.select(selector);
    this.audio = audio;
    this.graph = graph;
    this.d3 = d3;
    this.width = 800;
    this.height = 400;
    this.activeNode = null;
    this.chords = {
        'C': ['C4', 'E4', 'G4'], 'G': ['G4', 'B4', 'D5'], 'D': ['D4', 'F#4', 'A4'], 'A': ['A4', 'C#5', 'E5'], 'E': ['E4', 'G#4', 'B4'], 'B': ['B4', 'D#5', 'F#5'],
        'Am': ['A4', 'C5', 'E5'], 'Em': ['E4', 'G4', 'B4'], 'Bm': ['B4', 'D5', 'F#5'], 'F#m': ['F#4', 'A4', 'C#5'], 'C#m': ['C#4', 'E4', 'G#4'],
        'F': ['F4', 'A4', 'C5'], 'Bb': ['Bb4', 'D5', 'F5'], 'Eb': ['Eb4', 'G4', 'Bb4'], 'Ab': ['Ab4', 'C5', 'Eb5'],
        'Cm': ['C4', 'Eb4', 'G4'], 'Gm': ['G4', 'Bb4', 'D5'], 'Dm': ['D4', 'F4', 'A4'],
    };
    this.init();
  }

  init() {
    this.svg = this.container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    this.simulation = this.d3.forceSimulation(this.graph.nodes)
      .force('link', this.d3.forceLink(this.graph.edges).id(d => d.id).distance(50))
      .force('charge', this.d3.forceManyBody().strength(-100))
      .force('center', this.d3.forceCenter(this.width / 2, this.height / 2));

    this.draw();
    this.setupEventListeners();
  }

  draw() {
    const link = this.svg.append('g')
      .selectAll('line')
      .data(this.graph.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6);

    const node = this.svg.append('g')
      .selectAll('g')
      .data(this.graph.nodes)
      .join('g')
      .call(this.drag(this.simulation));

    node.append('circle')
      .attr('r', 15)
      .attr('fill', '#dae1ee')
      .attr('stroke', '#395886');

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .text(d => d.note);

    this.simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  setupEventListeners() {
    const nodes = this.svg.selectAll('g g');
    const interactiveText = this.d3.select('#interactive-text');

    nodes.on('mouseover', (event, d) => {
        this.highlightChord(d);
        interactiveText.text(`A nota ${d.note} é a fundamental de um acorde de ${d.note} maior.`);
    });

    nodes.on('mouseout', () => {
        this.clearHighlights();
        interactiveText.text('Passe o mouse ou clique em um nó para começar.');
    });

    nodes.on('click', async (event, d) => {
        this.activeNode = d;
        await this.audio.start();
        const chord = this.chords[d.note] || this.chords[d.note + 'm'];
        if (chord) {
            this.audio.playChord(chord);
            interactiveText.html(`Você selecionou <strong>${d.note}</strong>. Agora, aplique uma transformação.`);
        }
    });

    this.d3.select('#transformation-controls').on('click', (e) => {
        const transform = e.target.dataset.transform;
        if (transform) {
            this.applyTransformation(transform);
        }
    });
  }

  highlightChord(node) {
    // Highlighting logic will be more complex with the new graph structure
    // For now, we just highlight the selected node.
    this.svg.selectAll('g g circle').attr('fill', '#dae1ee');
    this.svg.selectAll('g g').filter(d => d.id === node.id).select('circle').attr('fill', '#395886');
  }

  clearHighlights() {
    this.svg.selectAll('g g circle').attr('fill', '#dae1ee');
  }

  drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return this.d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  applyTransformation(type) {
    if (!this.activeNode) return;

    const { x, y, note: fromNote } = this.activeNode;
    let targetId;
    let transformName = '';

    switch (type) {
      case 'P':
        console.log("Parallel transformation not fully implemented in this model.");
        return;
      case 'R': // Relative
        targetId = `${x},${y+1}`;
        transformName = 'Relativo';
        break;
      case 'L': // Leittonwechsel
        targetId = `${x - 1},${y + 1}`;
        transformName = 'Leittonwechsel';
        break;
      default:
        return;
    }

    const targetNode = this.graph.noteMap.get(targetId);
    if (targetNode) {
      this.activeNode = targetNode;
      this.highlightChord(targetNode);
      const chord = this.chords[targetNode.note] || this.chords[targetNode.note + 'm'];
      if (chord) {
        this.audio.playChord(chord);
        this.d3.select('#interactive-text').html(`Transformação <strong>${transformName}</strong> de <strong>${fromNote}</strong> para <strong>${targetNode.note}</strong>.`);
      }
    }
  }
}

class TonnetzGraph {
  constructor(width, height) {
    this.nodes = [];
    this.edges = [];
    this.noteMap = new Map();
    this.generate(width, height);
  }

  generate(width, height) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y % 2 === 0) ? x * 2 : x * 2 + 1;
        const noteIndex = (p + Math.floor(y / 2) * 7) % 12;
        const noteName = notes[noteIndex];
        const id = `${x},${y}`;
        const node = { id, x, y, note: noteName };
        this.nodes.push(node);
        this.noteMap.set(id, node);
      }
    }

    this.nodes.forEach(node => {
      const { x, y } = node;
      const neighbors = [
        { x: x + 1, y: y }, // Fifth
        { x: x, y: y + 1 }, // Minor third
        { x: x - 1, y: y + 1 }, // Major third
      ];
      neighbors.forEach(n => {
        const neighborId = `${n.x},${n.y}`;
        if (this.noteMap.has(neighborId)) {
          this.edges.push({ source: node.id, target: neighborId });
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.Tone && window.d3) {
    const audio = new TonnetzAudio(window.Tone);
    const graph = new TonnetzGraph(10, 5);
    new TonnetzUI('#tonnetz-svg', audio, graph, window.d3);
  } else {
    document.getElementById("tonnetz-interactive").innerHTML = "Error: Tone.js or D3.js not loaded.";
  }
});
