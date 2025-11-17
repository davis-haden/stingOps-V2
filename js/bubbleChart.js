class BubbleChart {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = Array.isArray(data) ? data : [];
    this.margin = { top: 24, right: 24, bottom: 24, left: 24 };
    this.fallbackSize = 400;
    this.color = '#9146FF';

    this.initVis();
    this.wrangleData();
  }

  initVis() {
    this.container = d3.select(this.parentElement);

    this.svg = this.container
      .append('svg')
      .attr('class', 'bubble')
      .style('background', 'transparent');

    this.chartGroup = this.svg.append('g').attr('class', 'bubble-canvas');

    this.updateDimensions();

    this.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '5px')
      .style('font-size', '12px')
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  wrangleData() {
    this.dataset = {
      children: this.data
        .filter((d) => d.watchTime > 0)
        .map((d) => ({
          name: d.game,
          value: d.watchTime
        }))
    };

    this.updateVis();
  }

  updateVis() {
    this.updateDimensions();

    const root = d3
      .hierarchy(this.dataset)
      .sum((d) => d.value);

    const bubble = d3
      .pack()
      .size([this.innerWidth, this.innerHeight])
      .padding(1.5);
    bubble(root);

    this.chartGroup.selectAll('*').remove();

    const nodes = this.chartGroup
      .selectAll('.node')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodes
      .append('circle')
      .attr('r', (d) => d.r)
      .attr('fill', this.color)
      .attr('opacity', 0.7)
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2)
      .on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());
  }

  showTooltip(event, datum) {
    d3.select(event.currentTarget)
      .attr('opacity', 1)
      .attr('stroke-width', 3);

    this.tooltip
      .style('opacity', 1)
      .html(`<strong>${datum.data.name}</strong>`)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`);
  }

  hideTooltip() {
    d3.selectAll('.node circle')
      .attr('opacity', 0.7)
      .attr('stroke-width', 2);

    this.tooltip.style('opacity', 0);
  }

  updateDimensions() {
    if (!this.container || typeof this.container.node !== 'function') {
      return;
    }

    const node = this.container.node();
    const rect = node?.getBoundingClientRect?.();

    const outerWidth =
      rect && rect.width > 0 ? rect.width : this.fallbackSize;
    const outerHeight =
      rect && rect.height > 0 ? rect.height : this.fallbackSize;

    this.innerWidth = Math.max(
      outerWidth - this.margin.left - this.margin.right,
      1
    );
    this.innerHeight = Math.max(
      outerHeight - this.margin.top - this.margin.bottom,
      1
    );

    this.svg
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .style('width', '100%')
      .style('height', 'auto');

    this.chartGroup.attr(
      'transform',
      `translate(${this.margin.left},${this.margin.top})`
    );
  }
}

const DEFAULT_BUBBLE_CHART_INTRO = {
  title: 'Streaming Madness',
  paragraphs: [
    'The rise of streaming services such as Twitch and YouTube Gaming has transformed how we consume and interact with gaming content, especially in creating a new preference for which games are fun to watch.',
    'Some genres are more popular for watching while others remain favorites to play, reshaping awareness as players gravitate toward experiences that feel accessible to spectate. Use the next button to navigate through the years and hover over the bubbles to see which games dominated streaming platforms each year.'
  ]
};

const DEFAULT_BUBBLE_CHART_CARDS = [
  {
    id: 'chart-area-2018',
    dataPath: 'data/twitch_trends_2018.csv',
    title: '2018',
    subtitle: 'Pre-pandemic Baseline',
    description:
      "In 2018, Fortnite dominated with 81 billion minutes watched, becoming a cultural phenomenon that transcended gaming. The game's dances went viral on social media, and celebrities started streaming it. League of Legends (59B minutes) and Dota 2 maintained their esports stronghold, while PUBG proved that battle royale wasn't just a fad. This was when gaming truly broke into mainstream culture, with Twitch becoming a platform that everyone knew about, not just gamers."
  },
  {
    id: 'chart-area',
    dataPath: 'data/twitch-trending-2020-March.csv',
    title: 'March 2020',
    subtitle: 'Pandemic Surge',
    description:
      "March 2020 marked the beginning of global lockdowns, and gaming became essential for maintaining social connections. Call of Duty: Warzone provided competitive outlets for players seeking intensity, while Animal Crossing: New Horizons offered peaceful virtual spaces where friends could visit each other's islands. Just Chatting streams surged as people desperately sought human interaction through screens. Gaming transformed from entertainment into a vital social infrastructure during a time when traditional social activities were impossible."
  },
  {
    id: 'chart-area-september',
    dataPath: 'data/twich_trends_2020_September.csv',
    title: 'September 2020',
    subtitle: 'Social Gaming Boom',
    description:
      "By September 2020, Among Us had become the definitive social game of the pandemic, perfectly suited for virtual gatherings when in-person meetups weren't possible. NBA 2K21 filled the void left by cancelled sports seasons, while strategy games like Teamfight Tactics provided complex worlds to immerse in during extended isolation. Phasmophobia tapped into the collective anxiety of the time, while Genshin Impact's success reflected the growing appeal of free-to-play games as economic uncertainty made premium titles less accessible."
  },
  {
    id: 'chart-area-2022',
    dataPath: 'data/twtich_trends_2022.csv',
    title: '2022',
    subtitle: 'Transitional Phase',
    description:
      'By 2022, ELDEN RING captured the post-pandemic desire for meaningful challenge and mastery, resonating with players seeking accomplishment after years of uncertainty. Overwatch 2 marked the return of social competitive gaming as people began reconnecting. Lost Ark and VALORANT\'s popularity reflected the dominance of free-to-play models as inflation made entertainment budgets tighter. Casino games like Slots gained traction, perhaps reflecting economic stress and the gambling industry\'s aggressive digital expansion. Gaming had evolved from pandemic coping mechanism to integrated lifestyle.'
  },
  {
    id: 'chart-area-august',
    dataPath: 'data/twtich_trends_2023.csv',
    title: '2023',
    subtitle: 'New Normal',
    description:
      'By 2023, Diablo IV signaled the return of premium gaming experiences as economic recovery allowed for luxury entertainment spending. EA Sports FC 24 reflected the normalization of digital sports consumption in a post-pandemic world. Casino Jackpot\'s prominence raised concerns about the gambling industry\'s digital expansion and ongoing economic anxiety. Story-driven games offered immersive narratives for audiences seeking escape during times of social fragmentation. Gaming had fully integrated into mainstream culture, serving as both entertainment and social infrastructure.'
  }
];

class BubbleChartSection {
  constructor({
    container,
    cards = DEFAULT_BUBBLE_CHART_CARDS,
    bubbleChartClass = BubbleChart,
    intro = DEFAULT_BUBBLE_CHART_INTRO
  } = {}) {
    this.container = container || null;
    this.cards = Array.isArray(cards) && cards.length ? cards : DEFAULT_BUBBLE_CHART_CARDS;
    this.BubbleChartClass = bubbleChartClass;
    this.intro = intro;
    this.instances = new Map();
    this.navigation = null;
    this.dataByCard = {};
  }

  initialize() {
    if (!this.container) {
      return Promise.resolve(null);
    }
    if (typeof d3 === 'undefined' || typeof d3.csv !== 'function') {
      this.showMessage('Bubble chart unavailable.');
      return Promise.resolve(null);
    }
    this.showMessage('Loading streaming data…');
    return this.loadData()
      .then((datasets) => {
        if (
          !Array.isArray(datasets) ||
          datasets.every((rows) => !Array.isArray(rows) || rows.length === 0)
        ) {
          this.showMessage('No streaming data available.');
          return null;
        }
        this.createLayout();
        const instances = this.instantiateCharts(datasets);
        if (!instances) {
          this.showMessage('Bubble chart unavailable.');
          return null;
        }
        this.navigation = this.initNavigation();
        this.dataByCard = {};
        datasets.forEach((rows, index) => {
          const card = this.cards[index];
          if (card) {
            this.dataByCard[card.id] = rows;
          }
        });
        return {
          instances,
          navigation: this.navigation,
          data: this.dataByCard
        };
      })
      .catch((error) => {
        console.error('Failed to load bubble chart data.', error);
        this.showMessage('Unable to load bubble chart.');
        return null;
      });
  }

  showMessage(message) {
    if (!this.container) {
      return;
    }
    this.container.classList.add('text-muted');
    this.container.classList.add('text-center');
    this.container.textContent = message;
  }

  resetContainer() {
    if (!this.container) {
      return;
    }
    this.container.classList.remove('text-muted', 'text-center');
    this.container.parentElement?.classList.remove('text-muted', 'text-center');
    this.container.innerHTML = '';
  }

  loadData() {
    const requests = this.cards.map((card) =>
      d3
        .csv(card.dataPath, (row) => this.parseRow(row))
        .then((rows = []) => rows.filter(Boolean))
    );
    return Promise.all(requests);
  }

  parseRow(row) {
    if (!row) {
      return null;
    }
    const keys = Object.keys(row);
    const gameKey = keys.find((key) => this.normalizeKey(key) === 'game');
    const watchTimeKey = keys.find((key) =>
      this.normalizeKey(key).includes('change watch time')
    );
    if (!gameKey || !watchTimeKey) {
      return null;
    }
    const rawGame = row[gameKey];
    const game =
      typeof rawGame === 'string' ? rawGame.trim() : String(rawGame || '').trim();
    const watchTime = this.parseNumericValue(row[watchTimeKey]);
    if (!game || !Number.isFinite(watchTime) || watchTime <= 0) {
      return null;
    }
    return { game, watchTime };
  }

  parseNumericValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.+-eE]/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  normalizeKey(key) {
    return typeof key === 'string'
      ? key.replace(/\ufeff/g, '').trim().toLowerCase()
      : '';
  }

  createLayout() {
    if (!this.container) {
      return;
    }
    this.resetContainer();
    const introParagraphs = (this.intro.paragraphs || [])
      .map((paragraph, index, arr) => {
        const classes = [];
        if (index === 0) {
          classes.push('lead');
        }
        classes.push(index === arr.length - 1 ? 'mb-0' : 'mb-3');
        return `<p class="${classes.join(' ')}">${paragraph}</p>`;
      })
      .join('');

    const cardsMarkup = this.cards
      .map(
        (card) => `
        <div class="chart-card" data-bubble-card data-card-type="chart">
          <h2 class="display-5 mb-4">${card.title}</h2>
          <p class="chart-subtitle">${card.subtitle}</p>
          <p class="bubble-chart-instruction">
          Hover over bubbles to see which games dominated.
          </p>
          <div class="chart-content">
            <div id="${card.id}"></div>
            <div class="chart-description-container">
              <p class="chart-description">
                ${card.description}
              </p>
            </div>
          </div>
        </div>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="bubblechart-container" id="bubblechart-slider">
        <div class="chart-card bubblechart-intro" data-bubble-card data-card-type="intro">
          <h2 class="display-5 mb-4">${this.intro.title}</h2>
          <div class="chart-content">
            <div class="chart-description-container">
              <div class="chart-description">
                ${introParagraphs}
              </div>
            </div>
          </div>
        </div>
        ${cardsMarkup}
        <div class="navigation" id="bubblechart-navigation">
          <button id="prevBtn" type="button" class="btn btn-outline-secondary bubblechart-nav-btn">Previous</button>
          <button id="nextBtn" type="button" class="btn btn-outline-secondary bubblechart-nav-btn">Next</button>
        </div>
      </div>
    `;
  }

  instantiateCharts(datasets) {
    if (!this.container || typeof this.BubbleChartClass !== 'function') {
      return null;
    }
    this.instances.clear();
    datasets.forEach((rows, index) => {
      const card = this.cards[index];
      if (!card || !Array.isArray(rows) || rows.length === 0) {
        return;
      }
      const target = document.getElementById(card.id);
      if (!target) {
        return;
      }
      target.innerHTML = '';
      const chart = new this.BubbleChartClass(`#${card.id}`, rows);
      this.instances.set(card.id, chart);
    });
    return this.instances.size ? this.instances : null;
  }

  initNavigation() {
    if (!this.container) {
      return null;
    }
    const cards = this.container.querySelectorAll('[data-bubble-card]');
    if (!cards.length) {
      return null;
    }
    let activeIndex = 0;
    const prevBtn = this.container.querySelector('#prevBtn');
    const nextBtn = this.container.querySelector('#nextBtn');

    const updateVisibility = (index) => {
      activeIndex = Math.max(0, Math.min(cards.length - 1, index));
      cards.forEach((card, cardIndex) => {
        card.style.display = cardIndex === activeIndex ? 'block' : 'none';
      });
      if (prevBtn) {
        prevBtn.disabled = activeIndex === 0;
      }
      if (nextBtn) {
        nextBtn.disabled = activeIndex === cards.length - 1;
      }
    };

    prevBtn?.addEventListener('click', () => updateVisibility(activeIndex - 1));
    nextBtn?.addEventListener('click', () => updateVisibility(activeIndex + 1));
    updateVisibility(0);

    return {
      get index() {
        return activeIndex;
      },
      set index(value) {
        updateVisibility(value);
      },
      prevBtn,
      nextBtn
    };
  }
}

BubbleChartSection.DEFAULT_CARDS = DEFAULT_BUBBLE_CHART_CARDS;
BubbleChartSection.DEFAULT_INTRO = DEFAULT_BUBBLE_CHART_INTRO;

window.StingOpsCharts = window.StingOpsCharts || {};
window.StingOpsCharts.BubbleChartSection = BubbleChartSection;
