class MoodGauge {
    static formatData(rows) {
      const yearMap = new Map();

      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const year = Number(row?.year);
        const mood = String(row?.mood || '').toLowerCase();
        const count = Number(row?.count) || 0;

        if (!Number.isFinite(year)) {
          return;
        }

        const entry = yearMap.get(year) || { year, comfort: 0, challenge: 0 };
        if (mood === "comfort" || mood === "challenge") {
          entry[mood] += count;
          yearMap.set(year, entry);
        }
      });

      return Array.from(yearMap.values())
        .map((entry) => {
          const total = entry.comfort + entry.challenge;
          const balance =
            total === 0
              ? 0
              : Math.max(-1, Math.min(1, (entry.challenge - entry.comfort) / total));
          return { ...entry, total, balance };
        })
        .sort((a, b) => a.year - b.year);
    }

    constructor({ element }) {
      this.parent = d3.select(element);
      this.parent.html("").classed("mood-gauge", true);

      this.data = [];
      this.displayData = [];
      this.selectedIndex = 0;

      this.angleScale = d3.scaleLinear().domain([-1, 1]).range([-Math.PI, 0]);
      this.xScale = d3.scalePoint().padding(0.5);
      this.yScale = d3.scaleLinear().domain([-1, 1]);

      this.dial = {
        width: 360,
        height: 220,
        radius: 125,
        ringWidth: 24,
      };

      this.timeline = {
        height: 200,
        margin: { top: 18, right: 32, bottom: 40, left: 50 },
      };

      this.overlayWidth = 0;

      this.initVis();

      this.resizeHandler = () => {
        this.updateVis();
      };
      window.addEventListener("resize", this.resizeHandler);
    }

    initVis() {
      const panels = this.parent.append("div").attr("class", "mood-gauge-panels");

      const dialPanel = panels.append("div").attr("class", "mood-gauge-dial-panel");
      this.dialSvg = dialPanel
        .append("svg")
        .attr("class", "mood-gauge-dial")
        .attr("viewBox", `0 0 ${this.dial.width} ${this.dial.height}`);

      this.dialGroup = this.dialSvg
        .append("g")
        .attr(
          "transform",
          `translate(${this.dial.width / 2}, ${this.dial.radius + 24})`
        );

      this.drawDial();

      this.summary = dialPanel.append("div").attr("class", "mood-gauge-summary");

      const timelinePanel = panels.append("div").attr("class", "mood-gauge-timeline");
      this.timelineSvg = timelinePanel.append("svg").attr("class", "mood-gauge-chart");
      this.timelineRoot = this.timelineSvg.append("g");

      this.timelineBackground = this.timelineRoot
        .append("g")
        .attr("class", "mood-gauge-background")
        .attr("pointer-events", "none");
      this.backgroundAbove = this.timelineBackground
        .append("rect")
        .attr("class", "mood-gauge-background--above")
        .attr("fill", "#fde8e8");
      this.backgroundBelow = this.timelineBackground
        .append("rect")
        .attr("class", "mood-gauge-background--below")
        .attr("fill", "#e8f7e8");
      this.timelineBackground.lower();

      this.xAxisG = this.timelineRoot
        .append("g")
        .attr("class", "mood-gauge-axis mood-gauge-axis--x");
      this.yAxisG = this.timelineRoot
        .append("g")
        .attr("class", "mood-gauge-axis mood-gauge-axis--y");
      this.zeroLine = this.timelineRoot.append("line").attr("class", "mood-gauge-zero-line");
      this.linePath = this.timelineRoot.append("path").attr("class", "mood-gauge-line");
      this.pointsGroup = this.timelineRoot.append("g");
      this.handleLine = this.timelineRoot.append("line").attr("class", "mood-gauge-handle-line");
      this.handleCircle = this.timelineRoot.append("circle").attr("class", "mood-gauge-handle-circle").attr("r", 6);
      this.overlay = this.timelineRoot
        .append("rect")
        .attr("class", "mood-gauge-overlay")
        .attr("fill", "transparent");

      const drag = d3
        .drag()
        .on("start drag", (event) => this.onDrag(event))
        .on("end", (event) => this.onDrag(event));
      this.overlay.call(drag);
      this.overlay.on("click", (event) => {
        const [x] = d3.pointer(event, this.overlay.node());
        this.moveHandle(x);
      });
    }

    drawDial() {
      const arc = d3
        .arc()
        .innerRadius(this.dial.radius - this.dial.ringWidth)
        .outerRadius(this.dial.radius);

      this.dialGroup
        .append("path")
        .attr("class", "mood-gauge-arc")
        .attr("d", arc({ startAngle: -Math.PI, endAngle: 0 }))
        .attr("transform", "rotate(90)")
        .attr("fill", "#dd9393ff");

      const tickAngles = [-1, -0.5, 0, 0.5, 1];
      tickAngles.forEach((value) => {
        const angle = this.angleScale(value);
        const inner = this.dial.radius - this.dial.ringWidth - 8;
        const outer = inner - 14;
        this.dialGroup
          .append("line")
          .attr("class", "mood-gauge-tick")
          .attr("x1", Math.cos(angle) * inner)
          .attr("y1", Math.sin(angle) * inner)
          .attr("x2", Math.cos(angle) * outer)
          .attr("y2", Math.sin(angle) * outer);
      });

      this.pointer = this.dialGroup
        .append("line")
        .attr("class", "mood-gauge-pointer")
        .attr("x1", 0)
        .attr("y1", 0);

      this.pointerCap = this.dialGroup
        .append("circle")
        .attr("class", "mood-gauge-pointer-cap")
        .attr("r", 14);

      this.dialGroup
        .append("text")
        .attr("class", "mood-gauge-label")
        .attr("text-anchor", "middle")
        .attr("x", -this.dial.radius + 28)
        .attr("y", 36)
        .text("Comfort");

      this.dialGroup
        .append("text")
        .attr("class", "mood-gauge-label")
        .attr("text-anchor", "middle")
        .attr("x", this.dial.radius - 28)
        .attr("y", 36)
        .text("Challenge");
    }

    setData(rows) {
      this.data = Array.isArray(rows) ? rows : [];
      this.wrangleData();
      this.updateVis();
    }

    wrangleData() {
      this.displayData = [...this.data].sort((a, b) => a.year - b.year);
      if (!this.displayData.length) {
        this.selectedIndex = 0;
        return;
      }
      const lastIndex = this.displayData.length - 1;
      this.selectedIndex = Math.min(Math.max(this.selectedIndex, 0), lastIndex);
    }

    updateVis() {
      const parentNode = this.parent.node();
      const parentWidth = parentNode
        ? parentNode.getBoundingClientRect().width
        : 640;

      const padding = this.timeline.margin.left + this.timeline.margin.right;
      const dialAvailable = Math.max(220, parentWidth - padding);
      const dialScale = dialAvailable / this.dial.width;
      const dialHeight = this.dial.height * dialScale;

      this.dialSvg
        .attr("width", dialAvailable)
        .attr("height", dialHeight)
        .attr("viewBox", `0 0 ${this.dial.width} ${this.dial.height}`);

      this.dialGroup.attr(
        "transform",
        `translate(${this.dial.width / 2}, ${
          this.dial.radius + 24
        }) scale(${dialScale})`
      );

      const timelineWidth = Math.max(320, parentWidth);
      const innerWidth = Math.max(
        160,
        timelineWidth - this.timeline.margin.left - this.timeline.margin.right
      );
      const innerHeight = Math.max(
        96,
        this.timeline.height - this.timeline.margin.top - this.timeline.margin.bottom
      );

      this.timelineSvg
        .attr("width", timelineWidth)
        .attr("height", this.timeline.height)
        .attr("viewBox", `0 0 ${timelineWidth} ${this.timeline.height}`);

      this.timelineRoot.attr(
        "transform",
        `translate(${this.timeline.margin.left}, ${this.timeline.margin.top})`
      );

      this.overlayWidth = innerWidth;
      this.overlay.attr("width", innerWidth).attr("height", innerHeight);
      this.handleLine.attr("y1", 0).attr("y2", innerHeight);
      this.yScale.range([innerHeight, 0]);
      const yZero = this.yScale(0);
      this.backgroundAbove
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", innerWidth)
        .attr("height", yZero);
      this.backgroundBelow
        .attr("x", 0)
        .attr("y", yZero)
        .attr("width", innerWidth)
        .attr("height", innerHeight - yZero);

      if (!this.displayData.length) {
        this.summary.html("");
        this.linePath.attr("d", "");
        this.pointsGroup.selectAll("circle").remove();
        return;
      }

      this.xScale.domain(this.displayData.map((d) => d.year)).range([0, innerWidth]);

      this.xAxisG
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(this.xScale).tickFormat(d3.format("d")).tickSizeOuter(0));
      this.xAxisG
        .selectAll("text")
        .attr("transform", "translate(-4, 8) rotate(-45)")
        .style("text-anchor", "end");
      this.yAxisG.call(
        d3.axisLeft(this.yScale).ticks(5).tickFormat((d) => `${Math.round(d * 100)}%`)
      );

      this.zeroLine
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", this.yScale(0))
        .attr("y2", this.yScale(0));

      const line = d3
        .line()
        .x((d) => this.xScale(d.year))
        .y((d) => this.yScale(d.balance))
        .curve(d3.curveMonotoneX);
        
      this.linePath.datum(this.displayData).attr("d", line);

      const circles = this.pointsGroup
        .selectAll("circle")
        .data(this.displayData, (d) => d.year);

      circles.exit().remove();

      circles
        .enter()
        .append("circle")
        .attr("class", "mood-gauge-point")
        .attr("r", 6)
        .merge(circles)
        .attr("cx", (d) => this.xScale(d.year))
        .attr("cy", (d) => this.yScale(d.balance));

      this.highlightSelection();
    }

    highlightSelection() {
      if (!this.displayData.length) {
        return;
      }

      const entry = this.displayData[this.selectedIndex];
      const pointerLength = this.dial.radius - this.dial.ringWidth + 4;
      const angle = this.angleScale(entry.balance);

      this.pointer
        .attr("x2", Math.cos(angle) * pointerLength)
        .attr("y2", Math.sin(angle) * pointerLength);

      const comfortShare = entry.total ? entry.comfort / entry.total : 0;
      const challengeShare = entry.total ? entry.challenge / entry.total : 0;
      const percentFormat = d3.format(".0%");
      const numberFormat = d3.format(",");

      this.summary.html(
        `<div class="mood-gauge-summary-single">
          <span class="mood-gauge-summary-label">Comfort vs. Challenge</span>
          <div class="mood-gauge-summary-values">
            <span class="mood-gauge-summary-value mood-gauge-summary-value--comfort">
              Comfort ${percentFormat(comfortShare)}
              <span class="mood-gauge-summary-count">(${numberFormat(entry.comfort)})</span>
            </span>
            <span class="mood-gauge-summary-separator" aria-hidden="true">•</span>
            <span class="mood-gauge-summary-value mood-gauge-summary-value--challenge">
              Challenge ${percentFormat(challengeShare)}
              <span class="mood-gauge-summary-count">(${numberFormat(entry.challenge)})</span>
            </span>
          </div>
        </div>`
      );

      const x = this.xScale(entry.year);
      this.handleLine.attr("x1", x).attr("x2", x);
      this.handleCircle.attr("cx", x).attr("cy", this.yScale(entry.balance));

      this.pointsGroup
        .selectAll("circle")
        .classed("mood-gauge-point--active", (_, i) => i === this.selectedIndex);
    }

    onDrag(event) {
      const [x] = d3.pointer(event, this.overlay.node());
      this.moveHandle(x);
    }

    moveHandle(position) {
      if (!this.displayData.length) {
        return;
      }

      const maxWidth = this.overlayWidth || Number(this.overlay.attr("width")) || 0;
      const clamped = Math.max(0, Math.min(maxWidth, position));

      let closest = 0;
      let minDist = Infinity;
      this.displayData.forEach((item, index) => {
        const dist = Math.abs(this.xScale(item.year) - clamped);
        if (dist < minDist) {
          minDist = dist;
          closest = index;
        }
      });

      this.setSelectedIndex(closest);
    }

    setSelectedIndex(index) {
      if (!this.displayData.length) {
        return;
      }
      const safeIndex = Math.max(0, Math.min(this.displayData.length - 1, index));
      if (safeIndex === this.selectedIndex) {
        this.highlightSelection();
        return;
      }
      this.selectedIndex = safeIndex;
      this.highlightSelection();
    }

    setYear(year) {
      const idx = this.displayData.findIndex((d) => d.year === Number(year));
      if (idx >= 0) {
        this.setSelectedIndex(idx);
      }
    }

    destroy() {
      window.removeEventListener("resize", this.resizeHandler);
      this.parent.html("");
    }
  }

window.StingOpsCharts = window.StingOpsCharts || {};
window.StingOpsCharts.MoodGauge = MoodGauge;
