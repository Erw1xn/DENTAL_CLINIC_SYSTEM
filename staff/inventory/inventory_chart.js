/* =============================================================
   PAGE 3 — DEMAND FORECASTING (stat cards + Chart.js chart)
   -------------------------------------------------------------
   Depends on window.InventoryShared, which is created in
   inventory.js. Make sure inventory.js is loaded BEFORE this
   file in inventory.html.
   ============================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const shared = window.InventoryShared;

  if (!shared) {
    console.error(
      "InventoryShared not found. Make sure inventory.js is loaded before inventory_chart.js.",
    );

    return;
  }

  const forecastMovementCount = document.getElementById(
    "forecastMovementCount",
  );

  const forecastUsageCount = document.getElementById("forecastUsageCount");

  const forecastItemsWithData = document.getElementById(
    "forecastItemsWithData",
  );

  const forecastChartCanvas = document.getElementById("forecastChart");

  const chartEmpty = document.getElementById("chartEmpty");

  const chartToggle = document.getElementById("chartToggle");

  let forecastChartInstance = null;

  let currentChartMode = "bar";

  const CHART_COLORS = {
    average: "#176b38",
    averageFill: "rgba(23, 107, 56, 0.14)",

    estimate: "#3b72d9",
    estimateFill: "rgba(59, 114, 217, 0.14)",

    trend: "#d9950b",
    trendFill: "rgba(217, 149, 11, 0.14)",

    grid: "#edf1ee",
    text: "#6b7970",
  };

  function updateStatCards() {
    const movements = shared.getMovements();

    const usageMovements = shared.getUsageMovements();

    const forecastData = shared.buildForecastData();

    const itemsWithData = forecastData.filter(
      (forecast) => forecast.usageRecords > 0,
    );

    if (forecastMovementCount) {
      forecastMovementCount.textContent = movements.length;
    }

    if (forecastUsageCount) {
      forecastUsageCount.textContent = usageMovements.length;
    }

    if (forecastItemsWithData) {
      forecastItemsWithData.textContent = itemsWithData.length;
    }
  }

  function buildBarChartConfig(forecastData) {
    const usableForecastData = forecastData.filter(
      (forecast) => forecast.hasEnoughData,
    );

    const labels = usableForecastData.map((forecast) => forecast.item.name);

    const averages = usableForecastData.map((forecast) =>
      Number(forecast.average.toFixed(2)),
    );

    const estimates = usableForecastData.map((forecast) => forecast.estimate);

    return {
      type: "bar",

      data: {
        labels,

        datasets: [
          {
            label: "Average Usage",

            data: averages,

            backgroundColor: CHART_COLORS.averageFill,

            borderColor: CHART_COLORS.average,

            borderWidth: 1.5,

            borderRadius: 6,

            maxBarThickness: 34,
          },

          {
            label: "Estimated Next Period",

            data: estimates,

            backgroundColor: CHART_COLORS.estimateFill,

            borderColor: CHART_COLORS.estimate,

            borderWidth: 1.5,

            borderRadius: 6,

            maxBarThickness: 34,
          },
        ],
      },

      options: {
        responsive: true,

        maintainAspectRatio: false,

        interaction: {
          mode: "index",

          intersect: false,
        },

        plugins: {
          legend: {
            position: "top",

            align: "end",

            labels: {
              usePointStyle: true,

              pointStyle: "circle",

              boxWidth: 8,

              font: {
                family: "Poppins",

                size: 11,

                weight: "600",
              },

              color: CHART_COLORS.text,
            },
          },

          tooltip: {
            backgroundColor: "#1c2a22",

            titleFont: {
              family: "Poppins",

              size: 11,

              weight: "600",
            },

            bodyFont: {
              family: "Poppins",

              size: 11,
            },

            padding: 10,

            cornerRadius: 8,

            callbacks: {
              afterBody: (items) => {
                if (!items.length) {
                  return "";
                }

                const forecast = usableForecastData[items[0].dataIndex];

                return [
                  "",

                  `Usage records: ${forecast.usageRecords}`,

                  `Total used: ${forecast.totalUsed} ${forecast.item.unit}`,
                ];
              },
            },
          },
        },

        scales: {
          x: {
            grid: {
              display: false,
            },

            ticks: {
              font: {
                family: "Poppins",

                size: 10,
              },

              color: CHART_COLORS.text,
            },
          },

          y: {
            beginAtZero: true,

            grid: {
              color: CHART_COLORS.grid,
            },

            ticks: {
              precision: 0,

              font: {
                family: "Poppins",

                size: 10,
              },

              color: CHART_COLORS.text,
            },
          },
        },
      },
    };
  }

  function buildTrendChartConfig() {
    const usageMovements = [...shared.getUsageMovements()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const dailyTotals = new Map();

    usageMovements.forEach((movement) => {
      if (!movement.date) {
        return;
      }

      const dayKey = String(movement.date).slice(0, 10);

      const current = dailyTotals.get(dayKey) || 0;

      dailyTotals.set(dayKey, current + Number(movement.quantity || 0));
    });

    const sortedDays = [...dailyTotals.keys()].sort();

    const labels = sortedDays.map((day) =>
      new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    const values = sortedDays.map((day) => dailyTotals.get(day));

    const runningAverage = [];

    let runningTotal = 0;

    values.forEach((value, index) => {
      runningTotal += value;

      runningAverage.push(Number((runningTotal / (index + 1)).toFixed(2)));
    });

    return {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Stock-Out Quantity (per day)",

            data: values,

            borderColor: CHART_COLORS.trend,

            backgroundColor: CHART_COLORS.trendFill,

            fill: true,

            tension: 0.3,

            pointRadius: 3,

            pointBackgroundColor: CHART_COLORS.trend,
          },

          {
            label: "Running Average",

            data: runningAverage,

            borderColor: CHART_COLORS.average,

            backgroundColor: "transparent",

            borderDash: [5, 4],

            tension: 0.3,

            pointRadius: 0,
          },
        ],
      },

      options: {
        responsive: true,

        maintainAspectRatio: false,

        interaction: {
          mode: "index",

          intersect: false,
        },

        plugins: {
          legend: {
            position: "top",

            align: "end",

            labels: {
              usePointStyle: true,

              pointStyle: "circle",

              boxWidth: 8,

              font: {
                family: "Poppins",

                size: 11,

                weight: "600",
              },

              color: CHART_COLORS.text,
            },
          },

          tooltip: {
            backgroundColor: "#1c2a22",

            titleFont: {
              family: "Poppins",

              size: 11,

              weight: "600",
            },

            bodyFont: {
              family: "Poppins",

              size: 11,
            },

            padding: 10,

            cornerRadius: 8,
          },
        },

        scales: {
          x: {
            grid: {
              display: false,
            },

            ticks: {
              font: {
                family: "Poppins",

                size: 10,
              },

              color: CHART_COLORS.text,
            },
          },

          y: {
            beginAtZero: true,

            grid: {
              color: CHART_COLORS.grid,
            },

            ticks: {
              precision: 0,

              font: {
                family: "Poppins",

                size: 10,
              },

              color: CHART_COLORS.text,
            },
          },
        },
      },
    };
  }

  function showChartEmpty(title, text, iconClass = "fa-solid fa-chart-simple") {
    if (forecastChartCanvas) {
      forecastChartCanvas.hidden = true;
    }

    if (!chartEmpty) {
      return;
    }

    chartEmpty.hidden = false;

    chartEmpty.style.display = "flex";

    const icon = document.getElementById("chartEmptyIcon");

    const titleElement = document.getElementById("chartEmptyTitle");

    const textElement = document.getElementById("chartEmptyText");

    if (icon) {
      icon.className = iconClass;
    }

    if (titleElement) {
      titleElement.textContent = title;
    }

    if (textElement) {
      textElement.textContent = text;
    }
  }

  function hideChartEmpty() {
    if (forecastChartCanvas) {
      forecastChartCanvas.hidden = false;
    }

    if (chartEmpty) {
      chartEmpty.hidden = true;

      chartEmpty.style.display = "none";
    }
  }

  function renderForecastChart() {
    if (!forecastChartCanvas) {
      return;
    }

    if (typeof Chart === "undefined") {
      if (forecastChartInstance) {
        forecastChartInstance.destroy();

        forecastChartInstance = null;
      }

      showChartEmpty(
        "Chart library didn't load",

        "Chart.js could not be loaded from the CDN. Check your internet connection, then refresh the page.",

        "fa-solid fa-triangle-exclamation",
      );

      return;
    }

    const forecastData = shared.buildForecastData();

    const usageMovements = shared.getUsageMovements();

    const usableForecastData = forecastData.filter(
      (forecast) => forecast.hasEnoughData,
    );

    const hasData =
      currentChartMode === "bar"
        ? usableForecastData.length > 0
        : usageMovements.length > 0;

    if (forecastChartInstance) {
      forecastChartInstance.destroy();

      forecastChartInstance = null;
    }

    if (!hasData) {
      if (currentChartMode === "bar") {
        showChartEmpty(
          "Not enough forecast data",

          "Record at least 3 stock-out movements for an item before the forecast chart can calculate Average Usage and Estimated Next Period.",

          "fa-solid fa-chart-simple",
        );
      } else {
        showChartEmpty(
          "No historical data yet",

          "Record at least one stock-out movement so the historical trend can be displayed.",

          "fa-solid fa-chart-simple",
        );
      }

      return;
    }

    hideChartEmpty();

    const config =
      currentChartMode === "bar"
        ? buildBarChartConfig(forecastData)
        : buildTrendChartConfig();

    forecastChartInstance = new Chart(forecastChartCanvas, config);
  }

  if (chartToggle) {
    chartToggle.addEventListener("click", (event) => {
      const button = event.target.closest(".chart-toggle-btn");

      if (!button) {
        return;
      }

      const mode = button.dataset.chartMode;

      if (!mode || mode === currentChartMode) {
        return;
      }

      currentChartMode = mode;

      chartToggle
        .querySelectorAll(".chart-toggle-btn")
        .forEach((toggleButton) => {
          toggleButton.classList.toggle("active", toggleButton === button);
        });

      renderForecastChart();
    });
  }

  function renderAll() {
    updateStatCards();

    renderForecastChart();
  }

  // Cross-tab updates (another browser tab changed the data)
  window.addEventListener("storage", (event) => {
    if (event.key === shared.ITEMS_KEY || event.key === shared.MOVEMENTS_KEY) {
      renderAll();
    }
  });

  // Same-tab updates (Page 1 added/edited/deleted an item or movement)
  window.addEventListener(shared.DATA_CHANGED_EVENT, renderAll);

  renderAll();
});
