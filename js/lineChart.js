class LineChart {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = Array.isArray(data) ? data : [];
    this.displayData = [];
    this.selectedGenre = "All";
    this.allGenres = [];
    this.genreDescriptions = [];
    this.timelineEvents = [];
  }

  setData(rows) {
    this.data = Array.isArray(rows) ? rows : [];
    if (this.svg) {
      this.wrangleData();
    }
  }

  initVis() {
    let vis = this;

    vis.margin = { top: 40, right: 40, bottom: 60, left: 70 };

    vis.width =
      document.getElementById(vis.parentElement).getBoundingClientRect().width -
      vis.margin.left -
      vis.margin.right;
    vis.height =
      document.getElementById(vis.parentElement).getBoundingClientRect()
        .height -
      vis.margin.top -
      vis.margin.bottom;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr(
        "transform",
        "translate(" + vis.margin.left + "," + vis.margin.top + ")"
      );

    vis.x = d3.scaleLinear().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = d3.axisBottom().scale(vis.x).tickFormat(d3.format("d"));
    vis.yAxis = d3.axisLeft().scale(vis.y);

    vis.svg
      .append("g")
      .attr("class", "x-axis axis")
      .attr("transform", "translate(0," + vis.height + ")");

    vis.svg.append("g").attr("class", "y-axis axis");

    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 45)
      .attr("text-anchor", "middle")
      .text("Year");

    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Number of Releases");

    vis.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", "translate(20, 10)");

    vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "timeline-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("max-width", "350px");

    vis.loadGenreDescriptions();
    vis.loadTimelineEvents();
    vis.wrangleData();
  }

  loadTimelineEvents() {
    let vis = this;
    d3.csv("data/timeline_events.csv").then(function (data) {
      vis.timelineEvents = data
        .filter(function (d) {
          return d.year && d.year !== "year";
        })
        .map(function (d) {
          return {
            year: +d.year,
            title: d.title,
            description: d.description,
          };
        });
      vis.updateVis();
    });
  }

  loadGenreDescriptions() {
    let vis = this;
    d3.json("data/timeline_caption.json").then(function (data) {
      vis.genreDescriptions = data;
      vis.updateInfoPanel();
    });
  }

  wrangleData() {
    let vis = this;

    var filteredData = vis.data
      .map(function (d) {
        return {
          year: +d.year,
          genre: d.genre.trim(),
          count: +d.count,
        };
      })
      .filter(function (d) {
        return d.year >= 2010 && d.year <= 2023;
      });

    vis.filteredData = filteredData;

    var years = [];
    var genres = [];
    for (var i = 0; i < filteredData.length; i++) {
      if (years.indexOf(filteredData[i].year) === -1) {
        years.push(filteredData[i].year);
      }
      if (genres.indexOf(filteredData[i].genre) === -1) {
        genres.push(filteredData[i].genre);
      }
    }
    years.sort(function (a, b) {
      return a - b;
    });

    vis.allGenres = genres;
    vis.years = years;

    vis.x.domain(d3.extent(years));

    var maxCount = 0;
    for (var i = 0; i < filteredData.length; i++) {
      if (filteredData[i].count > maxCount) {
        maxCount = filteredData[i].count;
      }
    }
    vis.y.domain([0, maxCount * 1.1]);
    vis.colorScale.domain(genres);

    vis.updateVis();
    vis.createGenreButtons();
  }

  updateVis() {
    let vis = this;

    if (vis.filteredData.length === 0) return;

    vis.line = d3
      .line()
      .x(function (d) {
        return vis.x(d.year);
      })
      .y(function (d) {
        return vis.y(d.count);
      })
      .curve(d3.curveLinear);

    var genresToShow = vis.allGenres;
    if (vis.selectedGenre !== "All") {
      genresToShow = [vis.selectedGenre];
    }

    var dataToShow = [];
    var maxCount = 0;
    for (var i = 0; i < genresToShow.length; i++) {
      var genre = genresToShow[i];
      var genreData = {
        genre: genre,
        values: [],
      };

      for (var j = 0; j < vis.filteredData.length; j++) {
        if (vis.filteredData[j].genre === genre) {
          var count = vis.filteredData[j].count;
          genreData.values.push({
            year: vis.filteredData[j].year,
            count: count,
          });
          if (count > maxCount) {
            maxCount = count;
          }
        }
      }

      genreData.values.sort(function (a, b) {
        return a.year - b.year;
      });

      dataToShow.push(genreData);
    }

    vis.y.domain([0, maxCount * 1.1]);

    let lines = vis.svg.selectAll(".line").data(dataToShow);

    lines
      .enter()
      .append("path")
      .attr("class", "line")
      .merge(lines)
      .attr("d", function (d) {
        return vis.line(d.values);
      })
      .attr("stroke", function (d) {
        return vis.colorScale(d.genre);
      })
      .attr("stroke-width", 2)
      .attr("fill", "none");

    lines.exit().remove();

    let legendItems = vis.svg.select(".legend").selectAll("g").data(dataToShow);

    let legendItemsEnter = legendItems
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        return "translate(0," + i * 15 + ")";
      });

    legendItemsEnter.append("circle").attr("r", 3);

    legendItemsEnter
      .append("text")
      .attr("x", 10)
      .attr("y", 3)
      .attr("font-size", "10px");

    legendItems
      .merge(legendItemsEnter)
      .attr("transform", function (d, i) {
        return "translate(0," + i * 15 + ")";
      })
      .select("circle")
      .attr("fill", function (d) {
        return vis.colorScale(d.genre);
      });

    legendItems
      .merge(legendItemsEnter)
      .select("text")
      .text(function (d) {
        return d.genre;
      });

    legendItems.exit().remove();

    vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").call(vis.yAxis);

    var timelineDots = vis.svg
      .selectAll(".timeline-dot")
      .data(vis.timelineEvents);

    timelineDots
      .enter()
      .append("circle")
      .attr("class", "timeline-dot")
      .attr("r", 5)
      .attr("fill", "#333")
      .attr("cx", function (d) {
        return vis.x(d.year);
      })
      .attr("cy", vis.height)
      .on("mouseover", function (event, d) {
        vis.tooltip.transition().style("opacity", 1);
        vis.tooltip
          .html("<strong>" + d.title + "</strong><br/>" + d.description)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        vis.tooltip.transition().style("opacity", 0);
      });

    timelineDots
      .attr("cx", function (d) {
        return vis.x(d.year);
      })
      .attr("cy", vis.height);

    timelineDots.exit().remove();
  }

  createGenreButtons() {
    let vis = this;

    var buttonContainer = document.querySelector(".line-genre-buttons");
    if (!buttonContainer) {
      return;
    }
    buttonContainer.innerHTML = "";

    var genresToShow = ["All"].concat(vis.allGenres);

    for (var i = 0; i < genresToShow.length; i++) {
      var genre = genresToShow[i];
      var button = document.createElement("button");
      button.className = "line-genre-btn";
      button.textContent = genre;
      button.setAttribute("data-genre", genre);

      if (genre === vis.selectedGenre) {
        button.classList.add("active");
      }

      button.onclick = function () {
        var clickedGenre = this.getAttribute("data-genre");
        vis.selectedGenre = clickedGenre;

        var allButtons = buttonContainer.querySelectorAll(".line-genre-btn");
        for (var j = 0; j < allButtons.length; j++) {
          if (allButtons[j].getAttribute("data-genre") === clickedGenre) {
            allButtons[j].classList.add("active");
          } else {
            allButtons[j].classList.remove("active");
          }
        }

        vis.updateVis();
        vis.updateInfoPanel();
      };

      buttonContainer.appendChild(button);
    }
  }

  updateInfoPanel() {
    let vis = this;
    var selectedGenre = vis.selectedGenre;

    d3.select("#line-info-title").text(
      selectedGenre === "All" ? "All Genres" : selectedGenre
    );

    var genreInfo = null;
    if (selectedGenre !== "All" && vis.genreDescriptions.length > 0) {
      genreInfo = vis.genreDescriptions.find(function (d) {
        return (
          d.genre.toLowerCase().trim() === selectedGenre.toLowerCase().trim()
        );
      });
    }

    var content = "";
    if (genreInfo) {
      const imageFile =
        typeof genreInfo.image === "string"
          ? genreInfo.image.replace(/^images\//i, "").trim()
          : "";
      const imagePath = imageFile ? `assets/${imageFile}` : "";

      const imageMarkup = imagePath
        ? `<div class='genre-image-container'><img src='${imagePath}' alt='${selectedGenre}' class='genre-image'></div>`
        : "";

      content = `${imageMarkup}<p>${genreInfo.caption}</p>`;
    } else if (selectedGenre === "All") {
      content =
        "<p>Select a genre to see detailed information about its release trends.</p>";
    } else {
      content = "<p>No description available for this genre.</p>";
    }

    d3.select("#line-info-content").html(content);
  }
}

window.StingOpsCharts = window.StingOpsCharts || {};
window.StingOpsCharts.LineChart = LineChart;
