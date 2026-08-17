document.addEventListener("DOMContentLoaded", () => {
  const shared = window.InventoryShared;

  if (!shared) {
    console.error(
      "InventoryShared not found. Make sure inventory.js is loaded before moving_average.js.",
    );

    return;
  }

  const forecastTableBody = document.getElementById("forecastTableBody");

  const forecastEmpty = document.getElementById("forecastEmpty");

  const refreshForecastBtn = document.getElementById("refreshForecastBtn");

  if (refreshForecastBtn) {
    refreshForecastBtn.remove();
  }

  const forecastingPrototype = document.querySelector(
    "#inventoryPage2 .forecasting-prototype",
  );

  if (forecastingPrototype) {
    const prototypeHeader =
      forecastingPrototype.querySelector(".prototype-header");

    if (prototypeHeader) {
      const prototypeLabel = prototypeHeader.querySelector(".prototype-label");

      const heading = prototypeHeader.querySelector("h3");

      const description = prototypeHeader.querySelector("p");

      if (prototypeLabel) {
        prototypeLabel.textContent = "HISTORICAL USAGE";
      }

      if (heading) {
        heading.textContent = "Historical Usage Analysis";
      }

      if (description) {
        description.textContent =
          "Review monthly stock-out history and usage patterns to understand how dental supplies are consumed over time.";
      }

      const tooltip = document.createElement("div");

      tooltip.className = "historical-usage-tooltip";

      tooltip.innerHTML = `
        <button
          type="button"
          class="historical-usage-info"
          aria-label="About Historical Usage Analysis"
          title="About Historical Usage Analysis"
        >
          <i class="fa-solid fa-circle-info"></i>
        </button>

        <div class="historical-usage-tooltip-content">
          <strong>How Historical Usage Works</strong>

          <p>
            This page shows how much of each inventory item was actually
            consumed based on recorded <strong>Stock Out</strong> movements.
          </p>

          <p>
            Stock In means the clinic received or restocked supplies.
            Stock Out means the clinic used supplies.
          </p>

          <p>
            The system groups all Stock Out records by month. This means
            an item can be used many times during a month, but all of those
            Stock Out quantities are added together to get that month's
            total usage.
          </p>

          <p>
            The system uses the <strong>latest 3 months</strong> to calculate
            the moving average.
          </p>

          <p>
            For example:
            January + February + March = Forecast for April.
          </p>

          <p>
            When April becomes available, the window moves:
            February + March + April = Forecast for May.
          </p>

          <p>
            Click <strong>History</strong> to see the monthly usage summary
            and the actual Stock In and Stock Out records for the item.
          </p>

          <p>
            This is the current local forecasting method. It is not yet an
            AI or machine learning model.
          </p>
        </div>
      `;

      prototypeHeader.appendChild(tooltip);
    }
  }

  const forecastTable = document.querySelector(
    "#inventoryPage2 .forecast-table",
  );

  if (forecastTable) {
    const headerCells = forecastTable.querySelectorAll("thead th");

    headerCells.forEach((headerCell) => {
      const headerText = headerCell.textContent.trim().toUpperCase();

      if (headerText === "USAGE RECORDS") {
        headerCell.textContent = "MONTHS WITH DATA";

        headerCell.title =
          "Shows how many of the latest three months contain recorded Stock Out usage.";
      }

      if (headerText === "TOTAL USED") {
        headerCell.textContent = "3-MONTH TOTAL";

        headerCell.title =
          "Total quantity consumed during the latest three-month period.";
      }

      if (headerText === "AVG. USAGE") {
        headerCell.textContent = "AVG. MONTHLY USAGE";

        headerCell.title =
          "Average amount consumed per month based on the latest three months.";
      }

      if (headerText === "EST. NEXT PERIOD") {
        headerCell.textContent = "EST. NEXT MONTH";

        headerCell.title =
          "Estimated quantity needed for the next month using the 3-month moving average.";
      }

      if (headerText === "DATA STATUS") {
        headerCell.textContent = "HISTORY";

        headerCell.title =
          "View the monthly usage summary and complete Stock In and Stock Out history for this item.";
      }
    });
  }

  function getValidDate(dateValue) {
    if (!dateValue) {
      return null;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function getMonthKey(dateValue) {
    const date = getValidDate(dateValue);

    if (!date) {
      return null;
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  }

  function getMonthLabel(monthKey) {
    if (!monthKey) {
      return "Unknown";
    }

    const parts = monthKey.split("-");

    if (parts.length !== 2) {
      return monthKey;
    }

    const year = Number(parts[0]);

    const month = Number(parts[1]);

    if (!year || !month) {
      return monthKey;
    }

    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  function getLatestThreeMonthKeys() {
    const now = new Date();

    const monthKeys = [];

    for (let offset = 2; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

      const year = date.getFullYear();

      const month = String(date.getMonth() + 1).padStart(2, "0");

      monthKeys.push(`${year}-${month}`);
    }

    return monthKeys;
  }

  function buildHistoricalData() {
    const items = shared.getItems();

    const movements = shared.getMovements();

    const latestThreeMonths = getLatestThreeMonthKeys();

    return items.map((item) => {
      const itemMovements = movements.filter(
        (movement) => String(movement.itemId) === String(item.id),
      );

      const stockOutMovements = itemMovements.filter(
        (movement) => movement.type === "stock-out",
      );

      const monthlyUsage = {};

      latestThreeMonths.forEach((monthKey) => {
        monthlyUsage[monthKey] = 0;
      });

      stockOutMovements.forEach((movement) => {
        const monthKey = getMonthKey(movement.date);

        if (!monthKey) {
          return;
        }

        if (!Object.prototype.hasOwnProperty.call(monthlyUsage, monthKey)) {
          return;
        }

        monthlyUsage[monthKey] += Number(movement.quantity || 0);
      });

      const monthlyValues = latestThreeMonths.map(
        (monthKey) => monthlyUsage[monthKey],
      );

      const totalUsed = monthlyValues.reduce(
        (total, quantity) => total + quantity,
        0,
      );

      const averageMonthlyUsage = totalUsed / latestThreeMonths.length;

      const monthsWithUsage = monthlyValues.filter(
        (quantity) => quantity > 0,
      ).length;

      const usageRecords = stockOutMovements.filter((movement) => {
        const monthKey = getMonthKey(movement.date);

        return latestThreeMonths.includes(monthKey);
      }).length;

      const hasThreeMonthsOfData = monthsWithUsage === latestThreeMonths.length;

      return {
        item,
        itemMovements,
        stockOutMovements,
        latestThreeMonths,
        monthlyUsage,
        monthlyValues,
        totalUsed,
        averageMonthlyUsage,
        monthsWithUsage,
        usageRecords,
        hasThreeMonthsOfData,
        estimate: hasThreeMonthsOfData ? Math.ceil(averageMonthlyUsage) : null,
      };
    });
  }

  if (!document.getElementById("historicalUsagePageStyles")) {
    const style = document.createElement("style");

    style.id = "historicalUsagePageStyles";

    style.textContent = `
      #inventoryPage2 .prototype-header {
        position: relative;
      }

      #inventoryPage2 .historical-usage-tooltip {
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        vertical-align: middle;
      }

      #inventoryPage2 .historical-usage-info {
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid #dce6df;
        border-radius: 50%;
        background: #f7faf8;
        color: #176b38;
        font-size: 0.72rem;
        cursor: help;
        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          color 0.2s ease;
      }

      #inventoryPage2 .historical-usage-info:hover,
      #inventoryPage2 .historical-usage-info:focus {
        background: #eaf7ef;
        border-color: #bcd8c7;
        color: #12552d;
        outline: none;
      }

      #inventoryPage2 .historical-usage-tooltip-content {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        z-index: 1000;
        width: 350px;
        padding: 15px 16px;
        border: 1px solid #dfe8e2;
        border-radius: 12px;
        background: #ffffff;
        box-shadow:
          0 14px 35px rgba(22, 39, 29, 0.14);
        color: #637068;
        font-family: "Poppins", sans-serif;
        font-size: 0.62rem;
        line-height: 1.55;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-4px);
        transition:
          opacity 0.18s ease,
          visibility 0.18s ease,
          transform 0.18s ease;
      }

      #inventoryPage2 .historical-usage-tooltip-content::before {
        content: "";
        position: absolute;
        top: -6px;
        right: 8px;
        width: 11px;
        height: 11px;
        border-top: 1px solid #dfe8e2;
        border-left: 1px solid #dfe8e2;
        background: #ffffff;
        transform: rotate(45deg);
      }

      #inventoryPage2
      .historical-usage-tooltip:hover
      .historical-usage-tooltip-content,
      #inventoryPage2
      .historical-usage-tooltip:focus-within
      .historical-usage-tooltip-content {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(0);
      }

      #inventoryPage2 .forecast-history-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 31px;
        padding: 0 11px;
        border: 1px solid #d9e7de;
        border-radius: 8px;
        background: #f7fbf8;
        color: #176b38;
        font-family: "Poppins", sans-serif;
        font-size: 0.59rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background 0.18s ease,
          border-color 0.18s ease,
          color 0.18s ease,
          transform 0.18s ease;
      }

      #inventoryPage2 .forecast-history-btn:hover {
        background: #eaf7ef;
        border-color: #bcd8c7;
        color: #12552d;
        transform: translateY(-1px);
      }

      #inventoryPage2 .forecast-history-btn:focus {
        outline: 2px solid rgba(23, 107, 56, 0.18);
        outline-offset: 2px;
      }

      #inventoryPage2 .forecast-history-btn.no-history {
        background: #fafbfa;
        border-color: #e4e9e6;
        color: #89958f;
      }

      #inventoryPage2 .forecast-history-btn.no-history:hover {
        background: #f5f7f6;
        border-color: #d9e1dc;
        color: #65736b;
      }

      .inventory-history-modal {
        position: fixed;
        inset: 0;
        z-index: 30000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(11, 22, 15, 0.45);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition:
          opacity 0.2s ease,
          visibility 0.2s ease;
        box-sizing: border-box;
      }

      .inventory-history-modal.active {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .inventory-history-card {
        width: 100%;
        max-width: 950px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        padding: 24px;
        border: 1px solid #e2e9e4;
        border-radius: 18px;
        background: #ffffff;
        box-shadow:
          0 25px 70px rgba(0, 0, 0, 0.18);
        transform: translateY(10px) scale(0.98);
        transition: transform 0.2s ease;
        box-sizing: border-box;
      }

      .inventory-history-modal.active .inventory-history-card {
        transform: translateY(0) scale(1);
      }

      .inventory-history-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 17px;
        border-bottom: 1px solid #edf1ee;
      }

      .inventory-history-title-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .inventory-history-icon {
        width: 46px;
        height: 46px;
        min-width: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 13px;
        background: #eaf7ef;
        color: #176b38;
        font-size: 0.95rem;
      }

      .inventory-history-eyebrow {
        display: block;
        margin-bottom: 3px;
        color: #176b38;
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .inventory-history-title {
        margin: 0;
        color: #17251d;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .inventory-history-subtitle {
        margin-top: 4px;
        color: #8a958f;
        font-size: 0.58rem;
      }

      .inventory-history-close {
        width: 34px;
        height: 34px;
        min-width: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e4eae6;
        border-radius: 9px;
        background: #ffffff;
        color: #718078;
        cursor: pointer;
      }

      .inventory-history-close:hover {
        background: #f4f7f5;
        border-color: #d9e2dc;
        color: #26352d;
      }

      .inventory-history-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .inventory-history-summary-card {
        padding: 12px;
        border: 1px solid #edf1ee;
        border-radius: 11px;
        background: #fafcfb;
      }

      .inventory-history-summary-card span {
        display: block;
        color: #89958f;
        font-size: 0.54rem;
        font-weight: 600;
      }

      .inventory-history-summary-card strong {
        display: block;
        margin-top: 4px;
        color: #26352d;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .inventory-history-summary-card strong.green {
        color: #176b38;
      }

      .inventory-history-summary-card strong.blue {
        color: #3b72d9;
      }

      .inventory-history-explanation {
        margin-top: 14px;
        padding: 13px 14px;
        border: 1px solid #dcebe2;
        border-radius: 11px;
        background: #f7fbf8;
        color: #617068;
        font-size: 0.61rem;
        line-height: 1.55;
      }

      .inventory-history-explanation strong {
        color: #176b38;
      }

      .inventory-history-months {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .inventory-history-month-card {
        padding: 13px;
        border: 1px solid #edf1ee;
        border-radius: 11px;
        background: #ffffff;
      }

      .inventory-history-month-card .month-name {
        display: block;
        color: #7c8981;
        font-size: 0.55rem;
        font-weight: 600;
      }

      .inventory-history-month-card strong {
        display: block;
        margin-top: 4px;
        color: #26352d;
        font-size: 0.85rem;
      }

      .inventory-history-month-card .month-unit {
        color: #8b958f;
        font-size: 0.54rem;
      }

      .inventory-history-section {
        margin-top: 20px;
      }

      .inventory-history-section-title {
        margin: 0 0 9px;
        color: #26352d;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .inventory-history-table-wrapper {
        overflow-x: auto;
        border: 1px solid #edf1ee;
        border-radius: 12px;
      }

      .inventory-history-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      .inventory-history-table th {
        padding: 11px 12px;
        border-bottom: 1px solid #e8eeea;
        background: #fafcfb;
        color: #7d8982;
        font-size: 0.54rem;
        font-weight: 700;
        text-align: left;
        white-space: nowrap;
      }

      .inventory-history-table td {
        padding: 12px;
        border-bottom: 1px solid #f0f3f1;
        color: #526158;
        font-size: 0.58rem;
        vertical-align: middle;
      }

      .inventory-history-table tr:last-child td {
        border-bottom: none;
      }

      .inventory-history-type {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 0.53rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .inventory-history-type.stock-in {
        background: #eaf8ef;
        color: #267b47;
      }

      .inventory-history-type.stock-out {
        background: #fff5dc;
        color: #b67a08;
      }

      .inventory-history-quantity {
        font-weight: 700;
        color: #26352d;
      }

      .inventory-history-date {
        white-space: nowrap;
      }

      .inventory-history-reason {
        max-width: 220px;
        overflow-wrap: anywhere;
      }

      .inventory-history-empty {
        padding: 25px 18px;
        border: 1px dashed #d5e1d9;
        border-radius: 12px;
        background: #f8fbf9;
        color: #87938c;
        font-size: 0.61rem;
        line-height: 1.5;
        text-align: center;
      }

      .inventory-history-empty i {
        display: block;
        margin-bottom: 8px;
        color: #a3afa8;
        font-size: 1.2rem;
      }

      .inventory-history-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 18px;
        padding-top: 15px;
        border-top: 1px solid #edf1ee;
      }

      .inventory-history-close-btn {
        min-height: 39px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 14px;
        border: 1px solid #e0e8e3;
        border-radius: 10px;
        background: #ffffff;
        color: #314038;
        font-family: "Poppins", sans-serif;
        font-size: 0.64rem;
        font-weight: 600;
        cursor: pointer;
      }

      .inventory-history-close-btn:hover {
        background: #f4f7f5;
      }

      @media (max-width: 700px) {
        #inventoryPage2 .historical-usage-tooltip-content {
          position: fixed;
          top: auto;
          right: 12px;
          left: 12px;
          bottom: 20px;
          width: auto;
          max-width: none;
        }

        #inventoryPage2 .historical-usage-tooltip-content::before {
          display: none;
        }

        .inventory-history-modal {
          padding: 12px;
        }

        .inventory-history-card {
          max-height: calc(100vh - 24px);
          padding: 18px;
          border-radius: 15px;
        }

        .inventory-history-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .inventory-history-months {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 450px) {
        .inventory-history-summary {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  let historyModal = null;

  let activeHistoryItemId = null;

  function ensureHistoryModal() {
    if (historyModal) {
      return historyModal;
    }

    historyModal = document.createElement("div");

    historyModal.className = "inventory-history-modal";

    historyModal.setAttribute("aria-hidden", "true");

    historyModal.innerHTML = `
      <div
        class="inventory-history-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventoryHistoryTitle"
      >
        <div class="inventory-history-header">
          <div class="inventory-history-title-wrap">
            <div class="inventory-history-icon">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>

            <div>
              <span class="inventory-history-eyebrow">
                Inventory History
              </span>

              <h3
                class="inventory-history-title"
                id="inventoryHistoryTitle"
              >
                Item History
              </h3>

              <div
                class="inventory-history-subtitle"
                id="inventoryHistorySubtitle"
              ></div>
            </div>
          </div>

          <button
            type="button"
            class="inventory-history-close"
            id="inventoryHistoryClose"
            aria-label="Close history"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="inventoryHistoryContent"></div>

        <div class="inventory-history-footer">
          <button
            type="button"
            class="inventory-history-close-btn"
            id="inventoryHistoryCloseBtn"
          >
            <i class="fa-solid fa-check"></i>
            Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(historyModal);

    historyModal.addEventListener("click", (event) => {
      if (event.target === historyModal) {
        closeHistoryModal();
      }
    });

    historyModal
      .querySelector("#inventoryHistoryClose")
      .addEventListener("click", closeHistoryModal);

    historyModal
      .querySelector("#inventoryHistoryCloseBtn")
      .addEventListener("click", closeHistoryModal);

    return historyModal;
  }

  function formatHistoryDate(dateString) {
    const date = getValidDate(dateString);

    if (!date) {
      return "—";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function openHistoryModal(itemId) {
    const item = shared
      .getItems()
      .find((inventoryItem) => String(inventoryItem.id) === String(itemId));

    if (!item) {
      return;
    }

    activeHistoryItemId = item.id;

    const modal = ensureHistoryModal();

    const content = modal.querySelector("#inventoryHistoryContent");

    const title = modal.querySelector("#inventoryHistoryTitle");

    const subtitle = modal.querySelector("#inventoryHistorySubtitle");

    const historicalData = buildHistoricalData();

    const itemData = historicalData.find(
      (entry) => String(entry.item.id) === String(item.id),
    );

    if (!itemData) {
      return;
    }

    const {
      itemMovements,
      latestThreeMonths,
      monthlyUsage,
      totalUsed,
      averageMonthlyUsage,
      monthsWithUsage,
      hasThreeMonthsOfData,
      estimate,
    } = itemData;

    title.textContent = item.name || "Inventory Item";

    subtitle.textContent = `${item.category || "Inventory Item"} • ${
      item.unit || "Unit"
    }`;

    let explanation = "";

    if (monthsWithUsage === 0) {
      explanation = `
        No Stock Out usage has been recorded for this item during the
        latest three-month period. Because there is no recorded demand,
        the system cannot calculate a meaningful three-month moving
        average yet.
      `;
    } else if (!hasThreeMonthsOfData) {
      explanation = `
        This item currently has usage data in
        <strong>${monthsWithUsage} month${
          monthsWithUsage === 1 ? "" : "s"
        }</strong>
        of the latest three-month period.
        The system is still collecting historical data.
        Once all three months have actual usage data, the system can
        calculate the three-month moving average and estimate the
        next month's demand.
      `;
    } else {
      explanation = `
        The estimated next month demand is
        <strong>${estimate} ${shared.escapeHTML(item.unit || "")}</strong>.
        This comes from the latest three months of actual Stock Out
        usage. The total consumption was
        <strong>${totalUsed} ${shared.escapeHTML(item.unit || "")}</strong>,
        resulting in an average monthly usage of
        <strong>${averageMonthlyUsage.toFixed(2)} ${shared.escapeHTML(
          item.unit || "",
        )}</strong>.
      `;
    }

    content.innerHTML = `
      <div class="inventory-history-summary">
        <div class="inventory-history-summary-card">
          <span>MONTHS WITH DATA</span>

          <strong>
            ${monthsWithUsage} month${monthsWithUsage === 1 ? "" : "s"}
          </strong>
        </div>

        <div class="inventory-history-summary-card">
          <span>3-MONTH TOTAL</span>

          <strong>
            ${totalUsed}
            ${shared.escapeHTML(item.unit || "")}
          </strong>
        </div>

        <div class="inventory-history-summary-card">
          <span>AVG. MONTHLY USAGE</span>

          <strong class="green">
            ${averageMonthlyUsage.toFixed(2)}
            ${shared.escapeHTML(item.unit || "")}
          </strong>
        </div>

        <div class="inventory-history-summary-card">
          <span>EST. NEXT MONTH</span>

          <strong class="blue">
            ${
              estimate !== null
                ? `${estimate} ${shared.escapeHTML(item.unit || "")}`
                : "—"
            }
          </strong>
        </div>
      </div>

      <div class="inventory-history-explanation">
        <strong>Why is the result like this?</strong>
        ${explanation}
      </div>

      <div class="inventory-history-section">
        <h4 class="inventory-history-section-title">
          Last 3 Months Usage
        </h4>

        <div class="inventory-history-months">
          ${latestThreeMonths
            .map(
              (monthKey) => `
                <div class="inventory-history-month-card">
                  <span class="month-name">
                    ${shared.escapeHTML(getMonthLabel(monthKey))}
                  </span>

                  <strong>
                    ${monthlyUsage[monthKey]}
                  </strong>

                  <span class="month-unit">
                    ${shared.escapeHTML(item.unit || "")}
                    consumed
                  </span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="inventory-history-section">
        <h4 class="inventory-history-section-title">
          Stock Movement History
        </h4>

        ${
          itemMovements.length > 0
            ? `
              <div class="inventory-history-table-wrapper">
                <table class="inventory-history-table">
                  <thead>
                    <tr>
                      <th>DATE & TIME</th>
                      <th>MOVEMENT</th>
                      <th>QUANTITY</th>
                      <th>PREVIOUS STOCK</th>
                      <th>NEW STOCK</th>
                      <th>REASON</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itemMovements
                      .sort(
                        (a, b) =>
                          new Date(b.date || 0).getTime() -
                          new Date(a.date || 0).getTime(),
                      )
                      .map(
                        (movement) => `
                          <tr>
                            <td class="inventory-history-date">
                              ${shared.escapeHTML(
                                formatHistoryDate(movement.date),
                              )}
                            </td>

                            <td>
                              <span
                                class="inventory-history-type ${
                                  movement.type === "stock-in"
                                    ? "stock-in"
                                    : "stock-out"
                                }"
                              >
                                <i
                                  class="fa-solid ${
                                    movement.type === "stock-in"
                                      ? "fa-arrow-down"
                                      : "fa-arrow-up"
                                  }"
                                ></i>

                                ${
                                  movement.type === "stock-in"
                                    ? "Stock In"
                                    : "Stock Out"
                                }
                              </span>
                            </td>

                            <td>
                              <span class="inventory-history-quantity">
                                ${Number(movement.quantity) || 0}

                                ${shared.escapeHTML(item.unit || "")}
                              </span>
                            </td>

                            <td>
                              ${Number(movement.previousStock) || 0}

                              ${shared.escapeHTML(item.unit || "")}
                            </td>

                            <td>
                              ${Number(movement.newStock) || 0}

                              ${shared.escapeHTML(item.unit || "")}
                            </td>

                            <td class="inventory-history-reason">
                              ${shared.escapeHTML(
                                movement.reason || "No reason recorded",
                              )}
                            </td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="inventory-history-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>

                No stock movement history has been recorded for this
                item yet. Record a Stock In or Stock Out movement from
                Page 1 to build the item's historical record.
              </div>
            `
        }
      </div>
    `;

    modal.dataset.itemId = item.id;

    modal.classList.add("active");

    modal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      modal.querySelector("#inventoryHistoryClose")?.focus();
    }, 50);
  }

  function closeHistoryModal() {
    if (!historyModal) {
      return;
    }

    historyModal.classList.remove("active");

    historyModal.setAttribute("aria-hidden", "true");

    activeHistoryItemId = null;
  }

  function renderForecast() {
    const historicalData = buildHistoricalData();

    if (!forecastTableBody) {
      return;
    }

    forecastTableBody.innerHTML = "";

    if (historicalData.length === 0) {
      if (forecastEmpty) {
        forecastEmpty.hidden = false;

        forecastEmpty.style.display = "flex";
      }

      return;
    }

    if (forecastEmpty) {
      forecastEmpty.hidden = true;

      forecastEmpty.style.display = "none";
    }

    historicalData.forEach((data) => {
      const row = document.createElement("tr");

      const hasHistory = data.itemMovements.length > 0;

      const historyClass = hasHistory ? "" : "no-history";

      row.innerHTML = `
        <td>
          <div class="forecast-item-cell">
            <div class="forecast-item-icon">
              <i class="fa-solid fa-box"></i>
            </div>

            <span class="forecast-item-name">
              ${shared.escapeHTML(data.item.name)}
            </span>
          </div>
        </td>

        <td>
          <span
            class="forecast-number"
            title="Number of the latest three months that contain actual Stock Out usage."
          >
            ${data.monthsWithUsage}
          </span>

          <span class="forecast-unit">
            month${data.monthsWithUsage === 1 ? "" : "s"}
          </span>
        </td>

        <td>
          <span
            class="forecast-number"
            title="Total quantity consumed during the latest three-month period."
          >
            ${data.totalUsed}
          </span>

          <span class="forecast-unit">
            ${shared.escapeHTML(data.item.unit)}
          </span>
        </td>

        <td>
          <span
            class="forecast-average"
            title="Average amount consumed per month based on the latest three months."
          >
            ${data.averageMonthlyUsage.toFixed(2)}
          </span>

          <span class="forecast-unit">
            ${shared.escapeHTML(data.item.unit)}
            / month
          </span>
        </td>

        <td>
          ${
            data.hasThreeMonthsOfData
              ? `
                <span
                  class="forecast-estimate"
                  title="Three-month moving-average estimate for the next month."
                >
                  ${data.estimate}
                </span>

                <span class="forecast-unit">
                  ${shared.escapeHTML(data.item.unit)}
                </span>
              `
              : `
                <span
                  class="forecast-number"
                  title="The estimate will appear after all three months contain actual usage data."
                >
                  —
                </span>
              `
          }
        </td>

        <td>
          <button
            type="button"
            class="forecast-history-btn ${historyClass}"
            data-history-item-id="${shared.escapeHTML(data.item.id)}"
            aria-label="View history for ${shared.escapeHTML(data.item.name)}"
            title="${
              hasHistory
                ? "View the monthly usage and complete Stock In and Stock Out history for this item."
                : "View this item's history. No stock movement has been recorded yet."
            }"
          >
            <i class="fa-solid fa-clock-rotate-left"></i>

            ${hasHistory ? "History" : "No History"}
          </button>
        </td>
      `;

      forecastTableBody.appendChild(row);
    });
  }

  if (forecastTableBody) {
    forecastTableBody.addEventListener("click", (event) => {
      const historyButton = event.target.closest(".forecast-history-btn");

      if (!historyButton) {
        return;
      }

      const itemId = historyButton.dataset.historyItemId;

      if (!itemId) {
        return;
      }

      openHistoryModal(itemId);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === shared.ITEMS_KEY || event.key === shared.MOVEMENTS_KEY) {
      renderForecast();

      if (
        historyModal &&
        historyModal.classList.contains("active") &&
        activeHistoryItemId
      ) {
        openHistoryModal(activeHistoryItemId);
      }
    }
  });

  window.addEventListener(shared.DATA_CHANGED_EVENT, () => {
    renderForecast();

    if (
      historyModal &&
      historyModal.classList.contains("active") &&
      activeHistoryItemId
    ) {
      openHistoryModal(activeHistoryItemId);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHistoryModal();
    }
  });

  renderForecast();
});
