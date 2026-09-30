"use strict";
const TRANSACTIONS_API = "../../api/finance/transactions.php";
const PATIENTS_KEY = "dentanueva_patients";
const PATIENT_API = "../../api/patient_records.php";
let transactions = [];
let patients = [];
let collectionPeriod = "today";
let revenueMode = "today";
let expenseData = [];
let currentDetailsTransaction = null;
const sampleProcedureData = [
  { name: "Dental Cleaning", amount: 18500 },
  { name: "Tooth Filling / Pasta", amount: 14200 },
  { name: "Tooth Extraction", amount: 11800 },
  { name: "Braces Adjustment", amount: 9600 },
  { name: "Root Canal", amount: 8200 },
  { name: "Consultation", amount: 5600 },
];
const sampleExpenseCategoryData = [
  { name: "Dental Supplies", amount: 18500, color: "#16803d" },
  { name: "Utilities", amount: 9200, color: "#2f80ed" },
  { name: "Staff Salaries", amount: 28500, color: "#f2994a" },
  { name: "Equipment Maintenance", amount: 7600, color: "#9b51e0" },
  { name: "Marketing", amount: 4800, color: "#27ae60" },
];
document.addEventListener("DOMContentLoaded", async () => {
  await loadPatients();
  setupEvents();
  await loadTransactions();
});
function setupEvents() {
  setupPatientSelector();
  document
    .getElementById("transactionSearch")
    ?.addEventListener("input", renderTransactions);
  document
    .getElementById("paymentMethodFilter")
    ?.addEventListener("change", renderTransactions);
  document
    .getElementById("transactionDateFilter")
    ?.addEventListener("change", renderTransactions);
  document
    .getElementById("revenueSwitch")
    ?.addEventListener("click", toggleRevenueMode);
  document.querySelectorAll(".collection-tab").forEach((button) => {
    button.addEventListener("click", () => {
      collectionPeriod = button.dataset.period || "today";
      document.querySelectorAll(".collection-tab").forEach((item) => {
        item.classList.remove("active");
      });
      button.classList.add("active");
      renderCollection();
    });
  });
  document
    .getElementById("recordPaymentButton")
    ?.addEventListener("click", openPaymentModal);
  document
    .getElementById("closePaymentModal")
    ?.addEventListener("click", closePaymentModal);
  document
    .getElementById("cancelPaymentButton")
    ?.addEventListener("click", closePaymentModal);
  document
    .getElementById("savePaymentButton")
    ?.addEventListener("click", savePayment);
  document
    .getElementById("paymentModal")
    ?.addEventListener("click", (event) => {
      if (event.target === document.getElementById("paymentModal")) {
        closePaymentModal();
      }
    });
  document
    .getElementById("closeDetailsBtn")
    ?.addEventListener("click", closeDetailsModal);
  document
    .getElementById("detailsCloseButton")
    ?.addEventListener("click", closeDetailsModal);
  document
    .getElementById("printReceiptBtn")
    ?.addEventListener("click", printReceipt);
  document
    .getElementById("detailsModal")
    ?.addEventListener("click", (event) => {
      if (event.target === document.getElementById("detailsModal")) {
        closeDetailsModal();
      }
    });
}
async function loadTransactions() {
  try {
    const response = await fetch(TRANSACTIONS_API, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load finance transactions.");
    }
    transactions = (Array.isArray(result.data) ? result.data : []).map(
      normalizeDatabaseTransaction,
    );
    renderFinance();
  } catch (error) {
    console.error("Unable to load finance transactions:", error);
    transactions = [];
    renderFinance();
  }
}
function normalizePaymentMethod(method) {
  const value = String(method || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (value === "cash") {
    return "Cash";
  }
  if (value === "gcash") {
    return "GCash";
  }
  if (value === "bank_transfer" || value === "bank transfer") {
    return "Bank Transfer";
  }
  return "";
}
function normalizeDatabaseTransaction(item) {
  const total = Number(item.total_amount) || 0;
  const discount = Number(item.discount_amount) || 0;
  const paid = Math.max(Number(item.paid_amount) || 0, 0);
  const databaseBalance = Number(item.balance_amount);
  const finalBalance = Number.isFinite(databaseBalance)
    ? Math.max(databaseBalance, 0)
    : Math.max(total - discount - paid, 0);
  const patientName =
    String(item.patient_name || "").trim() ||
    String(item.patient_id || "Unknown Patient");
  const paymentHistory = Array.isArray(item.paymentHistory)
    ? item.paymentHistory.map((payment) => ({
        id: payment.payment_uid || payment.payment_id || "",
        paymentId: Number(payment.payment_id) || 0,
        paymentUid: payment.payment_uid || "",
        transactionId: Number(payment.transaction_id) || 0,
        patientId: payment.patient_id || item.patient_id || "",
        amount: Number(payment.amount) || 0,
        paymentMethod: normalizePaymentMethod(
          payment.payment_method || payment.paymentMethod,
        ),
        paymentSource: String(payment.payment_source || "")
          .trim()
          .toLowerCase(),
        status: String(payment.status || "")
          .trim()
          .toLowerCase(),
        paidAt: payment.paid_at || payment.created_at || "",
        createdAt: payment.created_at || "",
        date: payment.paid_at
          ? String(payment.paid_at).slice(0, 10)
          : payment.created_at
            ? String(payment.created_at).slice(0, 10)
            : item.created_at
              ? String(item.created_at).slice(0, 10)
              : getTodayKey(),
        time: payment.paid_at
          ? String(payment.paid_at).slice(11, 16)
          : payment.created_at
            ? String(payment.created_at).slice(11, 16)
            : "",
      }))
    : [];
  const paidPayments = paymentHistory.filter(
    (payment) => payment.status === "paid" && payment.amount > 0,
  );
  const methods = [
    ...new Set(
      paidPayments.map((payment) => payment.paymentMethod).filter(Boolean),
    ),
  ];
  return {
    id: item.transaction_uid || String(item.transaction_id || ""),
    transactionId: Number(item.transaction_id) || 0,
    transactionUid: item.transaction_uid || "",
    invoice: item.transaction_uid || String(item.transaction_id || ""),
    patientId: item.patient_id || "",
    patient: patientName,
    patientName,
    service: item.service_name || "Consultation",
    date: item.created_at
      ? String(item.created_at).slice(0, 10)
      : getTodayKey(),
    time: item.created_at ? String(item.created_at).slice(11, 16) : "00:00",
    total,
    discount,
    paid,
    balance: finalBalance,
    method: methods[0] || "",
    paymentMethod: methods.join(" + "),
    status:
      item.status === "paid"
        ? "Paid"
        : item.status === "partial"
          ? "Partial"
          : "Unpaid",
    paymentHistory,
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
  };
}
async function loadPatients() {
  try {
    const response = await fetch(PATIENT_API, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load patients.");
    }
    const records = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.records)
        ? result.records
        : [];
    patients = records;
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    setupPatientSelector();
  } catch (error) {
    console.error("Unable to load DentaNueva patients:", error);
    try {
      const stored = localStorage.getItem(PATIENTS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      patients = Array.isArray(parsed) ? parsed : [];
    } catch (storageError) {
      patients = [];
    }
    setupPatientSelector();
  }
}
function getPatientFullName(patient) {
  if (!patient) {
    return "";
  }
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() ||
    String(patient.fullName || patient.name || "").trim()
  );
}
function findPatientById(patientId) {
  if (!patientId) {
    return null;
  }
  return (
    patients.find(
      (patient) =>
        String(patient.id) === String(patientId) ||
        String(patient.patientId) === String(patientId),
    ) || null
  );
}
function findPatientByName(name) {
  if (!name) {
    return null;
  }
  const target = String(name).trim().toLowerCase();
  return (
    patients.find(
      (patient) => getPatientFullName(patient).toLowerCase() === target,
    ) || null
  );
}
function setupPatientSelector() {
  const patientInput = document.getElementById("paymentPatient");
  const datalist = document.getElementById("paymentPatientList");
  if (!patientInput || !datalist) {
    return;
  }
  datalist.innerHTML = "";
  patients
    .slice()
    .sort((a, b) => getPatientFullName(a).localeCompare(getPatientFullName(b)))
    .forEach((patient) => {
      const option = document.createElement("option");
      const name = getPatientFullName(patient);
      option.value = name;
      option.label = `${name} · ${patient.patientId || patient.id || ""}`;
      datalist.appendChild(option);
    });
  patientInput.setAttribute("list", "paymentPatientList");
  patientInput.oninput = syncPaymentPatientId;
}
function syncPaymentPatientId() {
  const patientInput = document.getElementById("paymentPatient");
  const patientIdInput = document.getElementById("paymentPatientId");
  if (!patientInput || !patientIdInput) {
    return;
  }
  const patient = findPatientByName(patientInput.value);
  patientIdInput.value = patient ? patient.patientId || patient.id || "" : "";
  if (patient) {
    patientInput.value = getPatientFullName(patient);
  }
}
function getPaymentPatient() {
  const patientInput = document.getElementById("paymentPatient");
  const patientIdInput = document.getElementById("paymentPatientId");
  const patient =
    findPatientById(patientIdInput?.value) ||
    findPatientByName(patientInput?.value);
  if (!patient) {
    return null;
  }
  if (patientIdInput) {
    patientIdInput.value = patient.patientId || patient.id || "";
  }
  if (patientInput) {
    patientInput.value = getPatientFullName(patient);
  }
  return patient;
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
  if (title) {
    title.textContent =
      revenueMode === "today" ? "Today's Revenue" : "Monthly Revenue";
  }
  if (amount) {
    amount.textContent = formatMoney(
      revenueMode === "today" ? todayRevenue : monthRevenue,
    );
  }
  if (subtitle) {
    subtitle.textContent =
      revenueMode === "today" ? "Today's collection" : getCurrentMonthLabel();
  }
  if (switchText) {
    switchText.textContent = revenueMode === "today" ? "Today" : "This Month";
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
    expenseChange.textContent = "0% vs last month";
  }
}
function getFilteredTransactions() {
  const search = (document.getElementById("transactionSearch")?.value || "")
    .trim()
    .toLowerCase();
  const selectedMethod = normalizePaymentMethod(
    document.getElementById("paymentMethodFilter")?.value || "",
  );
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
      if (!selectedMethod) {
        return true;
      }
      return getPaymentHistory(transaction).some(
        (payment) => payment.paymentMethod === selectedMethod,
      );
    })
    .filter((transaction) => {
      if (dateFilter === "all") {
        return true;
      }
      if (dateFilter === "today") {
        return transaction.date === getTodayKey();
      }
      const date = new Date(
        `${transaction.date}T${transaction.time || "00:00"}`,
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
    count.textContent = `${filtered.length} transaction${
      filtered.length === 1 ? "" : "s"
    }`;
  }
  if (!filtered.length) {
    body.innerHTML =
      '<tr><td colspan="9" class="empty-table">No transactions found.</td></tr>';
    return;
  }
  filtered.forEach((transaction) => {
    const row = document.createElement("tr");
    const status = getPaymentStatus(transaction);
    row.innerHTML = `<td><div class="patient-cell"><div class="patient-avatar">${getInitials(
      transaction.patient,
    )}</div><div><span class="patient-name">${escapeHtml(
      transaction.patient,
    )}</span><span class="invoice-number">${escapeHtml(
      transaction.id,
    )}</span></div></div></td><td>${escapeHtml(
      transaction.service,
    )}</td><td><span class="date-main">${formatShortDate(
      transaction.date,
    )}</span><span class="date-time">${formatTime(
      transaction.time,
    )}</span></td><td class="money">${formatMoney(
      transaction.total,
    )}</td><td class="discount-money">${formatMoney(
      transaction.discount,
    )}</td><td class="money">${formatMoney(
      transaction.paid,
    )}</td><td class="balance-money">${formatMoney(
      getBalance(transaction),
    )}</td><td><span class="status-badge ${getStatusClass(
      status,
    )}">${status}</span></td><td><div class="action-buttons"><button type="button" class="table-action" title="View" onclick="viewTransaction('${escapeJs(
      transaction.id,
    )}')"><i class="fa-regular fa-eye"></i></button></div></td>`;
    body.appendChild(row);
  });
}
function renderProcedureChart() {
  const container = document.getElementById("procedureChart");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  let data = sampleProcedureData.map((item) => [item.name, item.amount]);
  if (!data.length) {
    return;
  }
  data.sort((a, b) => b[1] - a[1]);
  data = data.slice(0, 6);
  const max = Math.max(...data.map((item) => item[1]), 1);
  data.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "procedure-row";
    const percentage = (value / max) * 100;
    row.innerHTML = `<span class="procedure-name">${escapeHtml(
      shortenService(name),
    )}</span><div class="procedure-bar-bg"><div class="procedure-bar" style="width:${percentage}%"></div></div><span class="procedure-value">${formatMoney(
      value,
    )}</span>`;
    container.appendChild(row);
  });
}
function renderRevenueExpenseChart() {
  const svg = document.getElementById("revenueExpenseChart");
  if (!svg) {
    return;
  }
  svg.innerHTML = "";
  const months = Array.from({ length: 12 }, (_, index) =>
    new Date(new Date().getFullYear(), index, 1).toLocaleDateString("en-US", {
      month: "short",
    }),
  );
  const revenue = months.map((_, index) => getRevenueForMonth(index));
  const expenses = months.map(() => 0);
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
  const svgNamespace = "http://www.w3.org/2000/svg";
  function yPosition(value) {
    return top + chartHeight - (value / maxValue) * chartHeight;
  }
  for (let i = 0; i <= 5; i++) {
    const y = top + (chartHeight / 5) * i;
    const line = document.createElementNS(svgNamespace, "line");
    line.setAttribute("x1", left);
    line.setAttribute("x2", width - right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-grid-line");
    svg.appendChild(line);
    const label = document.createElementNS(svgNamespace, "text");
    label.setAttribute("x", 4);
    label.setAttribute("y", y + 4);
    label.setAttribute("class", "chart-axis-label");
    label.textContent = formatCompactMoney(maxValue - (maxValue / 5) * i);
    svg.appendChild(label);
  }
  months.forEach((month, index) => {
    const x = left + xStep * index;
    const label = document.createElementNS(svgNamespace, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", height - 13);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-axis-label");
    label.textContent = month;
    svg.appendChild(label);
  });
  function makePoints(data) {
    return data.map((value, index) => ({
      x: left + xStep * index,
      y: yPosition(value),
    }));
  }
  function makePath(points) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }
  const revenuePoints = makePoints(revenue);
  const expensePoints = makePoints(expenses);
  const revenuePath = document.createElementNS(svgNamespace, "path");
  revenuePath.setAttribute("d", makePath(revenuePoints));
  revenuePath.setAttribute("class", "revenue-line");
  svg.appendChild(revenuePath);
  const expensePath = document.createElementNS(svgNamespace, "path");
  expensePath.setAttribute("d", makePath(expensePoints));
  expensePath.setAttribute("class", "expense-line");
  svg.appendChild(expensePath);
  revenuePoints.forEach((point) => {
    const circle = document.createElementNS(svgNamespace, "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 4);
    circle.setAttribute("class", "revenue-point");
    svg.appendChild(circle);
  });
  expensePoints.forEach((point) => {
    const circle = document.createElementNS(svgNamespace, "circle");
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
  const total = sampleExpenseCategoryData.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  let currentPercent = 0;
  const gradients = [];
  if (!sampleExpenseCategoryData.length || total <= 0) {
    pie.style.background = "none";
    return;
  }
  sampleExpenseCategoryData.forEach((item) => {
    const percentage = (item.amount / total) * 100;
    const end = currentPercent + percentage;
    gradients.push(`${item.color} ${currentPercent}% ${end}%`);
    currentPercent = end;
    const itemElement = document.createElement("div");
    itemElement.className = "expense-category";
    itemElement.innerHTML = `<span class="expense-color" style="background:${item.color}"></span><span>${escapeHtml(
      item.name,
    )}: ${formatMoney(item.amount)} (${percentage.toFixed(1)}%)</span>`;
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
      value: "Cash",
      name: "Cash",
      icon: "fa-money-bill-wave",
      className: "cash",
    },
    {
      value: "GCash",
      name: "GCash",
      icon: "fa-mobile-screen-button",
      className: "gcash",
    },
    {
      value: "Bank Transfer",
      name: "Bank Transfer",
      icon: "fa-building-columns",
      className: "bank",
    },
  ];
  let grandTotal = 0;
  methods.forEach((method) => {
    const methodPayments = transactions
      .flatMap((transaction) =>
        getPaymentHistory(transaction).filter(
          (payment) =>
            payment.paymentMethod === method.value &&
            payment.status === "paid" &&
            payment.amount > 0,
        ),
      )
      .filter((payment) => {
        if (collectionPeriod === "today") {
          return payment.date === getTodayKey();
        }
        return isCurrentMonth(payment.date);
      });
    const amount = methodPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    grandTotal += amount;
    const item = document.createElement("div");
    item.className = "collection-item";
    item.innerHTML = `<div class="collection-icon ${
      method.className
    }"><i class="fa-solid ${
      method.icon
    }"></i></div><div class="collection-details"><span class="collection-name">${
      method.name
    }</span><span class="collection-transactions">${
      methodPayments.length
    } transaction${
      methodPayments.length === 1 ? "" : "s"
    }</span></div><span class="collection-amount">${formatMoney(
      amount,
    )}</span>`;
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
    container.innerHTML =
      '<div class="audit-content">No financial activity recorded yet.</div>';
    return;
  }
  const latest = transactions[0];
  const latestPayment = getPaymentHistory(latest)[0];
  container.innerHTML = `<div class="audit-content"><strong>Latest payment record:</strong><br>Patient: ${escapeHtml(
    latest.patient,
  )}<br>Invoice: ${escapeHtml(latest.invoice)}<br>Amount: ${formatMoney(
    latestPayment?.amount || latest.paid,
  )}<br>Date: ${formatLongDate(
    latestPayment?.date || latest.date,
  )}<br>Payment Method: ${escapeHtml(
    latestPayment?.paymentMethod || latest.method || "-",
  )}</div>`;
}
function openPaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (!modal) {
    return;
  }
  document.getElementById("paymentPatient").value = "";
  document.getElementById("paymentPatientId").value = "";
  document.getElementById("paymentService").value = "";
  document.getElementById("paymentTotal").value = "";
  document.getElementById("paymentDiscount").value = "0";
  modal.classList.add("show");
}
function closePaymentModal() {
  document.getElementById("paymentModal")?.classList.remove("show");
}
async function savePayment() {
  const patientRecord = getPaymentPatient();
  const patientId = patientRecord
    ? patientRecord.patientId || patientRecord.id || ""
    : "";
  const service = document.getElementById("paymentService")?.value.trim() || "";
  const total = Number(document.getElementById("paymentTotal")?.value) || 0;
  const discount =
    Number(document.getElementById("paymentDiscount")?.value) || 0;
  if (!patientRecord || !patientId) {
    alert("Please select a valid patient from the patient list.");
    return;
  }
  if (!service) {
    alert("Please enter the service.");
    return;
  }
  if (total <= 0) {
    alert("Please enter a valid treatment price.");
    return;
  }
  if (discount < 0) {
    alert("Discount cannot be negative.");
    return;
  }
  if (discount > total) {
    alert("Discount cannot be greater than the treatment price.");
    return;
  }
  const saveButton = document.getElementById("savePaymentButton");
  const originalText = saveButton?.textContent || "Create Charge";
  try {
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Creating...";
    }
    const response = await fetch(TRANSACTIONS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        patientId,
        service,
        total,
        discount,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to create treatment charge.");
    }
    await loadTransactions();
    closePaymentModal();
  } catch (error) {
    console.error("Unable to create treatment charge:", error);
    alert(error.message || "Unable to create treatment charge.");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}
function viewTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (transaction) {
    showTransactionDetails(transaction);
  }
}
function getPaymentHistory(transaction) {
  const history = Array.isArray(transaction.paymentHistory)
    ? transaction.paymentHistory
    : [];
  return history
    .filter(
      (payment) =>
        String(payment.status || "").toLowerCase() === "paid" &&
        Number(payment.amount) > 0,
    )
    .map((payment, index) => ({
      id:
        payment.paymentUid ||
        payment.paymentId ||
        `${transaction.id}-${index + 1}`,
      amount: Number(payment.amount) || 0,
      paymentMethod: normalizePaymentMethod(payment.paymentMethod),
      date: payment.paidAt
        ? String(payment.paidAt).slice(0, 10)
        : payment.date || transaction.date,
      time: payment.paidAt
        ? String(payment.paidAt).slice(11, 16)
        : payment.time || transaction.time || "",
      status: "paid",
    }))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
function showTransactionDetails(transaction) {
  currentDetailsTransaction = transaction;
  const balance = getBalance(transaction);
  document.getElementById("detailTransactionId").textContent =
    transaction.id || "-";
  document.getElementById("detailPatient").textContent =
    transaction.patient || "-";
  document.getElementById("detailService").textContent =
    transaction.service || "-";
  document.getElementById("detailTotal").textContent = formatMoney(
    transaction.total,
  );
  document.getElementById("detailDiscount").textContent = formatMoney(
    transaction.discount,
  );
  document.getElementById("detailPaid").textContent = formatMoney(
    transaction.paid,
  );
  document.getElementById("detailBalance").textContent = formatMoney(balance);
  const history = getPaymentHistory(transaction);
  const methods = [
    ...new Set(history.map((payment) => payment.paymentMethod).filter(Boolean)),
  ];
  document.getElementById("detailMethod").textContent =
    methods.join(" + ") ||
    transaction.paymentMethod ||
    transaction.method ||
    "-";
  document.getElementById("detailDate").textContent = formatLongDate(
    transaction.date,
  );
  const status = getPaymentStatus(transaction);
  const detailStatus = document.getElementById("detailStatus");
  detailStatus.textContent = status;
  detailStatus.className = `status-badge ${getStatusClass(status)}`;
  renderPaymentHistory(transaction);
  document.getElementById("detailsModal").classList.add("show");
}
function renderPaymentHistory(transaction) {
  const history = getPaymentHistory(transaction);
  const list = document.getElementById("paymentHistoryList");
  const count = document.getElementById("paymentHistoryCount");
  if (!list || !count) {
    return;
  }
  count.textContent = `${history.length} payment${
    history.length === 1 ? "" : "s"
  }`;
  list.innerHTML = history.length
    ? history
        .map((payment, index) => {
          const method = payment.paymentMethod;
          const icon =
            method === "GCash"
              ? "fa-mobile-screen-button"
              : method === "Bank Transfer"
                ? "fa-building-columns"
                : "fa-money-bill-wave";
          return `<div class="payment-history-item"><div class="payment-history-item-left"><div class="payment-history-method-icon"><i class="fa-solid ${icon}"></i></div><div class="payment-history-item-info"><strong>${escapeHtml(
            method || "-",
          )}</strong><span>${escapeHtml(formatLongDate(payment.date))}${
            payment.time ? ` · ${escapeHtml(formatTime(payment.time))}` : ""
          }</span></div></div><div class="payment-history-item-right"><strong>${escapeHtml(
            formatMoney(payment.amount),
          )}</strong><span>Payment ${
            history.length - index
          }</span></div></div>`;
        })
        .join("")
    : `<div class="payment-history-empty"><div class="payment-history-empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div><strong>No payment history</strong><p>Additional payments will appear here.</p></div>`;
}
function closeDetailsModal() {
  document.getElementById("detailsModal")?.classList.remove("show");
  currentDetailsTransaction = null;
}
function printReceipt() {
  const transaction = currentDetailsTransaction;
  if (!transaction) {
    return;
  }
  const payment = getPaymentHistory(transaction)[0];
  const receiptWindow = window.open("", "_blank", "width=480,height=760");
  if (!receiptWindow) {
    alert("Please allow pop-ups to view the receipt.");
    return;
  }
  const totalCharge = Number(transaction.total || 0);
  const netAmount = Math.max(
    totalCharge - Number(transaction.discount || 0),
    0,
  );
  const amountPaid = Number(payment?.amount || transaction.paid || 0);
  const remainingBalance = getBalance(transaction);
  const paymentMethod = payment?.paymentMethod || transaction.method || "-";
  const paymentStatus = getPaymentStatus(transaction);
  const receiptHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Payment Receipt - ${escapeHtml(
    transaction.id,
  )}</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1d2822}.receipt-page{width:100%;max-width:420px;margin:0 auto;background:#fff;padding:32px 34px;border:1px solid #e2e7e4;box-shadow:0 8px 24px rgba(0,0,0,.06)}.receipt-header{text-align:center}.clinic-name{margin:0;font-size:20px;font-weight:700;letter-spacing:.2px;color:#17211b}.clinic-subtitle{margin:4px 0 0;font-size:11px;color:#78837d}.receipt-type{margin:18px 0 0;text-align:center;font-size:12px;font-weight:700;letter-spacing:1.2px;color:#4c5952}.divider{border:0;border-top:1px solid #dfe5e1;margin:20px 0}.receipt-info{width:100%;border-collapse:collapse}.receipt-info td{padding:7px 0;vertical-align:top;font-size:10px}.receipt-info .label{width:42%;color:#7a857f;font-size:9px;text-transform:uppercase;letter-spacing:.4px}.receipt-info .value{width:58%;text-align:right;font-weight:600;color:#202b25;word-break:break-word}.section-title{margin:20px 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#78837d}.amounts{width:100%;border-collapse:collapse}.amounts td{padding:7px 0;font-size:10px}.amounts .label{color:#68746d}.amounts .value{text-align:right;font-weight:600}.amounts .total-row td{padding-top:11px;font-size:11px;font-weight:700;border-top:1px solid #dfe5e1}.amounts .paid-row td{padding-top:12px;font-size:12px;font-weight:700;border-top:1px dashed #cfd8d3}.amounts .balance-row td{padding-top:8px;font-size:11px;font-weight:700}.amounts .balance-row .value{font-size:12px}.status{display:inline-block;margin-top:3px;padding:4px 9px;border:1px solid #d8e1db;border-radius:20px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}.receipt-footer{text-align:center;margin-top:24px;padding-top:16px;border-top:1px dashed #d4dcd7;color:#7b867f;font-size:8px;line-height:1.6}.receipt-actions{text-align:center;margin-top:20px}.receipt-print-button{border:0;border-radius:6px;padding:9px 18px;background:#16803d;color:#fff;font-size:9px;font-weight:600;cursor:pointer}@media print{body{padding:0;background:#fff}.receipt-page{max-width:420px;border:0;box-shadow:none;padding:24px}.receipt-actions{display:none}}</style></head><body><div class="receipt-page"><header class="receipt-header"><h1 class="clinic-name">DentaNueva Dental Clinic</h1><p class="clinic-subtitle">Official Payment Receipt</p><p class="receipt-type">PAYMENT RECEIPT</p></header><hr class="divider"><table class="receipt-info"><tr><td class="label">Transaction ID</td><td class="value">${escapeHtml(
    transaction.id || "-",
  )}</td></tr><tr><td class="label">Payment ID</td><td class="value">${escapeHtml(
    payment?.id || `${transaction.id}-1`,
  )}</td></tr><tr><td class="label">Patient</td><td class="value">${escapeHtml(
    transaction.patient || "-",
  )}</td></tr><tr><td class="label">Service</td><td class="value">${escapeHtml(
    transaction.service || "-",
  )}</td></tr><tr><td class="label">Date</td><td class="value">${escapeHtml(
    formatLongDate(transaction.date),
  )}</td></tr><tr><td class="label">Payment Method</td><td class="value">${escapeHtml(
    paymentMethod,
  )}</td></tr><tr><td class="label">Status</td><td class="value"><span class="status">${escapeHtml(
    paymentStatus,
  )}</span></td></tr></table><div class="section-title">Payment Summary</div><table class="amounts"><tr><td class="label">Total Charge</td><td class="value">${formatMoney(
    totalCharge,
  )}</td></tr><tr><td class="label">Discount</td><td class="value">${formatMoney(
    transaction.discount || 0,
  )}</td></tr><tr class="total-row"><td class="label">Net Amount</td><td class="value">${formatMoney(
    netAmount,
  )}</td></tr><tr class="paid-row"><td class="label">Amount Paid</td><td class="value">${formatMoney(
    amountPaid,
  )}</td></tr><tr class="balance-row"><td class="label">Remaining Balance</td><td class="value">${formatMoney(
    remainingBalance,
  )}</td></tr></table><footer class="receipt-footer">Thank you for your payment.<br>This receipt represents the selected payment transaction.</footer><div class="receipt-actions"><button class="receipt-print-button" onclick="window.focus();window.print()">Print Receipt</button></div></div></body></html>`;
  receiptWindow.document.open();
  receiptWindow.document.write(receiptHtml);
  receiptWindow.document.close();
}
function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
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
  return expenseData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
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
  const databaseBalance = Number(transaction.balance);
  if (Number.isFinite(databaseBalance)) {
    return Math.max(databaseBalance, 0);
  }
  const totalAfterDiscount = Math.max(
    transaction.total - transaction.discount,
    0,
  );
  return Math.max(totalAfterDiscount - transaction.paid, 0);
}
function getPaymentStatus(transaction) {
  const balance = getBalance(transaction);
  const total = Math.max(transaction.total - transaction.discount, 0);
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
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function formatCompactMoney(amount) {
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(0)}K`;
  }
  return `₱${Math.round(amount)}`;
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
  const parts = String(time).split(":");
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
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeJs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
