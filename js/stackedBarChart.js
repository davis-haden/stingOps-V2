class StackedBarChart {
  constructor({
    element,
    margin = { top: 48, right: 32, bottom: 48, left: 48 },
    colorScheme = d3.schemeTableau10,
    width = null,
    height = null,
  } = {}) {
    this.parentElement = d3.select(element);
    this.margin = margin;
    this.configWidth = width;
    this.configHeight = height;

    this.svg = this.parentElement
      .append("svg")
      .classed("stacked-bar-chart", true);
    this.canvas = this.svg.append("g").attr("class", "stacked-bar-canvas");

    this.totalLabel = this.canvas.append("text").attr("class", "chart-total");
    this.barContainer = this.canvas.append("g").attr("class", "stacked-bar");
    this.barSegments = this.barContainer.append("g").attr("class", "segments");
    this.barLabels = this.barContainer
      .append("g")
      .attr("class", "segment-labels");
    this.legendGroup = this.canvas
      .append("g")
      .attr("class", "stacked-bar-legend");

    this.color = d3.scaleOrdinal(colorScheme);
    this.x = d3.scaleLinear();
    this.y = d3.scaleBand().padding(0.4);

    this.years = [];
    this.dataByYear = new Map();
    this.activeYear = null;

    this.totalsFormatter = d3.format(",");
  }

  setData(rows) {
    const grouped = d3.rollup(
      rows.map((row) => ({
      year: `${row.year}`,
      key: row.genre,
      value: Number(row.count),
      })),
      (entries) =>
      entries
        .sort((a, b) => d3.descending(a.value, b.value))
        .map(({ key, value }) => ({ key, value })),
      (entry) => entry.year
    );

    this.years = Array.from(grouped.keys()).sort(d3.ascending);
    this.dataByYear = new Map(
      this.years.map((year) => [year, grouped.get(year)])
    );

    this.activeYear = this.dataByYear.has(this.activeYear)
      ? this.activeYear
      : this.years[0] ?? null;

    this.render();
  }

  setYear(year) {
    const key = `${year}`;
    if (this.dataByYear.has(key)) {
      this.activeYear = key;
      this.render();
    }
  }

  getYears() {
    return this.years;
  }

  getCurrentYear() {
    return this.activeYear;
  }

  render() {
    if (!this.activeYear) {
      return;
    }

    const segments = this.dataByYear.get(this.activeYear) ?? [];
    const total = d3.sum(segments, (d) => d.value);

    const container = this.parentElement.node();
    const fallbackWidth = 720;
    const width =
      this.configWidth ??
      Math.max(container.getBoundingClientRect().width || fallbackWidth, 480);

    const barHeight = 48;
    const labelOffset = segments.length ? 32 : 0;
    const legendOffset = segments.length ? 36 : 0;

    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = barHeight;

    const height =
      this.configHeight ||
      this.margin.top +
        barHeight +
        labelOffset +
        legendOffset +
        this.margin.bottom;

    this.svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .style("width", "100%")
      .style("height", "auto");

    this.canvas.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`
    );

    this.color.domain(segments.map((d) => d.key));
    this.x.domain([0, total || 1]).range([0, innerWidth]);
    this.y.domain([this.activeYear]).range([0, innerHeight]);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const transitionDuration = prefersReducedMotion ? 0 : 600;
    const transitionEase = d3.easeCubicOut;
    const t = this.svg
      .transition()
      .duration(transitionDuration)
      .ease(transitionEase);

    this.totalLabel
      .attr("x", innerWidth)
      .attr("y", -12)
      .attr("text-anchor", "end")
      .text(`Total: ${this.totalsFormatter(total)}`);

    this.barContainer.attr(
      "transform",
      `translate(0, ${this.y(this.activeYear)})`
    );

    let cursor = 0;
    const positionedSegments = segments.map((segment) => {
      const start = cursor;
      cursor += segment.value;
      return { ...segment, start, end: cursor };
    });

    const bars = this.barSegments
      .selectAll("rect")
      .data(positionedSegments, (segment) => segment.key);

    bars
      .exit()
      .transition(t)
      .attr("width", 0)
      .style("opacity", 0)
      .remove();

    const barsEnter = bars
      .enter()
      .append("rect")
      .attr("x", (segment) => this.x(segment.start))
      .attr("width", 0)
      .attr("height", this.y.bandwidth())
      .attr("fill", (segment) => this.color(segment.key))
      .style("opacity", 0);

    const barsMerge = barsEnter.merge(bars);

    barsMerge
      .order()
      .transition(t)
      .attr("x", (segment) => this.x(segment.start))
      .attr("width", (segment) =>
        Math.max(this.x(segment.end) - this.x(segment.start), 0)
      )
      .attr("height", this.y.bandwidth())
      .attr("fill", (segment) => this.color(segment.key))
      .style("opacity", 1);

    const labels = this.barLabels
      .selectAll("text")
      .data(positionedSegments, (segment) => segment.key);

    labels
      .exit()
      .transition(t)
      .style("opacity", 0)
      .attr("y", this.y.bandwidth())
      .remove();

    const labelsEnter = labels
      .enter()
      .append("text")
      .attr("class", "segment-subtotal")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("opacity", 0)
      .attr("x", (segment) =>
        this.x(segment.start + segment.value / 2)
      )
      .attr("y", this.y.bandwidth() + labelOffset / 2);

    const labelsMerge = labelsEnter.merge(labels);

    labelsMerge
      .text((segment) => this.totalsFormatter(segment.value))
      .transition(t)
      .style("opacity", 1)
      .attr("x", (segment) =>
        this.x(segment.start + segment.value / 2)
      )
      .attr("y", this.y.bandwidth() + labelOffset / 2);

    this.legendGroup.attr(
      "transform",
      `translate(0, ${barHeight + labelOffset})`
    );

    const columnWidth = 160;
    const columns = Math.max(1, Math.floor(innerWidth / columnWidth));
    const rowHeight = 28;
    const legendKeys = segments.map((d) => d.key);
    const columnSpacing = innerWidth / columns;

    const legendItems = this.legendGroup
      .selectAll(".legend-item")
      .data(legendKeys, (key) => key);

    legendItems
      .exit()
      .transition(t)
      .style("opacity", 0)
      .remove();

    const legendEnter = legendItems
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .style("opacity", 0);

    legendEnter
      .append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 3)
      .attr("fill", (key) => this.color(key));

    legendEnter
      .append("text")
      .attr("x", 24)
      .attr("y", 8)
      .attr("dy", "0.35em")
      .text((key) => key);

    legendEnter.transition(t).style("opacity", 1);

    const legendMerge = legendEnter.merge(legendItems);

    const positioningFn = (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return `translate(${column * columnSpacing}, ${row * rowHeight})`;
    };

    legendMerge
      .transition(t)
      .attr("transform", positioningFn)
      .style("opacity", 1);

    legendMerge.select("rect").attr("fill", (key) => this.color(key));
    legendMerge.select("text").text((key) => key);
  }
}

window.StingOpsCharts = window.StingOpsCharts || {};
window.StingOpsCharts.StackedBarChart = StackedBarChart;
