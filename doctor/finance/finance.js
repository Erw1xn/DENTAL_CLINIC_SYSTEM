const TRANSACTIONS_KEY = "finance_transactions";
const APPOINTMENTS_KEY = "appointments";
let transactions = [];
let collectionPeriod = "today";
let revenueMode = "today";
const expenseData = [
  {
    name: "Dental supplies",
    amount: 5000,
    color: "#0b8f4b",
  },
  {
    name: "Equipment",
    amount: 3000,
    color: "#2186d5",
  },
  {
    name: "Electricity",
    amount: 10000,
    color: "#11a89a",
  },
  {
    name: "Water",
    amount: 1500,
    color: "#f2a100",
  },
  {
    name: "Internet",
    amount: 1500,
    color: "#9a7b50",
  },
  {
    name: "Rent",
    amount: 30000,
    color: "#ef4d45",
  },
  {
    name: "Salaries",
    amount: 8000,
    color: "#7440d2",
  },
  {
    name: "Maintenance",
    amount: 5000,
    color: "#b3bdb8",
  },
];
document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();
  setupEvents();
  renderFinance();
});
function setupEvents() {
  const search = document.getElementById("transactionSearch");
  if (search) {
    search.addEventListener("input", renderTransactions);
  }
  const methodFilter = document.getElementById("paymentMethodFilter");
  if (methodFilter) {
    methodFilter.addEventListener("change", renderTransactions);
  }
  const dateFilter = document.getElementById("transactionDateFilter");
  if (dateFilter) {
    dateFilter.addEventListener("change", renderTransactions);
  }
  const revenueSwitch = document.getElementById("revenueSwitch");
  if (revenueSwitch) {
    revenueSwitch.addEventListener("click", toggleRevenueMode);
  }
  const monthlyRevenueSwitch = document.getElementById("monthlyRevenueSwitch");
  if (monthlyRevenueSwitch) {
    monthlyRevenueSwitch.addEventListener("click", () => {
      revenueMode = revenueMode === "today" ? "month" : "today";
      renderRevenueCard();
    });
  }
  document.querySelectorAll(".collection-tab").forEach((button) => {
    button.addEventListener("click", () => {
      collectionPeriod = button.dataset.period;
      document.querySelectorAll(".collection-tab").forEach((item) => {
        item.classList.remove("active");
      });
      button.classList.add("active");
      renderCollection();
    });
  });
  const recordButton = document.getElementById("recordPaymentButton");
  if (recordButton) {
    recordButton.addEventListener("click", openPaymentModal);
  }
  const closeButton = document.getElementById("closePaymentModal");
  if (closeButton) {
    closeButton.addEventListener("click", closePaymentModal);
  }
  const cancelButton = document.getElementById("cancelPaymentButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", closePaymentModal);
  }
  const saveButton = document.getElementById("savePaymentButton");
  if (saveButton) {
    saveButton.addEventListener("click", savePayment);
  }
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closePaymentModal();
      }
    });
  }
}
function loadTransactions() {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        transactions = parsed.map(normalizeTransaction);
        return;
      }
    } catch (error) {
      console.error("Unable to load finance transactions:", error);
    }
  }
  transactions = [
    {
      id: "TXN-36655739315",
      invoice: "INV-2026-0847",
      patient: "Maria Santos",
      service: "Tooth Filling / Pasta",
      date: "2026-08-19",
      time: "10:30",
      total: 2500,
      discount: 0,
      paid: 2500,
      method: "GCash",
    },
    {
      id: "TXN-36655739316",
      invoice: "INV-2026-0848",
      patient: "Angelo",
      service: "Dental Cleaning",
      date: "2026-08-19",
      time: "18:50",
      total: 2000,
      discount: 0,
      paid: 2000,
      method: "GCash",
    },
    {
      id: "TXN-36655739317",
      invoice: "INV-2026-0849",
      patient: "Erwin Jacaba",
      service: "Dental Cleaning",
      date: "2026-08-19",
      time: "09:15",
      total: 1700,
      discount: 0,
      paid: 1700,
      method: "Cash",
    },
    {
      id: "TXN-36655739318",
      invoice: "INV-2026-0850",
      patient: "John Cruz",
      service: "Tooth Extraction",
      date: "2026-08-18",
      time: "11:45",
      total: 3500,
      discount: 0,
      paid: 3500,
      method: "Card",
    },
    {
      id: "TXN-36655739319",
      invoice: "INV-2026-0851",
      patient: "Angela Reyes",
      service: "Root Canal",
      date: "2026-08-17",
      time: "14:00",
      total: 8500,
      discount: 0,
      paid: 8500,
      method: "Bank Transfer",
    },
    {
      id: "TXN-36655739320",
      invoice: "INV-2026-0852",
      patient: "Carlos Mendoza",
      service: "Braces Adjustment",
      date: "2026-08-16",
      time: "15:30",
      total: 1800,
      discount: 0,
      paid: 1800,
      method: "GCash",
    },
  ];
  saveTransactions();
}
function normalizeTransaction(item) {
  const total = Number(item.total) || 0;
  const discount = Number(item.discount) || 0;
  const paid = Number(item.paid) || 0;
  return {
    id: item.id || `TXN-${Date.now()}`,
    invoice: item.invoice || item.invoiceNumber || `INV-${Date.now()}`,
    patient: item.patient || item.patientName || "Unknown Patient",
    service: item.service || item.type || "Consultation",
    date: item.date || getTodayKey(),
    time: item.time || item.start || "10:00",
    total,
    discount,
    paid,
    method: item.method || item.paymentMethod || "Cash",
  };
}
function saveTransactions() {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}
function renderFinance() {
  renderRevenueCard();
  renderSummaryCards();
  renderTransactions();
  renderProcedureChart();
  renderRevenueExpenseChart();
  renderExpenseChart();
  renderCollection();
  renderAuditTrail();
}
function toggleRevenueMode() {
  revenueMode = revenueMode === "today" ? "month" : "today";
  renderRevenueCard();
}
function renderRevenueCard() {
  const title = document.getElementById("revenueCardTitle");
  const amount = document.getElementById("revenueAmount");
  const subtitle = document.getElementById("revenueSubtitle");
  const switchText = document.getElementById("revenueSwitchText");
  const todayRevenue = getTodayRevenue();
  const monthRevenue = getMonthlyRevenue();
  if (revenueMode === "today") {
    title.textContent = "Today's Revenue";
    amount.textContent = formatMoney(todayRevenue);
    subtitle.textContent = "Today's collection";
    switchText.textContent = "Today";
  } else {
    title.textContent = "Monthly Revenue";
    amount.textContent = formatMoney(monthRevenue);
    subtitle.textContent = getCurrentMonthLabel();
    switchText.textContent = "This Month";
  }
  const monthlyRevenue = document.getElementById("monthlyRevenueAmount");
  if (monthlyRevenue) {
    monthlyRevenue.textContent = formatMoney(monthRevenue);
  }
}
function renderSummaryCards() {
  const outstanding = transactions.reduce(
    (sum, transaction) => sum + getBalance(transaction),
    0,
  );
  const outstandingElement = document.getElementById("outstandingBalance");
  if (outstandingElement) {
    outstandingElement.textContent = formatMoney(outstanding);
  }
  const count = transactions.filter(
    (transaction) => getBalance(transaction) > 0,
  ).length;
  const subtitle = document.getElementById("outstandingSubtitle");
  if (subtitle) {
    subtitle.textContent = `${count} active balance${count === 1 ? "" : "s"}`;
  }
  const expenses = getMonthlyExpenses();
  const expensesElement = document.getElementById("monthlyExpenses");
  if (expensesElement) {
    expensesElement.textContent = formatMoney(expenses);
  }
  const expenseChange = document.getElementById("expenseChange");
  if (expenseChange) {
    expenseChange.textContent = "10% vs last month";
  }
  const monthLabel = document.getElementById("currentMonthLabel");
  if (monthLabel) {
    monthLabel.textContent = getCurrentMonthLabel();
  }
}
function getFilteredTransactions() {
  const search = (document.getElementById("transactionSearch")?.value || "")
    .trim()
    .toLowerCase();
  const method = document.getElementById("paymentMethodFilter")?.value || "all";
  const dateFilter =
    document.getElementById("transactionDateFilter")?.value || "all";
  return transactions
    .filter((transaction) => {
      if (!search) {
        return true;
      }
      return (
        transaction.patient.toLowerCase().includes(search) ||
        transaction.invoice.toLowerCase().includes(search) ||
        transaction.service.toLowerCase().includes(search)
      );
    })
    .filter((transaction) => {
      if (method === "all") {
        return true;
      }
      return transaction.method === method;
    })
    .filter((transaction) => {
      if (dateFilter === "all") {
        return true;
      }
      const date = new Date(
        `${transaction.date}T${transaction.time || "00:00"}`,
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateFilter === "today") {
        return transaction.date === getTodayKey();
      }
      if (dateFilter === "month") {
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth()
        );
      }
      if (dateFilter === "week") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return date >= sevenDaysAgo;
      }
      return true;
    })
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
function renderTransactions() {
  const body = document.getElementById("transactionsTableBody");
  if (!body) {
    return;
  }
  body.innerHTML = "";
  const filtered = getFilteredTransactions();
  const count = document.getElementById("transactionCount");
  if (count) {
    count.textContent = `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
  }
  if (!filtered.length) {
    body.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="empty-table"
                >
                    No transactions found.
                </td>
            </tr>
        `;
    return;
  }
  filtered.forEach((transaction) => {
    const row = document.createElement("tr");
    const status = getPaymentStatus(transaction);
    row.innerHTML = `
                <td>
                    <span class="invoice-number">
                        ${escapeHtml(transaction.invoice)}
                    </span>
                </td>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">
                            ${getInitials(transaction.patient)}
                        </div>
                        <div>
                            <span class="patient-name">
                                ${escapeHtml(transaction.patient)}
                            </span>
                            <span class="invoice-number">
                                ${escapeHtml(transaction.id)}
                            </span>
                        </div>
                    </div>
                </td>
                <td>
                    ${escapeHtml(transaction.service)}
                </td>
                <td>
                    <span class="date-main">
                        ${formatShortDate(transaction.date)}
                    </span>
                    <span class="date-time">
                        ${formatTime(transaction.time)}
                    </span>
                </td>
                <td class="money">
                    ${formatMoney(transaction.total)}
                </td>
                <td class="discount-money">
                    ${formatMoney(transaction.discount)}
                </td>
                <td class="money">
                    ${formatMoney(transaction.paid)}
                </td>
                <td class="balance-money">
                    ${formatMoney(getBalance(transaction))}
                </td>
                <td>
                    <span
                        class="status-badge
                        ${getStatusClass(status)}"
                    >
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="table-action"
                            title="View"
                            onclick="viewTransaction('${transaction.id}')"
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>
                        <button
                            type="button"
                            class="table-action"
                            title="Edit"
                            onclick="editTransaction('${transaction.id}')"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button
                            type="button"
                            class="table-action"
                            title="Delete"
                            onclick="deleteTransaction('${transaction.id}')"
                        >
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
    body.appendChild(row);
  });
}
function renderProcedureChart() {
  const container = document.getElementById("procedureChart");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  const procedures = {};
  transactions.forEach((transaction) => {
    const service = transaction.service;
    const amount = transaction.paid;
    procedures[service] = (procedures[service] || 0) + amount;
  });
  let data = Object.entries(procedures);
  if (!data.length) {
    data = [
      ["Cleaning", 0],
      ["Composite", 0],
      ["Extraction", 0],
      ["Crown", 0],
      ["Root Canal", 0],
      ["X-Ray", 0],
    ];
  }
  data.sort((a, b) => b[1] - a[1]);
  data = data.slice(0, 6);
  const max = Math.max(...data.map((item) => item[1]), 1);
  data.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "procedure-row";
    const percentage = (value / max) * 100;
    row.innerHTML = `
                <span class="procedure-name">
                    ${escapeHtml(shortenService(name))}
                </span>
                <div class="procedure-bar-bg">
                    <div
                        class="procedure-bar"
                        style="width:${percentage}%"
                    ></div>
                </div>
                <span class="procedure-value">
                    ${formatMoney(value)}
                </span>
            `;
    container.appendChild(row);
  });
}
function renderRevenueExpenseChart() {
  const svg = document.getElementById("revenueExpenseChart");
  if (!svg) {
    return;
  }
  svg.innerHTML = "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const revenue = months.map((_, index) => getRevenueForMonth(index));
  const expenses = [
    45000,
    52000,
    58000,
    47000,
    40000,
    46000,
    38000,
    getMonthlyExpenses(),
  ];
  const allValues = [...revenue, ...expenses];
  const maxValue = Math.max(...allValues, 1000);
  const width = 700;
  const height = 300;
  const left = 50;
  const right = 18;
  const top = 20;
  const bottom = 45;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const xStep = chartWidth / (months.length - 1);
  function yPosition(value) {
    return top + chartHeight - (value / maxValue) * chartHeight;
  }
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = top + (chartHeight / gridCount) * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", left);
    line.setAttribute("x2", width - right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-grid-line");
    svg.appendChild(line);
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", 4);
    label.setAttribute("y", y + 4);
    label.setAttribute("class", "chart-axis-label");
    label.textContent = formatCompactMoney(
      maxValue - (maxValue / gridCount) * i,
    );
    svg.appendChild(label);
  }
  months.forEach((month, index) => {
    const x = left + xStep * index;
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", x);
    label.setAttribute("y", height - 13);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-axis-label");
    label.textContent = month;
    svg.appendChild(label);
  });
  function makePoints(data) {
    return data.map((value, index) => {
      return {
        x: left + xStep * index,
        y: yPosition(value),
      };
    });
  }
  function makePath(points) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }
  const revenuePoints = makePoints(revenue);
  const expensePoints = makePoints(expenses);
  const revenuePath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  revenuePath.setAttribute("d", makePath(revenuePoints));
  revenuePath.setAttribute("class", "revenue-line");
  svg.appendChild(revenuePath);
  const expensePath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  expensePath.setAttribute("d", makePath(expensePoints));
  expensePath.setAttribute("class", "expense-line");
  svg.appendChild(expensePath);
  revenuePoints.forEach((point) => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 4);
    circle.setAttribute("class", "revenue-point");
    svg.appendChild(circle);
  });
  expensePoints.forEach((point) => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 4);
    circle.setAttribute("class", "expense-point");
    svg.appendChild(circle);
  });
}
function renderExpenseChart() {
  const list = document.getElementById("expenseCategoryList");
  const pie = document.getElementById("expensePieChart");
  if (!list || !pie) {
    return;
  }
  list.innerHTML = "";
  const total = expenseData.reduce((sum, item) => sum + item.amount, 0);
  let currentPercent = 0;
  const gradients = [];
  expenseData.forEach((item) => {
    const percentage = (item.amount / total) * 100;
    const end = currentPercent + percentage;
    gradients.push(`${item.color} ${currentPercent}% ${end}%`);
    currentPercent = end;
    const itemElement = document.createElement("div");
    itemElement.className = "expense-category";
    itemElement.innerHTML = `
                <span
                    class="expense-color"
                    style="background:${item.color}"
                ></span>
                <span>
                    ${escapeHtml(item.name)}:
                    ${formatMoney(item.amount)}
                    (${percentage.toFixed(1)}%)
                </span>
            `;
    list.appendChild(itemElement);
  });
  pie.style.background = `conic-gradient(${gradients.join(",")})`;
}
function renderCollection() {
  const list = document.getElementById("collectionList");
  const totalElement = document.getElementById("collectionTotal");
  const totalLabel = document.getElementById("collectionTotalLabel");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const methods = [
    {
      name: "Cash",
      icon: "fa-money-bill-wave",
      className: "cash",
    },
    {
      name: "GCash",
      icon: "fa-mobile-screen-button",
      className: "gcash",
    },
    {
      name: "Bank Transfer",
      icon: "fa-building-columns",
      className: "bank",
    },
    {
      name: "Card",
      icon: "fa-credit-card",
      className: "card",
    },
  ];
  let grandTotal = 0;
  methods.forEach((method) => {
    const methodTransactions = transactions.filter((transaction) => {
      if (transaction.method !== method.name) {
        return false;
      }
      if (collectionPeriod === "today") {
        return transaction.date === getTodayKey();
      }
      return isCurrentMonth(transaction.date);
    });
    const amount = methodTransactions.reduce(
      (sum, transaction) => sum + transaction.paid,
      0,
    );
    grandTotal += amount;
    const item = document.createElement("div");
    item.className = "collection-item";
    item.innerHTML = `
                <div
                    class="collection-icon
                    ${method.className}"
                >
                    <i class="fa-solid
                        ${method.icon}"></i>
                </div>
                <div class="collection-details">
                    <span class="collection-name">
                        ${method.name}
                    </span>
                    <span class="collection-transactions">
                        ${methodTransactions.length}
                        transaction${methodTransactions.length === 1 ? "" : "s"}
                    </span>
                </div>
                <span class="collection-amount">
                    ${formatMoney(amount)}
                </span>
            `;
    list.appendChild(item);
  });
  if (totalElement) {
    totalElement.textContent = formatMoney(grandTotal);
  }
  if (totalLabel) {
    totalLabel.textContent =
      collectionPeriod === "today"
        ? "Total Collected Today"
        : "Total Collected This Month";
  }
}
function renderAuditTrail() {
  const container = document.getElementById("auditTrail");
  if (!container) {
    return;
  }
  if (!transactions.length) {
    container.innerHTML = `
            <div class="audit-content">
                No financial activity recorded yet.
            </div>
        `;
    return;
  }
  const latest = transactions[0];
  container.innerHTML = `
        <div class="audit-content">
            <strong>
                Latest payment record:
            </strong>
            <br>
            Patient:
            ${escapeHtml(latest.patient)}
            <br>
            Invoice:
            ${escapeHtml(latest.invoice)}
            <br>
            Amount:
            ${formatMoney(latest.paid)}
            <br>
            Date:
            ${formatLongDate(latest.date)}
            <br>
            Payment Method:
            ${escapeHtml(latest.method)}
        </div>
    `;
}
function openPaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (!modal) {
    return;
  }
  document.getElementById("paymentPatient").value = "";
  document.getElementById("paymentService").value = "";
  document.getElementById("paymentTotal").value = "";
  document.getElementById("paymentDiscount").value = "0";
  document.getElementById("paymentPaid").value = "";
  modal.classList.add("show");
}
function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.classList.remove("show");
  }
}
function savePayment() {
  const patient = document.getElementById("paymentPatient").value.trim();
  const service = document.getElementById("paymentService").value.trim();
  const total = Number(document.getElementById("paymentTotal").value) || 0;
  const discount =
    Number(document.getElementById("paymentDiscount").value) || 0;
  const paid = Number(document.getElementById("paymentPaid").value) || 0;
  const method = document.getElementById("paymentMethod").value;
  if (!patient) {
    alert("Please enter the patient name.");
    return;
  }
  if (!service) {
    alert("Please enter the service.");
    return;
  }
  if (total <= 0) {
    alert("Please enter a valid total.");
    return;
  }
  const transaction = {
    id: `TXN-${Date.now()}`,
    invoice: `INV-${new Date().getFullYear()}-${String(
      transactions.length + 850,
    ).padStart(4, "0")}`,
    patient,
    service,
    date: getTodayKey(),
    time: getCurrentTime(),
    total,
    discount,
    paid,
    method,
  };
  transactions.unshift(transaction);
  saveTransactions();
  closePaymentModal();
  renderFinance();
}
function viewTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) {
    return;
  }
  alert(
    `Invoice: ${transaction.invoice}\n` +
      `Patient: ${transaction.patient}\n` +
      `Service: ${transaction.service}\n` +
      `Total: ${formatMoney(transaction.total)}\n` +
      `Discount: ${formatMoney(transaction.discount)}\n` +
      `Paid: ${formatMoney(transaction.paid)}\n` +
      `Balance: ${formatMoney(getBalance(transaction))}\n` +
      `Status: ${getPaymentStatus(transaction)}`,
  );
}
function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) {
    return;
  }
  document.getElementById("paymentPatient").value = transaction.patient;
  document.getElementById("paymentService").value = transaction.service;
  document.getElementById("paymentTotal").value = transaction.total;
  document.getElementById("paymentDiscount").value = transaction.discount;
  document.getElementById("paymentPaid").value = transaction.paid;
  document.getElementById("paymentMethod").value = transaction.method;
  const modal = document.getElementById("paymentModal");
  modal.classList.add("show");
  const saveButton = document.getElementById("savePaymentButton");
  saveButton.onclick = function editSave() {
    transaction.patient = document
      .getElementById("paymentPatient")
      .value.trim();
    transaction.service = document
      .getElementById("paymentService")
      .value.trim();
    transaction.total =
      Number(document.getElementById("paymentTotal").value) || 0;
    transaction.discount =
      Number(document.getElementById("paymentDiscount").value) || 0;
    transaction.paid =
      Number(document.getElementById("paymentPaid").value) || 0;
    transaction.method = document.getElementById("paymentMethod").value;
    saveTransactions();
    closePaymentModal();
    saveButton.onclick = savePayment;
    renderFinance();
  };
}
function deleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) {
    return;
  }
  const confirmed = confirm(`Delete transaction for ${transaction.patient}?`);
  if (!confirmed) {
    return;
  }
  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderFinance();
}
function getTodayKey() {
  const date = new Date();
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}
function getCurrentTime() {
  const date = new Date();
  return (
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}
function isCurrentMonth(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}
function getTodayRevenue() {
  return transactions
    .filter((transaction) => transaction.date === getTodayKey())
    .reduce((sum, transaction) => sum + transaction.paid, 0);
}
function getMonthlyRevenue() {
  return transactions
    .filter((transaction) => isCurrentMonth(transaction.date))
    .reduce((sum, transaction) => sum + transaction.paid, 0);
}
function getMonthlyExpenses() {
  return expenseData.reduce((sum, item) => sum + item.amount, 0);
}
function getRevenueForMonth(monthIndex) {
  const currentYear = new Date().getFullYear();
  return transactions
    .filter((transaction) => {
      const date = new Date(`${transaction.date}T00:00:00`);
      return (
        date.getFullYear() === currentYear && date.getMonth() === monthIndex
      );
    })
    .reduce((sum, transaction) => sum + transaction.paid, 0);
}
function getBalance(transaction) {
  const totalAfterDiscount = Math.max(
    0,
    transaction.total - transaction.discount,
  );
  return Math.max(0, totalAfterDiscount - transaction.paid);
}
function getPaymentStatus(transaction) {
  const balance = getBalance(transaction);
  const total = Math.max(0, transaction.total - transaction.discount);
  if (balance <= 0) {
    return "Paid";
  }
  if (transaction.paid > 0 && transaction.paid < total) {
    return "Partial";
  }
  return "Unpaid";
}
function getStatusClass(status) {
  if (status === "Paid") {
    return "status-paid";
  }
  if (status === "Partial") {
    return "status-partial";
  }
  return "status-unpaid";
}
function formatMoney(amount) {
  return (
    "₱" +
    Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function formatCompactMoney(amount) {
  if (amount >= 1000000) {
    return "₱" + (amount / 1000000).toFixed(1) + "M";
  }
  if (amount >= 1000) {
    return "₱" + (amount / 1000).toFixed(0) + "K";
  }
  return "₱" + Math.round(amount);
}
function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function formatLongDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function formatTime(time) {
  if (!time) {
    return "";
  }
  const parts = time.split(":");
  let hour = Number(parts[0]);
  const minute = parts[1] || "00";
  const suffix = hour >= 12 ? "PM" : "AM";
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }
  return `${hour}:${minute} ${suffix}`;
}
function getCurrentMonthLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function getInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
function shortenService(service) {
  const replacements = {
    "Dental Cleaning": "Cleaning",
    "Tooth Filling / Pasta": "Composite",
    "Tooth Extraction": "Extraction",
    "Braces Adjustment": "Braces",
  };
  return replacements[service] || service;
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/\</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
