class TimelineVis {
  constructor(parentElement, data = {}) {
    this.parentElement = parentElement;
    this.events = Array.isArray(data.events) ? data.events : [];
    this.series = Array.isArray(data.series) ? data.series : [];
    this.showWorldEvents = true;
    this.color = d3.scaleOrdinal(d3.schemeTableau10);
    this.handleResize = this.handleResize.bind(this);

    this.initVis();
    this.wrangleData();
    this.updateVis();

    window.addEventListener("resize", this.handleResize);
  }

  initVis() {
    this.container = d3.select(this.parentElement);
    const node = this.container.node();
    const containerWidth =
      (node && node.getBoundingClientRect().width) || 900;

    this.container.select("svg").remove();
    this.container.selectAll(".timeline-tooltip").remove();
    this.container.selectAll(".timeline-legend").remove();
    this.container.style("position", "relative");

    this.margin = { top: 48, right: 56, bottom: 88, left: 64 };
    this.outerWidth = Math.min(containerWidth, 1100);
    this.chartHeight = Math.max(260, (window.innerHeight || 800) * 0.34);
    this.width = this.outerWidth - this.margin.left - this.margin.right;
    this.height = this.chartHeight - this.margin.top - this.margin.bottom;

    this.svgRoot = this.container
      .append("svg")
      .attr("class", "timeline-svg")
      .attr("viewBox", `0 0 ${this.outerWidth} ${this.chartHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%");

    this.svg = this.svgRoot
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.x = d3.scaleLinear().range([0, this.width]);
    this.y = d3.scaleLinear().range([this.height, 0]);

    this.xAxis = d3.axisBottom(this.x).tickFormat(d3.format("d"));
    this.yAxis = d3.axisLeft(this.y).ticks(5).tickFormat(d3.format(",d"));

    this.xAxisGroup = this.svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${this.height})`);
    this.yAxisGroup = this.svg.append("g").attr("class", "y-axis");
    this.yAxisLabel = this.svg
      .append("text")
      .attr("class", "timeline-y-axis-label")
      .attr("text-anchor", "middle");

    this.linesGroup = this.svg.append("g").attr("class", "timeline-lines");
    this.eventsGroup = this.svg.append("g").attr("class", "timeline-events");
    this.tooltipGroup = this.eventsGroup
      .append("g")
      .attr("class", "timeline-tooltips");

    this.tooltipDiv = this.container
      .append("div")
      .attr("class", "timeline-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0);

    this.legendDiv = this.container.append("div").attr("class", "timeline-legend");
    this.legendCaption = this.legendDiv
      .append("div")
      .attr("class", "timeline-legend-caption")
      .text("Top genres");
    this.legendItemsContainer = this.legendDiv
      .append("div")
      .attr("class", "timeline-legend-items");
    this.legendEventsKey = this.legendDiv
      .append("button")
      .attr("type", "button")
      .attr("class", "timeline-legend-item timeline-legend-item--events")
      .attr("aria-pressed", "true");
    this.legendEventsKey
      .append("span")
      .attr("class", "timeline-legend-swatch");
    this.legendEventsKey
      .append("span")
      .attr("class", "timeline-legend-label")
      .text("World events");
    this.legendEventsKey
      .on("click", (event) => {
        event.preventDefault();
        this.toggleWorldEvents();
      })
      .on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.toggleWorldEvents();
        }
      });
  }

  wrangleData() {
    const seriesKeys = this.series.map((serie) => serie.key);
    const previousActive =
      this.activeKeys instanceof Set ? new Set(this.activeKeys) : null;

    if (previousActive && previousActive.size) {
      this.activeKeys = new Set(
        seriesKeys.filter((key) => previousActive.has(key))
      );
      if (!this.activeKeys.size) {
        seriesKeys.forEach((key) => this.activeKeys.add(key));
      }
    } else {
      this.activeKeys = new Set(seriesKeys);
    }

    this.seriesProcessed = this.series.map((serie) => ({
      key: serie.key,
      values: (serie.values || []).map((point) => ({
        year: Number(point.year),
        value: Number(point.value)
      }))
        .sort((a, b) => a.year - b.year)
    }));

    this.visibleSeries = this.seriesProcessed.filter((serie) =>
      this.activeKeys.has(serie.key)
    );

    const laneSpacing = 20;
    this.positionedEvents = [];
    const eventsByYear = d3.group(this.events, (event) => Number(event.year));
    eventsByYear.forEach((entries, year) => {
      entries.forEach((entry, index) => {
        this.positionedEvents.push({
          ...entry,
          year,
          yOffset: index * laneSpacing
        });
      });
    });

    const yearSet = new Set();
    this.positionedEvents.forEach((event) => yearSet.add(event.year));
    this.seriesProcessed.forEach((serie) =>
      serie.values.forEach((point) => yearSet.add(point.year))
    );

    if (yearSet.size === 0) {
      yearSet.add(0);
      yearSet.add(1);
    } else if (yearSet.size === 1) {
      const onlyYear = [...yearSet][0];
      yearSet.add(onlyYear - 1);
      yearSet.add(onlyYear + 1);
    }

    this.axisYears = Array.from(yearSet).sort((a, b) => a - b);

    const maxValue = d3.max(this.seriesProcessed, (serie) =>
      d3.max(serie.values, (point) => point.value)
    );
    this.yDomain = [0, Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1];
  }

  updateVis() {
    this.x.domain([
      this.axisYears[0],
      this.axisYears[this.axisYears.length - 1]
    ]);
    this.xAxis.tickValues(this.axisYears).tickSize(8);
    this.xAxisGroup.call(this.xAxis);
    this.xAxisGroup
      .selectAll("text")
      .attr("fill", "#0b1f3a")
      .attr("transform", "translate(-6, 10) rotate(-45)")
      .style("text-anchor", "end");
    this.xAxisGroup
      .selectAll(".tick line")
      .attr("stroke", "#0b1f3a");
    this.xAxisGroup.selectAll(".domain").attr("stroke", "#0b1f3a");

    this.y.domain(this.yDomain).nice();
    this.yAxisGroup.call(this.yAxis);
    this.yAxisGroup
      .selectAll("text")
      .attr("fill", "#0b1f3a");
    this.yAxisGroup
      .selectAll(".domain, .tick line")
      .attr("stroke", "#0b1f3a");
    this.yAxisLabel
      .attr("x", 30)
      .attr("y", -18)
      .text("Total Titles Per Year");

    this.color.domain(this.seriesProcessed.map((serie) => serie.key));
    const lineGenerator = d3
      .line()
      .defined((d) => Number.isFinite(d.value))
      .x((d) => this.x(d.year))
      .y((d) => this.y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    this.linesGroup
      .selectAll(".timeline-genre-line")
      .data(this.visibleSeries, (serie) => serie.key)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "timeline-genre-line")
            .attr("fill", "none")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 2.4),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("stroke", (serie) => this.color(serie.key))
      .attr("opacity", 0.95)
      .attr("d", (serie) => lineGenerator(serie.values));

    const baseY = this.height;
    this.tooltipGroup.selectAll("*").remove();

    const eventCircles = this.eventsGroup
      .selectAll(".event-circle")
      .data(this.positionedEvents, (d) => `${d.year}-${d.title}`)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "event-circle")
            .attr("fill", "#0b1f3a")
            .attr("r", 7.5),
        (update) => update,
        (exit) => exit.remove()
      );

    eventCircles
      .attr("cx", (d) => this.x(d.year))
      .attr("cy", (d) => baseY - (d.yOffset || 0))
      .attr("aria-hidden", !this.showWorldEvents)
      .style("display", this.showWorldEvents ? null : "none")
      .style("pointer-events", this.showWorldEvents ? null : "none")
      .on("mouseover", (event, d) => {
        if (!this.showWorldEvents) {
          return;
        }
        d3.select(event.currentTarget).attr("fill", "#163a6b").attr("r", 9);

        const circleY = baseY - (d.yOffset || 0);
        const labelOffset = Math.min(60, Math.max(24, circleY - 16));
        const labelY = circleY - labelOffset;

        this.tooltipGroup.selectAll("*").remove();
        this.tooltipGroup
          .append("line")
          .attr("class", "event-connector")
          .attr("x1", this.x(d.year))
          .attr("x2", this.x(d.year))
          .attr("y1", circleY - 8)
          .attr("y2", labelY + 14);

        const svgRect = this.svgRoot.node().getBoundingClientRect();
        const offsetX = event.clientX - svgRect.left;
        const offsetY = event.clientY - svgRect.top;
        const tooltipY = Math.max(0, offsetY - 48);

        this.tooltipDiv
          .style("opacity", 1)
          .style("left", `${offsetX}px`)
          .style("top", `${tooltipY}px`)
          .html(
            `<div class="timeline-tooltip-year">${d.year}</div>` +
              `<div class="timeline-tooltip-title">${d.title}</div>` +
              (d.description
                ? `<div class="timeline-tooltip-description">${d.description}</div>`
                : "")
          );
      })
      .on("mouseout", (event) => {
        if (!this.showWorldEvents) {
          return;
        }
        d3.select(event.currentTarget).attr("fill", "#0b1f3a").attr("r", 7.5);
        this.tooltipGroup.selectAll("*").remove();
        this.tooltipDiv.style("opacity", 0);
      });

    if (!this.showWorldEvents) {
      this.tooltipDiv.style("opacity", 0);
    }

    const hasSeries = this.seriesProcessed.length > 0;
    const hasEvents = this.positionedEvents.length > 0;

    this.legendCaption.classed("is-hidden", !hasSeries);
    this.legendDiv.classed("is-empty", !hasSeries && !hasEvents);
    this.legendEventsKey
      .classed("is-hidden", !hasEvents)
      .classed("timeline-legend-item--inactive", !this.showWorldEvents)
      .attr("disabled", hasEvents ? null : "disabled")
      .attr("aria-pressed", this.showWorldEvents ? "true" : "false")
      .attr(
        "title",
        this.showWorldEvents ? "Hide world events" : "Show world events"
      );

    const legendButtons = this.legendItemsContainer
      .selectAll(".timeline-legend-item--series")
      .data(this.seriesProcessed, (serie) => serie.key);

    const legendEnter = legendButtons
      .enter()
      .append("button")
      .attr("type", "button")
      .attr("class", "timeline-legend-item timeline-legend-item--series")
      .attr("tabindex", 0);

    legendEnter.append("span").attr("class", "timeline-legend-swatch");
    legendEnter.append("span").attr("class", "timeline-legend-label");

    const legendMerged = legendEnter.merge(legendButtons);

    legendMerged
      .select(".timeline-legend-swatch")
      .style("background-color", (serie) => this.color(serie.key));
    legendMerged
      .select(".timeline-legend-label")
      .text((serie) => serie.key);

    legendMerged
      .classed("timeline-legend-item--inactive", (serie) => !this.activeKeys.has(serie.key))
      .attr("aria-pressed", (serie) =>
        this.activeKeys.has(serie.key) ? "true" : "false"
      )
      .attr("title", (serie) =>
        `${this.activeKeys.has(serie.key) ? "Hide" : "Show"} ${serie.key}`
      )
      .on("click", (event, serie) => {
        event.preventDefault();
        this.toggleSeries(serie.key);
      })
      .on("keydown", (event, serie) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.toggleSeries(serie.key);
        }
      });

    legendButtons.exit().remove();
  }

  toggleSeries(key) {
    if (!this.seriesProcessed.some((serie) => serie.key === key)) {
      return;
    }

    if (this.activeKeys.has(key)) {
      if (this.activeKeys.size === 1) {
        return;
      }
      this.activeKeys.delete(key);
    } else {
      this.activeKeys.add(key);
    }

    this.wrangleData();
    this.updateVis();
  }

  toggleWorldEvents() {
    this.showWorldEvents = !this.showWorldEvents;
    this.updateVis();
    this.tooltipGroup.selectAll("*").remove();
    this.tooltipDiv.style("opacity", 0);
  }

  handleResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.initVis();
      this.wrangleData();
      this.updateVis();
    }, 150);
  }
}

if (typeof window !== "undefined") {
  window.StingOpsCharts = window.StingOpsCharts || {};
  window.StingOpsCharts.TimelineVis = TimelineVis;
}
