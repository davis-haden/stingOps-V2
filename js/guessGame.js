class GuessGame {
  constructor({ parent, csv }) {
    this.parent = parent;
    this.csv = csv;
    this.data = [];
    this.uniqueGenres = [];
    this.stateByYear = new Map();
    this.currentYear = null;
    this.margin = { top: 40, right: 24, bottom: 48, left: 24 };
    this.dotRadius = 16;
    this.connectorGap = 2;
    this.initVis();
    this.load();
  }

  async load() {
    const rows = await d3.csv(this.csv, d => ({
      year: +d.year,
      genre: String(d.genre).trim(),
      count: +d.count || 0,
      hint: d.hint ? String(d.hint).trim() : null
    }));

    const bestByYear = d3.rollup(
      rows.filter(d => Number.isFinite(d.year)),
      entries =>
        entries.reduce(
          (best, entry) => (entry.count > best.count ? entry : best),
          entries[0]
        ),
      d => d.year
    );

    this.data = Array.from(bestByYear.values())
      .map(({ year, genre, hint }) => ({ year, genre, hint: hint || null }))
      .sort((a, b) => d3.ascending(a.year, b.year));

    this.uniqueGenres = Array.from(new Set(this.data.map(d => d.genre))).sort();
    this.stateByYear = new Map(this.data.map(d => [d.year, 'unanswered']));

    this.wrangleData();
  }

  initVis() {
    const container = d3
      .select(this.parent)
      .classed('gg-container', true);

    const width = container.node()?.clientWidth || 800;
    this.width = Math.max(360, width) - this.margin.left - this.margin.right;
    this.height = 100;

    this.svg = container
      .append('svg')
      .attr('class', 'gg-svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    this.g = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.x = d3.scalePoint().padding(0.5).range([0, this.width]);

    this.g
      .append('line')
      .attr('class', 'axis-line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height / 2)
      .attr('y2', this.height / 2);

    this.timeline = this.g.append('g').attr('class', 'timeline');

    const hintRow = container.append('div').attr('class', 'gg-hint-row');

    this.hintBar = hintRow
      .append('div')
      .attr('class', 'gg-hint')
      .style('opacity', 0.75)
      .text('');

    hintRow
      .append('button')
      .attr('class', 'gg-hint-btn')
      .attr('type', 'button')
      .text('Hint')
      .on('click', () => this.showHint());

    this.panel = container.append('div').attr('class', 'gg-panel');
  }

  wrangleData() {
    this.years = this.data.map(d => d.year);
    this.x.domain(this.years);
    this.updateVis();
  }

  updateVis() {
    const ticks = this.timeline.selectAll('.tick').data(this.data, d => d.year);

    const ticksEnter = ticks
      .enter()
      .append('g')
      .attr('class', 'tick')
      .attr('transform', d => `translate(${this.x(d.year)}, ${this.height / 2})`);

    ticksEnter
      .append('circle')
      .attr('class', 'bubble')
      .attr('r', this.dotRadius / 2)
      .on('click', (_, d) => this.askYear(d.year));

    ticksEnter
      .append('text')
      .attr('class', 'tick-year')
      .attr('text-anchor', 'middle')
      .attr('y', 38)
      .text(d => d.year);

    ticksEnter
      .append('line')
      .attr('class', 'connector')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', 0)
      .lower();

    const ticksMerge = ticksEnter.merge(ticks);

    ticksMerge
      .transition()
      .duration(300)
      .attr('transform', d => `translate(${this.x(d.year)}, ${this.height / 2})`);

    ticksMerge
      .select('.connector')
      .attr('x1', d => {
        const prev = this.getPreviousYear(d.year);
        if (prev == null) {
          return 0;
        }
        const distance = this.x(prev) - this.x(d.year);
        const offset = this.dotRadius + this.connectorGap;
        return distance > 0 ? distance - offset : distance + offset;
      })
      .attr('x2', d => {
        const prev = this.getPreviousYear(d.year);
        if (prev == null) {
          return 0;
        }
        const distance = this.x(prev) - this.x(d.year);
        const offset = this.dotRadius + this.connectorGap;
        return distance > 0 ? offset : -offset;
      })
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('opacity', d => (this.getPreviousYear(d.year) == null ? 0 : 0.6));

    ticksMerge
      .select('circle.bubble')
      .attr('data-state', d => this.stateByYear.get(d.year))
      .attr('class', d => `bubble bubble--${this.stateByYear.get(d.year)}`)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => `Year ${d.year}, ${this.stateByYear.get(d.year)}`)
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.askYear(d.year);
        }
      });

    ticks.exit().remove();

    const questionMarks = this.timeline
      .selectAll('.qmark')
      .data(
        this.data.filter(d => this.stateByYear.get(d.year) === 'unanswered'),
        d => d.year
      );

    questionMarks.exit().remove();

    questionMarks
      .enter()
      .append('text')
      .attr('class', 'qmark')
      .attr('text-anchor', 'middle')
      .attr('y', -22)
      .text('?')
      .merge(questionMarks)
      .transition()
      .duration(300)
      .attr('transform', d => `translate(${this.x(d.year)}, ${this.height / 2})`);
  }

  getPreviousYear(year) {
    const idx = this.years.indexOf(year);
    if (idx <= 0) {
      return null;
    }
    return this.years[idx - 1];
  }

  askYear(year) {
    this.currentYear = year;
    const record = this.data.find(d => d.year === year);
    if (!record) {
      return;
    }

    const correct = record.genre;
    const distractors = d3
      .shuffle(this.uniqueGenres.filter(genre => genre !== correct))
      .slice(0, 3);
    const options = d3.shuffle([correct, ...distractors]);

    const buttons = this.panel.selectAll('.gg-choice').data(options, d => d);

    buttons.exit().remove();

    buttons
      .enter()
      .append('button')
      .attr('class', 'gg-choice')
      .attr('type', 'button')
      .on('click', (_, choice) => this.check(choice))
      .merge(buttons)
      .classed('correct', false)
      .classed('wrong', false)
      .property('disabled', false)
      .text(d => d);

    this.hintBar
      .text(`Year selected: ${year}.`)
      .style('opacity', 0.85);
  }

  check(choice) {
    if (this.currentYear == null) {
      return;
    }
    const record = this.data.find(d => d.year === this.currentYear);
    if (!record) {
      return;
    }

    const correct = record.genre;
    const success = choice === correct;

    const buttons = this.panel.selectAll('.gg-choice');
    buttons.property('disabled', true);

    buttons.each(function(option) {
      const button = d3.select(this);
      button.classed('correct', option === correct);
      button.classed('wrong', option === choice && option !== correct);
    });

    this.stateByYear.set(this.currentYear, success ? 'correct' : 'wrong');
    this.updateVis();

    this.hintBar
      .text(
        success
          ? `Correct! ${this.currentYear} peaked with ${correct}.`
          : `Not quite. ${this.currentYear}'s top genre was ${correct}.`
      )
      .style('opacity', 1);
  }

  showHint() {
    if (this.currentYear == null) {
      return;
    }
    const record = this.data.find(d => d.year === this.currentYear);
    if (!record) {
      return;
    }
    const hint = record.hint || GuessGame.makeFallbackHint(record.genre);
    this.hintBar.text(`Hint for ${record.year}: ${hint}`).style('opacity', 1);
  }

  static makeFallbackHint(genre) {
    const first = genre[0]?.toUpperCase() ?? '?';
    const words = genre.split(/\s+/);
    if (words.length > 1) {
      return `Two or more words; starts with "${first}".`;
    }
    return `Starts with "${first}" and has ${genre.length} letters.`;
  }
}

window.GuessGame = GuessGame;
