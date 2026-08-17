document.addEventListener("DOMContentLoaded", () => {
  const shared = window.InventoryShared;

  if (!shared) {
    console.error(
      "InventoryShared not found. Make sure inventory.js is loaded before demand_forecasting.js.",
    );
    return;
  }

  const page3 = document.getElementById("inventoryPage3");

  if (!page3) {
    console.error("inventoryPage3 not found.");
    return;
  }

  const TESTING_MODE = true;

  const TESTING_PERIOD_COUNT = 3;

  if (!document.getElementById("demandForecastingStyles")) {
    const style = document.createElement("style");

    style.id = "demandForecastingStyles";

    style.textContent = `
      #inventoryPage3 {
        width: 100%;
      }

      #inventoryPage3 .demand-forecast-page {
        width: 100%;
      }

      #inventoryPage3 .demand-forecast-panel {
        width: 100%;
        overflow: hidden;
        border: 1px solid #e7ece9;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 4px 18px rgba(20, 32, 26, 0.035);
        box-sizing: border-box;
      }

      #inventoryPage3 .demand-forecast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 20px 22px;
        border-bottom: 1px solid #edf1ee;
        background: #fcfdfc;
        box-sizing: border-box;
      }

      #inventoryPage3 .demand-forecast-header-content {
        min-width: 0;
        flex: 1;
      }

      #inventoryPage3 .demand-forecast-label {
        display: block;
        margin-bottom: 4px;
        color: #176b38;
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.9px;
        text-transform: uppercase;
      }

      #inventoryPage3 .demand-forecast-header h2 {
        margin: 0;
        color: #18251e;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
      }

      #inventoryPage3 .demand-forecast-header p {
        max-width: 780px;
        margin: 5px 0 0;
        color: #7a867f;
        font-size: 0.64rem;
        line-height: 1.5;
      }

      #inventoryPage3 .forecast-method-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex-shrink: 0;
        padding: 8px 11px;
        border: 1px solid #dce9e0;
        border-radius: 999px;
        background: #eef8f2;
        color: #267b47;
        font-size: 0.57rem;
        font-weight: 600;
        white-space: nowrap;
      }

      #inventoryPage3 .forecast-method-badge i {
        font-size: 0.58rem;
      }

      #inventoryPage3 .forecast-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        padding: 18px 22px;
        border-bottom: 1px solid #edf1ee;
        box-sizing: border-box;
      }

      #inventoryPage3 .forecast-summary-card {
        min-width: 0;
        min-height: 78px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px solid #edf1ee;
        border-radius: 12px;
        background: #fafcfb;
        box-sizing: border-box;
      }

      #inventoryPage3 .forecast-summary-icon {
        width: 36px;
        height: 36px;
        min-width: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #eaf7ef;
        color: #176b38;
        font-size: 0.75rem;
      }

      #inventoryPage3 .forecast-summary-content {
        min-width: 0;
      }

      #inventoryPage3 .forecast-summary-content span {
        display: block;
        color: #7a867f;
        font-size: 0.55rem;
        line-height: 1.25;
      }

      #inventoryPage3 .forecast-summary-content strong {
        display: block;
        margin-top: 3px;
        overflow: hidden;
        color: #26352d;
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #inventoryPage3 .forecast-summary-content strong.green {
        color: #176b38;
      }

      #inventoryPage3 .forecast-summary-content strong.blue {
        color: #3b72d9;
      }

      #inventoryPage3 .forecast-table-section {
        width: 100%;
      }

      #inventoryPage3 .forecast-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 17px 22px;
        border-bottom: 1px solid #edf1ee;
      }

      #inventoryPage3 .forecast-section-title {
        min-width: 0;
      }

      #inventoryPage3 .forecast-section-title span {
        display: block;
        margin-bottom: 3px;
        color: #176b38;
        font-size: 0.53rem;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }

      #inventoryPage3 .forecast-section-title h3 {
        margin: 0;
        color: #26352d;
        font-size: 0.82rem;
        font-weight: 700;
      }

      #inventoryPage3 .forecast-section-title p {
        margin: 4px 0 0;
        color: #87938c;
        font-size: 0.6rem;
        line-height: 1.45;
      }

      #inventoryPage3 .forecast-table-wrapper {
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
      }

      #inventoryPage3 .demand-forecast-table {
        width: 100%;
        min-width: 1100px;
        border-collapse: collapse;
      }

      #inventoryPage3 .demand-forecast-table th {
        height: 42px;
        padding: 0 13px;
        background: #fafcfb;
        border-bottom: 1px solid #e8eeea;
        color: #7a867f;
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.25px;
        text-align: left;
        white-space: nowrap;
      }

      #inventoryPage3 .demand-forecast-table th:first-child,
      #inventoryPage3 .demand-forecast-table td:first-child {
        padding-left: 22px;
      }

      #inventoryPage3 .demand-forecast-table th:last-child,
      #inventoryPage3 .demand-forecast-table td:last-child {
        padding-right: 22px;
      }

      #inventoryPage3 .demand-forecast-table td {
        min-height: 70px;
        padding: 11px 13px;
        border-bottom: 1px solid #edf1ee;
        color: #536159;
        font-size: 0.61rem;
        vertical-align: middle;
      }

      #inventoryPage3 .demand-forecast-table tbody tr:last-child td {
        border-bottom: none;
      }

      #inventoryPage3 .demand-forecast-table tbody tr:hover {
        background: #fbfdfc;
      }

      #inventoryPage3 .demand-item-cell {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 180px;
      }

      #inventoryPage3 .demand-item-icon {
        width: 32px;
        height: 32px;
        min-width: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        background: #eaf7ef;
        color: #176b38;
        font-size: 0.65rem;
      }

      #inventoryPage3 .demand-item-info {
        min-width: 0;
      }

      #inventoryPage3 .demand-item-name {
        display: block;
        overflow: hidden;
        color: #26352d;
        font-size: 0.64rem;
        font-weight: 700;
        line-height: 1.3;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #inventoryPage3 .demand-item-id {
        display: block;
        margin-top: 2px;
        color: #98a49e;
        font-size: 0.51rem;
      }

      #inventoryPage3 .demand-number {
        color: #26352d;
        font-weight: 600;
      }

      #inventoryPage3 .demand-number.green {
        color: #176b38;
        font-weight: 700;
      }

      #inventoryPage3 .demand-number.blue {
        color: #3b72d9;
        font-weight: 700;
      }

      #inventoryPage3 .demand-unit {
        margin-left: 3px;
        color: #98a49e;
        font-size: 0.52rem;
      }

      #inventoryPage3 .demand-status {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 0.53rem;
        font-weight: 600;
        white-space: nowrap;
      }

      #inventoryPage3 .demand-status::before {
        content: "";
        width: 5px;
        height: 5px;
        flex-shrink: 0;
        border-radius: 50%;
      }

      #inventoryPage3 .demand-status.sufficient {
        background: #eaf8ef;
        color: #267b47;
      }

      #inventoryPage3 .demand-status.sufficient::before {
        background: #38a866;
      }

      #inventoryPage3 .demand-status.reorder {
        background: #fff5dc;
        color: #b67a08;
      }

      #inventoryPage3 .demand-status.reorder::before {
        background: #e2a21b;
      }

      #inventoryPage3 .demand-status.insufficient-data {
        background: #f2f4f3;
        color: #7b8780;
      }

      #inventoryPage3 .demand-status.insufficient-data::before {
        background: #98a49e;
      }

      #inventoryPage3 .demand-method {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border: 1px solid #dce9e0;
        border-radius: 8px;
        background: #f7fbf8;
        color: #176b38;
        font-size: 0.51rem;
        font-weight: 600;
        white-space: nowrap;
      }

      #inventoryPage3 .demand-method i {
        font-size: 0.52rem;
      }

      #inventoryPage3 .forecast-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        padding: 18px 22px 0;
      }

      #inventoryPage3 .forecast-metric-card {
        min-width: 0;
        padding: 15px;
        border: 1px solid #e7ece9;
        border-radius: 13px;
        background: #ffffff;
        box-sizing: border-box;
      }

      #inventoryPage3 .forecast-metric-card-header {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      #inventoryPage3 .forecast-metric-icon {
        width: 32px;
        height: 32px;
        min-width: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        background: #eef3ff;
        color: #496fbd;
        font-size: 0.65rem;
      }

      #inventoryPage3 .forecast-metric-card h4 {
        margin: 0;
        color: #26352d;
        font-size: 0.67rem;
        font-weight: 700;
      }

      #inventoryPage3 .forecast-metric-card p {
        margin: 4px 0 0;
        color: #87938c;
        font-size: 0.55rem;
        line-height: 1.4;
      }

      #inventoryPage3 .forecast-metric-value {
        margin-top: 13px;
        color: #3b72d9;
        font-size: 1rem;
        font-weight: 700;
      }

      #inventoryPage3 .forecast-metric-value.pending {
        color: #89958f;
        font-size: 0.78rem;
      }

      #inventoryPage3 .forecast-ai-ready {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin: 18px 22px 22px;
        padding: 15px 16px;
        border: 1px dashed #cfe0d5;
        border-radius: 13px;
        background: #f7fbf8;
        box-sizing: border-box;
      }

      #inventoryPage3 .forecast-ai-icon {
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #e7f5ec;
        color: #176b38;
        font-size: 0.76rem;
      }

      #inventoryPage3 .forecast-ai-content {
        min-width: 0;
        flex: 1;
      }

      #inventoryPage3 .forecast-ai-content strong {
        display: block;
        color: #2b3a31;
        font-size: 0.67rem;
        font-weight: 700;
      }

      #inventoryPage3 .forecast-ai-content p {
        margin: 4px 0 0;
        color: #7d8982;
        font-size: 0.58rem;
        line-height: 1.5;
      }

      #inventoryPage3 .forecast-ai-status {
        flex-shrink: 0;
        padding: 6px 9px;
        border-radius: 999px;
        background: #eef3ff;
        color: #496fbd;
        font-size: 0.53rem;
        font-weight: 600;
        white-space: nowrap;
      }

      #inventoryPage3 .forecast-empty {
        min-height: 230px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px;
        text-align: center;
        box-sizing: border-box;
      }

      #inventoryPage3 .forecast-empty-icon {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        border-radius: 14px;
        background: #eef6f1;
        color: #176b38;
        font-size: 1rem;
      }

      #inventoryPage3 .forecast-empty h3 {
        margin: 0;
        color: #26352d;
        font-size: 0.82rem;
        font-weight: 700;
      }

      #inventoryPage3 .forecast-empty p {
        max-width: 430px;
        margin: 5px 0 0;
        color: #87938c;
        font-size: 0.61rem;
        line-height: 1.5;
      }

      @media (max-width: 1100px) {
        #inventoryPage3 .forecast-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 900px) {
        #inventoryPage3 .demand-forecast-header {
          align-items: flex-start;
          flex-direction: column;
        }

        #inventoryPage3 .forecast-method-badge {
          align-self: flex-start;
        }
      }

      @media (max-width: 700px) {
        #inventoryPage3 .forecast-summary {
          grid-template-columns: 1fr;
          padding: 14px 16px;
        }

        #inventoryPage3 .demand-forecast-header {
          padding: 17px 16px;
        }

        #inventoryPage3 .forecast-section-header {
          padding: 15px 16px;
        }

        #inventoryPage3 .forecast-metrics {
          grid-template-columns: 1fr;
          padding: 16px 16px 0;
        }

        #inventoryPage3 .forecast-ai-ready {
          margin: 16px;
        }
      }

      @media (max-width: 480px) {
        #inventoryPage3 .demand-forecast-header h2 {
          font-size: 0.9rem;
        }

        #inventoryPage3 .forecast-ai-ready {
          flex-wrap: wrap;
        }

        #inventoryPage3 .forecast-ai-status {
          margin-left: 50px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  page3.innerHTML = `
    <div class="demand-forecast-page">
      <div class="demand-forecast-panel">
        <div class="demand-forecast-header">
          <div class="demand-forecast-header-content">
            <span class="demand-forecast-label">DEMAND FORECASTING</span>

            <h2>Inventory Demand Forecast</h2>

            <p id="forecastHeaderDescription">
              Estimate the next period's supply demand using Stock Out usage and the current inventory level.
            </p>
          </div>

          <div class="forecast-method-badge" id="forecastMethodBadge">
            <i class="fa-solid fa-chart-line"></i>
            3-Period Moving Average
          </div>
        </div>

        <div class="forecast-summary" id="forecastSummary">
          <div class="forecast-summary-card">
            <div class="forecast-summary-icon">
              <i class="fa-solid fa-boxes-stacked"></i>
            </div>

            <div class="forecast-summary-content">
              <span>TOTAL ITEMS</span>
              <strong id="forecastTotalItems">0</strong>
            </div>
          </div>

          <div class="forecast-summary-card">
            <div class="forecast-summary-icon">
              <i class="fa-solid fa-chart-column"></i>
            </div>

            <div class="forecast-summary-content">
              <span>ITEMS WITH FORECAST</span>
              <strong class="green" id="forecastReadyItems">0</strong>
            </div>
          </div>

          <div class="forecast-summary-card">
            <div class="forecast-summary-icon">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div class="forecast-summary-content">
              <span>REORDER RECOMMENDED</span>
              <strong id="forecastReorderItems">0</strong>
            </div>
          </div>

          <div class="forecast-summary-card">
            <div class="forecast-summary-icon">
              <i class="fa-solid fa-clock"></i>
            </div>

            <div class="forecast-summary-content">
              <span id="forecastPeriodLabel">FORECAST PERIOD</span>
              <strong class="blue" id="forecastPeriod">Next Testing Period</strong>
            </div>
          </div>
        </div>

        <div class="forecast-table-section">
          <div class="forecast-section-header">
            <div class="forecast-section-title">
              <span>FORECAST RESULTS</span>

              <h3>Recommended Inventory Planning</h3>

              <p id="forecastSectionDescription">
                Testing mode uses the latest three Stock Out records as three testing periods.
              </p>
            </div>
          </div>

          <div class="forecast-table-wrapper">
            <table class="demand-forecast-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>CURRENT STOCK</th>
                  <th id="forecastAverageHeader">AVG. USAGE / PERIOD</th>
                  <th>FORECAST DEMAND</th>
                  <th>RECOMMENDED STOCK</th>
                  <th>REORDER QTY.</th>
                  <th>STATUS</th>
                  <th>METHOD</th>
                </tr>
              </thead>

              <tbody id="demandForecastTableBody"></tbody>
            </table>
          </div>

          <div id="demandForecastEmpty" class="forecast-empty" style="display:none;">
            <div class="forecast-empty-icon">
              <i class="fa-solid fa-chart-line"></i>
            </div>

            <h3>No Forecast Data Available</h3>

            <p>
              Add inventory items and record Stock Out movements from Page 1 to build the testing data needed for demand forecasting.
            </p>
          </div>
        </div>

        <div class="forecast-metrics">
          <div class="forecast-metric-card">
            <div class="forecast-metric-card-header">
              <div class="forecast-metric-icon">
                <i class="fa-solid fa-percent"></i>
              </div>

              <div>
                <h4>MAPE</h4>
                <p>Mean Absolute Percentage Error</p>
              </div>
            </div>

            <div class="forecast-metric-value pending" id="forecastMape">
              Not enough historical data
            </div>
          </div>

          <div class="forecast-metric-card">
            <div class="forecast-metric-card-header">
              <div class="forecast-metric-icon">
                <i class="fa-solid fa-square-root-variable"></i>
              </div>

              <div>
                <h4>RMSE</h4>
                <p>Root Mean Square Error</p>
              </div>
            </div>

            <div class="forecast-metric-value pending" id="forecastRmse">
              Not enough historical data
            </div>
          </div>
        </div>

        <div class="forecast-ai-ready">
          <div class="forecast-ai-icon">
            <i class="fa-solid fa-brain"></i>
          </div>

          <div class="forecast-ai-content">
            <strong>AI Forecasting Integration Ready</strong>

            <p id="forecastAiDescription">
              Testing mode currently uses a 3-period moving average. The Page 3 structure is prepared so an AI or machine-learning forecasting model can be connected later without changing the inventory workflow.
            </p>
          </div>

          <div class="forecast-ai-status">
            AI Not Connected
          </div>
        </div>
      </div>
    </div>
  `;

  const forecastTableBody = document.getElementById("demandForecastTableBody");

  const forecastEmpty = document.getElementById("demandForecastEmpty");

  const forecastTotalItems = document.getElementById("forecastTotalItems");

  const forecastReadyItems = document.getElementById("forecastReadyItems");

  const forecastReorderItems = document.getElementById("forecastReorderItems");

  const forecastPeriod = document.getElementById("forecastPeriod");

  const forecastMape = document.getElementById("forecastMape");

  const forecastRmse = document.getElementById("forecastRmse");

  const forecastHeaderDescription = document.getElementById(
    "forecastHeaderDescription",
  );

  const forecastSectionDescription = document.getElementById(
    "forecastSectionDescription",
  );

  const forecastMethodBadge = document.getElementById("forecastMethodBadge");

  const forecastPeriodLabel = document.getElementById("forecastPeriodLabel");

  const forecastAverageHeader = document.getElementById(
    "forecastAverageHeader",
  );

  const forecastAiDescription = document.getElementById(
    "forecastAiDescription",
  );

  function getValidDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function getMonthKey(value) {
    const date = getValidDate(value);

    if (!date) {
      return null;
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  }

  function getMonthLabel(monthKey) {
    if (!monthKey) {
      return "Next Month";
    }

    const parts = monthKey.split("-");

    if (parts.length !== 2) {
      return "Next Month";
    }

    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  function getLatestThreeMonths() {
    const now = new Date();

    const months = [];

    for (let offset = 2; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

      months.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    return months;
  }

  function getNextMonthKey() {
    const now = new Date();

    const date = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  }

  function getStockOutMovements(itemId) {
    return shared
      .getMovements()
      .filter(
        (movement) =>
          String(movement.itemId) === String(itemId) &&
          movement.type === "stock-out",
      )
      .map((movement, index) => ({
        ...movement,
        testingIndex: index,
        testingQuantity: Math.max(0, Number(movement.quantity || 0)),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();

        const dateB = new Date(b.date || 0).getTime();

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return Number(a.testingIndex || 0) - Number(b.testingIndex || 0);
      });
  }

  function buildTestingUsage(itemId) {
    const stockOutMovements = getStockOutMovements(itemId);

    const periods = stockOutMovements.map((movement, index) => ({
      period: index + 1,
      quantity: movement.testingQuantity,
      date: movement.date,
      movement,
    }));

    return {
      periods,
      latestPeriods: periods.slice(-TESTING_PERIOD_COUNT),
    };
  }

  function buildMonthlyUsage(itemId) {
    const movements = shared.getMovements();

    const monthlyUsage = {};

    const latestThreeMonths = getLatestThreeMonths();

    latestThreeMonths.forEach((monthKey) => {
      monthlyUsage[monthKey] = 0;
    });

    movements
      .filter(
        (movement) =>
          String(movement.itemId) === String(itemId) &&
          movement.type === "stock-out",
      )
      .forEach((movement) => {
        const monthKey = getMonthKey(movement.date);

        if (!monthKey) {
          return;
        }

        if (!Object.prototype.hasOwnProperty.call(monthlyUsage, monthKey)) {
          return;
        }

        monthlyUsage[monthKey] += Number(movement.quantity || 0);
      });

    return {
      monthlyUsage,
      latestThreeMonths,
    };
  }

  function calculateTestingForecast(item) {
    const history = buildTestingUsage(item.id);

    const values = history.latestPeriods.map((period) =>
      Number(period.quantity || 0),
    );

    const periodsWithUsage = values.filter((value) => value > 0).length;

    const totalUsage = values.reduce((total, value) => total + value, 0);

    const averageUsage = values.length > 0 ? totalUsage / values.length : 0;

    const hasEnoughData = history.periods.length >= TESTING_PERIOD_COUNT;

    const forecastDemand = hasEnoughData ? Math.ceil(averageUsage) : null;

    const currentStock = Math.max(
      0,
      Number(item.stock ?? item.currentStock ?? 0),
    );

    const minimumStock = Math.max(
      0,
      Number(item.minimumStock ?? item.minimum ?? 0),
    );

    const recommendedStock = hasEnoughData
      ? Math.max(forecastDemand, minimumStock)
      : minimumStock;

    const reorderQuantity = hasEnoughData
      ? Math.max(0, recommendedStock - currentStock)
      : Math.max(0, minimumStock - currentStock);

    let status = "insufficient-data";

    if (hasEnoughData) {
      status = currentStock < recommendedStock ? "reorder" : "sufficient";
    } else if (currentStock < minimumStock) {
      status = "reorder";
    }

    return {
      item,
      periods: history.periods,
      latestPeriods: history.latestPeriods,
      values,
      periodsWithUsage,
      totalUsage,
      averageUsage,
      hasEnoughData,
      forecastDemand,
      currentStock,
      minimumStock,
      recommendedStock,
      reorderQuantity,
      status,
    };
  }

  function calculateProductionForecast(item) {
    const history = buildMonthlyUsage(item.id);

    const values = history.latestThreeMonths.map(
      (monthKey) => history.monthlyUsage[monthKey] || 0,
    );

    const monthsWithUsage = values.filter((value) => value > 0).length;

    const totalUsage = values.reduce((total, value) => total + value, 0);

    const averageUsage = totalUsage / values.length;

    const hasEnoughData = monthsWithUsage === TESTING_PERIOD_COUNT;

    const forecastDemand = hasEnoughData ? Math.ceil(averageUsage) : null;

    const currentStock = Math.max(
      0,
      Number(item.stock ?? item.currentStock ?? 0),
    );

    const minimumStock = Math.max(
      0,
      Number(item.minimumStock ?? item.minimum ?? 0),
    );

    const recommendedStock = hasEnoughData
      ? Math.max(forecastDemand, minimumStock)
      : minimumStock;

    const reorderQuantity = hasEnoughData
      ? Math.max(0, recommendedStock - currentStock)
      : Math.max(0, minimumStock - currentStock);

    let status = "insufficient-data";

    if (hasEnoughData) {
      status = currentStock < recommendedStock ? "reorder" : "sufficient";
    } else if (currentStock < minimumStock) {
      status = "reorder";
    }

    return {
      item,
      values,
      monthsWithUsage,
      totalUsage,
      averageUsage,
      hasEnoughData,
      forecastDemand,
      currentStock,
      minimumStock,
      recommendedStock,
      reorderQuantity,
      status,
    };
  }

  function calculateForecast(item) {
    if (TESTING_MODE) {
      return calculateTestingForecast(item);
    }

    return calculateProductionForecast(item);
  }

  function buildMetricDataset() {
    const items = shared.getItems();

    const errors = [];

    if (TESTING_MODE) {
      items.forEach((item) => {
        const periods = buildTestingUsage(item.id).periods;

        if (periods.length < TESTING_PERIOD_COUNT + 1) {
          return;
        }

        for (
          let index = TESTING_PERIOD_COUNT;
          index < periods.length;
          index += 1
        ) {
          const previousPeriods = periods.slice(
            index - TESTING_PERIOD_COUNT,
            index,
          );

          if (previousPeriods.length !== TESTING_PERIOD_COUNT) {
            continue;
          }

          const actualValue = Number(periods[index].quantity || 0);

          const predictedValue =
            previousPeriods.reduce(
              (total, period) => total + Number(period.quantity || 0),
              0,
            ) / TESTING_PERIOD_COUNT;

          if (actualValue > 0) {
            const percentageError =
              Math.abs((actualValue - predictedValue) / actualValue) * 100;

            errors.push({
              actual: actualValue,
              predicted: predictedValue,
              percentageError,
            });
          }
        }
      });

      return errors;
    }

    const movements = shared.getMovements();

    const monthlyData = {};

    movements.forEach((movement) => {
      if (movement.type !== "stock-out") {
        return;
      }

      const monthKey = getMonthKey(movement.date);

      if (!monthKey) {
        return;
      }

      const itemId = String(movement.itemId);

      if (!monthlyData[itemId]) {
        monthlyData[itemId] = {};
      }

      if (!monthlyData[itemId][monthKey]) {
        monthlyData[itemId][monthKey] = 0;
      }

      monthlyData[itemId][monthKey] += Number(movement.quantity || 0);
    });

    items.forEach((item) => {
      const itemData = monthlyData[String(item.id)] || {};

      const monthKeys = Object.keys(itemData).sort();

      if (monthKeys.length < TESTING_PERIOD_COUNT + 1) {
        return;
      }

      for (
        let index = TESTING_PERIOD_COUNT;
        index < monthKeys.length;
        index += 1
      ) {
        const previousMonths = monthKeys.slice(
          index - TESTING_PERIOD_COUNT,
          index,
        );

        if (previousMonths.length !== TESTING_PERIOD_COUNT) {
          continue;
        }

        const actualMonth = monthKeys[index];

        const previousValues = previousMonths.map((monthKey) =>
          Number(itemData[monthKey] || 0),
        );

        const actualValue = Number(itemData[actualMonth] || 0);

        const predictedValue =
          previousValues.reduce((total, value) => total + value, 0) /
          TESTING_PERIOD_COUNT;

        if (actualValue > 0) {
          const percentageError =
            Math.abs((actualValue - predictedValue) / actualValue) * 100;

          errors.push({
            actual: actualValue,
            predicted: predictedValue,
            percentageError,
          });
        }
      }
    });

    return errors;
  }

  function calculateMAPE() {
    const dataset = buildMetricDataset();

    if (dataset.length === 0) {
      return null;
    }

    const total = dataset.reduce(
      (sum, entry) => sum + entry.percentageError,
      0,
    );

    return total / dataset.length;
  }

  function calculateRMSE() {
    const dataset = buildMetricDataset();

    if (dataset.length === 0) {
      return null;
    }

    const squaredErrors = dataset.map((entry) => {
      const error = entry.actual - entry.predicted;

      return error * error;
    });

    const meanSquaredError =
      squaredErrors.reduce((sum, value) => sum + value, 0) /
      squaredErrors.length;

    return Math.sqrt(meanSquaredError);
  }

  function renderMetrics() {
    const mape = calculateMAPE();

    const rmse = calculateRMSE();

    if (mape === null) {
      forecastMape.textContent = "Not enough historical data";
      forecastMape.classList.add("pending");
    } else {
      forecastMape.textContent = `${mape.toFixed(2)}%`;
      forecastMape.classList.remove("pending");
    }

    if (rmse === null) {
      forecastRmse.textContent = "Not enough historical data";
      forecastRmse.classList.add("pending");
    } else {
      forecastRmse.textContent = rmse.toFixed(2);
      forecastRmse.classList.remove("pending");
    }
  }

  function updatePageLabels() {
    if (TESTING_MODE) {
      forecastHeaderDescription.textContent =
        "Estimate the next testing period's supply demand using Stock Out usage and the current inventory level.";

      forecastSectionDescription.textContent =
        "Testing mode uses the latest three Stock Out records as three testing periods.";

      forecastMethodBadge.innerHTML = `
        <i class="fa-solid fa-chart-line"></i>
        3-Period Moving Average
      `;

      forecastPeriodLabel.textContent = "FORECAST PERIOD";

      forecastPeriod.textContent = "Next Testing Period";

      forecastAverageHeader.textContent = "AVG. USAGE / PERIOD";

      forecastAiDescription.textContent =
        "Testing mode currently uses a 3-period moving average. The Page 3 structure is prepared so an AI or machine-learning forecasting model can be connected later without changing the inventory workflow.";
    } else {
      forecastHeaderDescription.textContent =
        "Estimate the next month's supply demand using historical Stock Out usage and the current inventory level.";

      forecastSectionDescription.textContent =
        "Forecast demand is based on the latest three calendar months of actual Stock Out usage.";

      forecastMethodBadge.innerHTML = `
        <i class="fa-solid fa-chart-line"></i>
        3-Month Moving Average
      `;

      forecastPeriodLabel.textContent = "FORECAST PERIOD";

      forecastPeriod.textContent = getMonthLabel(getNextMonthKey());

      forecastAverageHeader.textContent = "AVG. MONTHLY USAGE";

      forecastAiDescription.textContent =
        "The current forecasting result uses the 3-month moving average. The Page 3 structure is prepared so an AI or machine-learning forecasting model can be connected later without changing the inventory workflow.";
    }
  }

  function renderForecast() {
    const items = shared.getItems();

    forecastTableBody.innerHTML = "";

    forecastTotalItems.textContent = items.length;

    const forecastData = items.map((item) => calculateForecast(item));

    const readyItems = forecastData.filter((data) => data.hasEnoughData).length;

    const reorderItems = forecastData.filter(
      (data) => data.status === "reorder",
    ).length;

    forecastReadyItems.textContent = readyItems;

    forecastReorderItems.textContent = reorderItems;

    if (TESTING_MODE) {
      forecastPeriod.textContent = "Next Testing Period";
    } else {
      forecastPeriod.textContent = getMonthLabel(getNextMonthKey());
    }

    if (forecastData.length === 0) {
      forecastEmpty.style.display = "flex";

      renderMetrics();

      return;
    }

    forecastEmpty.style.display = "none";

    forecastData.forEach((data) => {
      const row = document.createElement("tr");

      const itemUnit = shared.escapeHTML(data.item.unit || "unit");

      const itemName = shared.escapeHTML(data.item.name || "Inventory Item");

      const itemId = shared.escapeHTML(data.item.id || "");

      let statusMarkup = "";

      if (data.status === "reorder") {
        statusMarkup = `
          <span class="demand-status reorder">
            Reorder Recommended
          </span>
        `;
      } else if (data.status === "sufficient") {
        statusMarkup = `
          <span class="demand-status sufficient">
            Sufficient
          </span>
        `;
      } else {
        statusMarkup = `
          <span class="demand-status insufficient-data">
            Need More Data
          </span>
        `;
      }

      const forecastMarkup = data.hasEnoughData
        ? `
          <span class="demand-number blue">
            ${data.forecastDemand}
          </span>

          <span class="demand-unit">
            ${itemUnit}
          </span>
        `
        : `
          <span class="demand-number">
            —
          </span>
        `;

      const averageUnitText = TESTING_MODE
        ? `${itemUnit} / period`
        : `${itemUnit} / month`;

      row.innerHTML = `
        <td>
          <div class="demand-item-cell">
            <div class="demand-item-icon">
              <i class="fa-solid fa-box"></i>
            </div>

            <div class="demand-item-info">
              <span class="demand-item-name">
                ${itemName}
              </span>

              <span class="demand-item-id">
                ${itemId}
              </span>
            </div>
          </div>
        </td>

        <td>
          <span class="demand-number">
            ${data.currentStock}
          </span>

          <span class="demand-unit">
            ${itemUnit}
          </span>
        </td>

        <td>
          <span class="demand-number green">
            ${data.averageUsage.toFixed(2)}
          </span>

          <span class="demand-unit">
            ${averageUnitText}
          </span>
        </td>

        <td>
          ${forecastMarkup}
        </td>

        <td>
          <span class="demand-number">
            ${data.recommendedStock}
          </span>

          <span class="demand-unit">
            ${itemUnit}
          </span>
        </td>

        <td>
          <span class="demand-number ${data.reorderQuantity > 0 ? "blue" : ""}">
            ${data.reorderQuantity}
          </span>

          <span class="demand-unit">
            ${itemUnit}
          </span>
        </td>

        <td>
          ${statusMarkup}
        </td>

        <td>
          <span class="demand-method">
            <i class="fa-solid fa-chart-line"></i>
            ${
              TESTING_MODE
                ? "3-Period Moving Average"
                : "3-Month Moving Average"
            }
          </span>
        </td>
      `;

      forecastTableBody.appendChild(row);
    });

    renderMetrics();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === shared.ITEMS_KEY || event.key === shared.MOVEMENTS_KEY) {
      renderForecast();
    }
  });

  window.addEventListener(shared.DATA_CHANGED_EVENT, () => {
    renderForecast();
  });

  updatePageLabels();

  renderForecast();
});
