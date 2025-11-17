# StingOps – Shifting Game Genres Over Time

## Project Links

- Live project: https://davis-haden.github.io/stingOps-V2/
- Screencast video walkthrough: https://www.youtube.com/watch?v=pYfwi8fBWOU

## What Is Our Code vs. Libraries

**Our code**

- `index.html` – Scrollytelling layout, sections, and narrative copy; hooks up all the visualizations and interface elements.
- `css/style.css` – Custom styling for the hero, split sections, warm-up background transitions, charts, mood gauge, guessing game, scroll progress indicators, and responsive behavior.
- `js/main.js` – Entry script that:
  - Wires up the warm-up genre selector and dynamic background image.
  - Instantiates the stacked bar chart, mood gauge, line chart, bubble chart, and guessing game components.
  - Coordinates the year slider and passes data between views.
- `js/stackedBarChart.js` – Custom D3 stacked bar chart that shows the top 5 genres by year and drives the “Who dominated the market?” section.
- `js/moodGauge.js` – Custom D3 component that:
  - Aggregates mood data (comfort vs. challenge) by year.
  - Renders a semicircular gauge plus a small time-series timeline.
  - Lets users drag a handle across years to update the gauge.
- `js/lineChart.js` – Custom D3 line chart for the “Timeline of key moments” view, showing how selected metrics evolve over time.
- `js/bubbleChart.js` – Custom D3 bubble chart for streaming highlights, mapping Twitch viewership or related metrics to bubble size and position.
- `js/guessGame.js` – Custom interaction for the “Can you guess which genre peaked?” guessing game:
  - Handles clicks on year bubbles.
  - Accepts guesses and reveals the correct genre.
  - Provides feedback so users can compare their intuition with the data.
- `js/TimelineVis.js` – Custom timeline visualization wiring events to years and aligning them with the rest of the narrative.
- `js/waypoints.js` – Our scrollytelling glue code that listens to scroll events (via Waypoints) and:
  - Activates sections as they come into view.
  - Triggers animations and chart updates.
  - Controls simple progress-bar elements tied to sections.
- `assets/` – Project-specific images and background media, such as `final_background.png` and hero GIFs.
- `data/steam_top5_genres_best_selling_by_year_2013_2025.csv` – Cleaned data file used to drive multiple views (top genres, mood, etc.).

**External libraries (via CDNs)**

These are not our own code; they are common third-party libraries:

- Bootstrap 5 – Layout grid, typography, and basic components.
- jQuery – Convenience for DOM manipulation and event handling.
- Waypoints – Scroll-based triggers to know when sections enter the viewport.
- D3.js (v7) – Underlying visualization library used by our custom chart components.

## Non-Obvious Interface Features

- **Genre warm-up background swap**  
  In the “Certain genres dominate the market” warm-up section, clicking the Soulslike / Cozy Sim / Battle Royale buttons does more than change text. It also:
  - Updates the description with appeal and top-game information.
  - Smoothly transitions the section’s background image to match the selected genre using a CSS variable (`--warmup-bg-image`) plus a subtle fade-in/out effect.

- **Scrollytelling activation & progress**  
  The page uses scroll snapping plus Waypoints:
  - Each `scrolly-section` fades and scales slightly when it becomes “active,” helping readers know which scene they are on.
  - Thin progress bars beside some sections (e.g., streaming) visually show how far you have moved through that part of the story.

- **Linked year slider and charts**  
  The “Who dominated the market?” section includes a year slider:
  - Moving the slider updates the stacked bar chart to show only that year’s top 5 genres.
  - The same year selection is shared with the mood gauge and other views so the story stays synchronized.

- **Mood gauge + mini-timeline**  
  The mood gauge is a custom composite component:
  - A semicircular dial shows where the balance sits between challenge-leaning and comfort-leaning releases, based on a normalized index from the data.
  - A mini time-series chart below shows the full timeline of that index across years.
  - Users can drag a handle along the timeline or click anywhere on it to snap the gauge to a specific year; the dial, labels, and summary copy all update in sync.

- **Streaming bubble chart behavior**  
  The streaming highlights view uses a bubble chart:
  - Bubble size encodes magnitude (e.g., peak viewership or importance).
  - Position and grouping help users see how different titles cluster around years or moods.
  - The section is tied to scroll progress so the chart subtly animates into place as it becomes active.

- **Guessing game logic**  
  The “Can You Guess Which Genre Peaked in Each Year?” section:
  - Draws interactive year bubbles from the underlying data.
  - Lets users click a year to start a mini quiz, then choose a genre.
  - Checks the guess against the dataset, reveals the correct answer, and can highlight the corresponding bar in the stacked bar chart for comparison.

- **Responsive and accessibility considerations**  
  - Section layout collapses from two-column split sections to a vertical stack on smaller screens for readability.
  - Buttons, sliders, and chart containers have descriptive labels and ARIA attributes where appropriate (e.g., `aria-label`, `role="img"`, `aria-live`) to assist screen readers.
  - Motion and animation durations are chosen to be noticeable but not overwhelming; the visualization code respects `prefers-reduced-motion` where applicable.

## Running the Project Locally

No build step is required; the project is a static site:

1. Clone or download this repository.
2. Serve the folder using any static file server (for example, `python -m http.server` from the project root).
3. Open `index.html` in a modern browser (or visit `http://localhost:8000/index.html` if using a local server).

All external libraries are loaded via CDNs, so an internet connection is needed for Bootstrap, jQuery, Waypoints, and D3 to load correctly.

