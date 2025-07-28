class Tonnetz {
  constructor(containerId) {
    this.container = d3.select(containerId);
    this.width = this.container.node().getBoundingClientRect().width;
    this.height = this.container.node().getBoundingClientRect().height;
    this.nodes = [];
    this.links = [];
    this.chords = [];
    this.noteMap = new Map();
    this.init();
  }

  init() {
    this.generateGrid();
    this.findChords();
    this.initAudio();
    this.draw();
  }

  generateGrid() {
    const notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
    const rows = 10;
    const cols = 15;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const y = row * 80;
        const x = col * 45 + (row % 2 === 1 ? 22.5 : 0);
        const noteIndex = (col + row * 7) % 12;
        const noteName = notes[noteIndex];
        const id = `${col},${row}`;
        this.nodes.push({ id, x, y, note: noteName });
        this.noteMap.set(id, { id, x, y, note: noteName, links: [] });
      }
    }

    this.nodes.forEach(node => {
      const [col, row] = node.id.split(',').map(Number);
      const neighbors = [
        { c: col + 1, r: row }, // Fifth
        { c: col - 1, r: row + 1 }, // Major Third
        { c: col, r: row + 1 }, // Minor Third
      ];

      neighbors.forEach(n => {
        const neighborId = `${n.c},${n.r}`;
        if (this.noteMap.has(neighborId)) {
          const link = { source: node.id, target: neighborId };
          this.links.push(link);
          this.noteMap.get(node.id).links.push(link);
          this.noteMap.get(neighborId).links.push(link);
        }
      });
    });
  }

  findChords() {
    this.nodes.forEach(node => {
      const [col, row] = node.id.split(',').map(Number);
      // Major chord
      let majorThird = this.noteMap.get(`${col},${row + 1}`);
      let fifth = this.noteMap.get(`${col + 1},${row}`);
      if (majorThird && fifth) {
        this.chords.push({
          root: node,
          notes: [node, majorThird, fifth],
          links: [
            { source: node.id, target: majorThird.id },
            { source: majorThird.id, target: fifth.id },
            { source: fifth.id, target: node.id },
          ],
          type: 'major'
        });
      }
      // Minor chord
      let minorThird = this.noteMap.get(`${col - 1},${row + 1}`);
      if (minorThird && fifth) {
        this.chords.push({
          root: node,
          notes: [node, minorThird, fifth],
          links: [
            { source: node.id, target: minorThird.id },
            { source: minorThird.id, target: fifth.id },
            { source: fifth.id, target: node.id },
          ],
          type: 'minor'
        });
      }
    });
  }

  initAudio() {
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.audioStarted = false;
  }

  draw() {
    const svg = this.container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .call(d3.zoom().on('zoom', (event) => {
        svg.attr('transform', event.transform);
      }))
      .append('g');

    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .join('line')
      .attr('class', 'link')
      .attr('x1', d => this.noteMap.get(d.source).x)
      .attr('y1', d => this.noteMap.get(d.source).y)
      .attr('x2', d => this.noteMap.get(d.target).x)
      .attr('y2', d => this.noteMap.get(d.target).y);

    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('circle').attr('r', 15);
    node.append('text').text(d => d.note);

    const chordAreas = svg.append('g')
      .attr('class', 'chord-areas')
      .selectAll('g')
      .data(this.chords)
      .join('g')
      .on('mouseenter', (event, d) => this.highlight(d, svg))
      .on('mouseleave', () => this.clearHighlight(svg))
      .on('click', (event, d) => this.playChord(d));

    node.on('click', async (event, d) => {
        if (!this.audioStarted) {
            await Tone.start();
            this.audioStarted = true;
        }
        this.synth.triggerAttackRelease(`${d.note}4`, '8n');
    });

    chordAreas.append('path')
        .attr('d', d => {
            const p1 = d.notes[0];
            const p2 = d.notes[1];
            const p3 = d.notes[2];
            return `M${p1.x},${p1.y}L${p2.x},${p2.y}L${p3.x},${p3.y}Z`;
        })
        .style('fill', 'transparent');
  }

  highlight(chord, svg) {
    const noteIds = new Set(chord.notes.map(n => n.id));
    const linkIds = new Set(chord.links.map(l => `${l.source}-${l.target}`));

    svg.selectAll('.node')
      .filter(d => noteIds.has(d.id))
      .classed('highlight', true);

    svg.selectAll('.link')
      .filter(d => linkIds.has(`${d.source}-${d.target}`) || linkIds.has(`${d.target}-${d.source}`))
      .classed('highlight', true);
  }

  clearHighlight(svg) {
    svg.selectAll('.highlight').classed('highlight', false);
  }

  async playChord(chord) {
    if (!this.audioStarted) {
      await Tone.start();
      this.audioStarted = true;
    }
    const notes = chord.notes.map(n => `${n.note}4`);
    this.synth.triggerAttackRelease(notes, '1n');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start-button');
  startButton.addEventListener('click', async () => {
    await Tone.start();
    startButton.style.display = 'none';
    new Tonnetz('#tonnetz-container');
  }, { once: true });
});
