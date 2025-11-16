document.addEventListener('DOMContentLoaded', () => {
  window.StingOps = window.StingOps || {};

  const genreDescription = document.getElementById('genre-description');
  const buttons = document.querySelectorAll('.genre-btn');
  const warmupSection = document.getElementById('genre-warmup');
  const topGenresChart = document.getElementById('top-genres-chart');
  const moodGaugeContainer = document.getElementById('mood-gauge');
  const lineChartContainer = document.getElementById('chart-area-line');
  const bubbleChartContainer = document.getElementById('streaming-bubble-chart');
  const guessGameContainer = document.getElementById('guess-game');
  const yearSlider = document.getElementById('top-genres-year-slider');
  const yearSliderValue = document.getElementById('top-genres-year-value');
  let stackedBarChartInstance = null;
  let moodGaugeInstance = null;
  let lineChartInstance = null;
  let guessGameInstance = null;

  if (genreDescription && buttons.length) {
    const genres = {
      soulslike: {
        name: 'Soulslike',
        appeal: 'Punishing combat and intricate world design reward patience and mastery.',
        topGame: 'Elden Ring',
        image: 'assets/eldenring.jpg'
      },
      'cozy-sim': {
        name: 'Cozy Sim',
        appeal: 'Low-stress loops and nurturing goals create a restorative escape.',
        topGame: 'Animal Crossing: New Horizons',
        image: 'assets/animalcrossing.jpg'
      },
      'battle-royale': {
        name: 'Battle Royale',
        appeal: 'Fast drop-ins and last-player-standing pressure keep adrenaline high.',
        topGame: 'Fortnite',
        image: 'assets/fortnite.jpg'
      }
    };

    const activateGenre = (key) => {
      const genre = genres[key];
      if (!genre) {
        return;
      }

      buttons.forEach((button) => {
        const isActive = button.dataset.genre === key;
        button.classList.toggle('btn-secondary', isActive);
        button.classList.toggle('btn-outline-secondary', !isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      genreDescription.classList.remove('text-muted');
      genreDescription.innerHTML = `
        <h4 class="h6 text-uppercase mb-2">${genre.name}</h4>
        <p class="mb-2">${genre.appeal}</p>
        <p class="mb-0"><strong>Top game:</strong> ${genre.topGame}</p>
      `;

      if (warmupSection && genre.image) {
        warmupSection.classList.remove('has-bg');
        void warmupSection.offsetWidth;
        const imageUrl = `url("${genre.image}")`;
        warmupSection.style.backgroundImage = imageUrl;
        warmupSection.style.setProperty('--warmup-bg-image', imageUrl);
        requestAnimationFrame(() => {
          warmupSection.classList.add('has-bg');
        });
      }
    };

    buttons.forEach((button) => {
      button.disabled = false;
      button.addEventListener('click', () => activateGenre(button.dataset.genre));
    });

    activateGenre(buttons[0].dataset.genre);
  }

  const instantiateStackedBarChart = () => {
    if (!topGenresChart || !window.StingOpsCharts?.StackedBarChart) {
      return null;
    }
    if (!stackedBarChartInstance) {
      topGenresChart.innerHTML = '';
      topGenresChart.classList.remove('text-muted');
      stackedBarChartInstance = new window.StingOpsCharts.StackedBarChart({
        element: topGenresChart
      });
    }
    return stackedBarChartInstance;
  };

  const instantiateMoodGauge = () => {
    if (!moodGaugeContainer || !window.StingOpsCharts?.MoodGauge) {
      return null;
    }
    if (!moodGaugeInstance) {
      moodGaugeContainer.innerHTML = '';
      moodGaugeContainer.classList.remove('text-muted');
      moodGaugeInstance = new window.StingOpsCharts.MoodGauge({
        element: moodGaugeContainer
      });
    }
    return moodGaugeInstance;
  };

  const instantiateLineChart = (rows) => {
    if (!lineChartContainer || !window.StingOpsCharts?.LineChart) {
      return null;
    }
    if (!lineChartInstance) {
      lineChartContainer.innerHTML = '';
      lineChartInstance = new window.StingOpsCharts.LineChart(
        'chart-area-line',
        Array.isArray(rows) ? rows : []
      );
      lineChartInstance.initVis();
    } else if (Array.isArray(rows)) {
      lineChartInstance.setData(rows);
    }
    return lineChartInstance;
  };

  const instantiateGuessGame = () => {
    if (!guessGameContainer || typeof window.GuessGame !== 'function') {
      return null;
    }
    if (!guessGameInstance) {
      const wrapper = guessGameContainer.closest('.reveal-card');
      wrapper?.classList.remove('text-muted', 'text-center');
      wrapper?.classList.add('is-visible');
      wrapper?.style.setProperty('pointer-events', 'auto');
      guessGameContainer.classList.remove('text-muted', 'text-center');
      guessGameContainer.style.setProperty('pointer-events', 'auto');
      guessGameContainer.innerHTML = '';
      guessGameInstance = new window.GuessGame({
        parent: guessGameContainer,
        csv: 'data/steam_top5_genres_best_selling_by_year_2013_2025.csv'
      });
      window.StingOps.guessGame = guessGameInstance;
    }
    return guessGameInstance;
  };

  const bubbleChartSection =
    bubbleChartContainer &&
    typeof window.StingOpsCharts?.BubbleChartSection === 'function' &&
    typeof BubbleChart === 'function'
      ? new window.StingOpsCharts.BubbleChartSection({
          container: bubbleChartContainer,
          bubbleChartClass: BubbleChart
        })
      : null;

  if (!bubbleChartSection && bubbleChartContainer) {
    bubbleChartContainer.textContent = 'Bubble chart unavailable.';
  }

  if (yearSlider) {
    yearSlider.disabled = true;
  }

  const updateSliderLabel = (year) => {
    if (!yearSliderValue) {
      return;
    }
    yearSliderValue.textContent = year ? `Year: ${year}` : 'Year: —';
  };

  if (topGenresChart) {
    topGenresChart.textContent = 'Loading genre data…';
  }
  if (moodGaugeContainer) {
    moodGaugeContainer.textContent = 'Loading mood data…';
  }
  if (lineChartContainer) {
    const placeholder = lineChartContainer.querySelector('.line-chart-placeholder');
    if (placeholder) {
      placeholder.textContent = 'Loading release trends…';
    }
  }
  if (guessGameContainer) {
    guessGameContainer.textContent = 'Loading guess game…';
  }

  const guessGamePromise =
    typeof d3 !== 'undefined' &&
    typeof d3.csv === 'function' &&
    guessGameContainer &&
    typeof window.GuessGame === 'function'
      ? Promise.resolve()
          .then(() => {
            const game = instantiateGuessGame();
            if (!game) {
              guessGameContainer.textContent = 'Guess game unavailable.';
              return null;
            }
            return game;
          })
          .catch((error) => {
            console.error('Failed to initialize guess game.', error);
            if (guessGameContainer) {
              guessGameContainer.textContent = 'Unable to load guess game.';
            }
            return null;
          })
      : Promise.resolve(null);

  const stackedBarChartPromise =
    typeof d3 !== 'undefined' &&
    typeof d3.csv === 'function' &&
    topGenresChart
      ? d3
          .csv(
            'data/steam_top5_genres_best_selling_by_year_2013_2025.csv',
            d3.autoType
          )
          .then((rows) => {
            const chart = instantiateStackedBarChart();
            if (!chart) {
              topGenresChart.textContent = 'Chart unavailable.';
              yearSlider?.setAttribute('disabled', 'true');
              updateSliderLabel(null);
              return null;
            }

            chart.setData(rows);
            const years = typeof chart.getYears === 'function' ? chart.getYears() : [];
            if (years.length && yearSlider) {
              const activeYear =
                typeof chart.getCurrentYear === 'function'
                  ? chart.getCurrentYear() || years[0]
                  : years[0];
              Object.assign(yearSlider, {
                min: years[0],
                max: years[years.length - 1],
                step: 1,
                value: activeYear
              });
              yearSlider.disabled = years.length === 1;
              updateSliderLabel(activeYear);
            } else if (yearSlider) {
              yearSlider.disabled = true;
              updateSliderLabel(null);
            }

            window.StingOps.stackedBarChart = chart;
            return chart;
          })
          .catch((error) => {
            console.error('Failed to load stacked bar chart data.', error);
            if (topGenresChart) {
              topGenresChart.textContent = 'Unable to load chart.';
            }
            if (yearSlider) {
              yearSlider.disabled = true;
            }
            updateSliderLabel(null);
            return null;
          })
      : Promise.resolve(null);

  const bubbleChartPromise =
    bubbleChartSection
      ? bubbleChartSection.initialize().then((result) => {
          if (!result) {
            return null;
          }
          window.StingOps.bubbleChartData = result.data;
          window.StingOps.bubbleChartInstances = result.instances;
          window.StingOps.bubbleChartNavigation = result.navigation;
          return result.instances;
        })
      : Promise.resolve(null);

  const moodGaugePromise =
    typeof d3 !== 'undefined' &&
    typeof d3.csv === 'function' &&
    moodGaugeContainer
      ? d3
          .csv(
            'data/steam_top5_genres_best_selling_by_year_2013_2025_mood.csv',
            d3.autoType
          )
          .then((rows) => {
            const gauge = instantiateMoodGauge();
            if (!gauge) {
              moodGaugeContainer.textContent = 'Mood gauge unavailable.';
              return null;
            }
            const data =
              typeof window.StingOpsCharts?.MoodGauge?.formatData === 'function'
                ? window.StingOpsCharts.MoodGauge.formatData(rows)
                : [];
            gauge.setData(data);
            if (yearSlider) {
              const selectedYear = Number(yearSlider.value);
              if (!Number.isNaN(selectedYear)) {
                gauge.setYear(selectedYear);
              }
            }
            window.StingOps.moodGauge = gauge;
            return gauge;
          })
          .catch((error) => {
            console.error('Failed to load mood gauge data.', error);
            if (moodGaugeContainer) {
              moodGaugeContainer.textContent = 'Unable to load mood gauge.';
            }
            return null;
          })
      : Promise.resolve(null);

  const lineChartPromise =
    typeof d3 !== 'undefined' &&
    typeof d3.csv === 'function' &&
    lineChartContainer
      ? d3
          .csv('data/steam_genres_mapped_2000_2024.csv')
          .then((rows) => {
            const chart = instantiateLineChart(rows);
            if (!chart) {
              if (lineChartContainer) {
                lineChartContainer.innerHTML =
                  '<p class="text-center text-muted mb-0">Line chart unavailable.</p>';
              }
              return null;
            }
            window.StingOps.lineChart = chart;
            return chart;
          })
          .catch((error) => {
            console.error('Failed to load line chart data.', error);
            if (lineChartContainer) {
              lineChartContainer.innerHTML =
                '<p class="text-center text-muted mb-0">Unable to load release trends.</p>';
            }
            return null;
          })
      : Promise.resolve(null);

  window.StingOps.bubbleChartSection = bubbleChartSection;
  window.StingOps.bubbleChartData = null;
  window.StingOps.bubbleChartInstances = null;
  window.StingOps.bubbleChartNavigation = null;
  window.StingOps.bubbleChartPromise = bubbleChartPromise;
  window.StingOps.stackedBarChartPromise = stackedBarChartPromise;
  window.StingOps.moodGaugePromise = moodGaugePromise;
  window.StingOps.lineChartPromise = lineChartPromise;
  window.StingOps.guessGamePromise = guessGamePromise;

  if (yearSlider) {
    yearSlider.addEventListener('input', (event) => {
      const target = event.target;
      const selectedYear = target.value;
      updateSliderLabel(selectedYear);
      if (stackedBarChartInstance) {
        stackedBarChartInstance.setYear(selectedYear);
      }
      if (moodGaugeInstance) {
        moodGaugeInstance.setYear(selectedYear);
      }
    });
  }
});
