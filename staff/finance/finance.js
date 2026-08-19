document.addEventListener("DOMContentLoaded", function () {
  const STORAGE_KEY = "dentaNuevaFinanceTransactions";

  let transactions = [];
  let editingTransactionId = null;

  const paymentModal = document.getElementById("paymentModal");
  const detailsModal = document.getElementById("detailsModal");

  const paymentForm = document.getElementById("paymentForm");

  const recordPaymentBtn = document.getElementById("recordPaymentBtn");

  const closeModalBtn = document.getElementById("closeModalBtn");

  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");

  const closeDetailsBtn = document.getElementById("closeDetailsBtn");

  const detailsCloseButton = document.getElementById("detailsCloseButton");

  const searchInput = document.getElementById("searchInput");

  const paymentMethodFilter = document.getElementById("paymentMethodFilter");

  const dateFilter = document.getElementById("dateFilter");

  const tableBody = document.getElementById("transactionsTableBody");

  const emptyState = document.getElementById("emptyState");

  const transactionIdInput = document.getElementById("transactionId");

  const patientNameInput = document.getElementById("patientName");

  const serviceNameInput = document.getElementById("serviceName");

  const paymentAmountInput = document.getElementById("paymentAmount");

  const paymentDateInput = document.getElementById("paymentDate");

  const paymentMethodInput = document.getElementById("paymentMethod");

  const paymentStatusInput = document.getElementById("paymentStatus");

  const paymentNotesInput = document.getElementById("paymentNotes");

  const modalTitle = document.getElementById("modalTitle");

  const showMonthlyCollectionBtn = document.getElementById(
    "showMonthlyCollectionBtn",
  );

  const showTodayCollectionBtn = document.getElementById(
    "showTodayCollectionBtn",
  );

  const todayCollectionPage = document.getElementById("todayCollectionPage");

  const monthlyCollectionPage = document.getElementById(
    "monthlyCollectionPage",
  );

  initialize();

  function initialize() {
    loadTransactions();

    setDefaultPaymentDate();

    updateCurrentMonthLabel();

    updateMonthlyCollectionDescription();

    renderDashboard();

    renderTransactions();

    if (window.lucide) {
      lucide.createIcons();
    }

    setupEventListeners();
  }

  function setupEventListeners() {
    recordPaymentBtn.addEventListener("click", function () {
      openPaymentModal();
    });

    closeModalBtn.addEventListener("click", function () {
      closePaymentModal();
    });

    cancelPaymentBtn.addEventListener("click", function () {
      closePaymentModal();
    });

    closeDetailsBtn.addEventListener("click", function () {
      closeDetailsModal();
    });

    detailsCloseButton.addEventListener("click", function () {
      closeDetailsModal();
    });

    showMonthlyCollectionBtn.addEventListener("click", function () {
      showMonthlyCollection();
    });

    showTodayCollectionBtn.addEventListener("click", function () {
      showTodayCollection();
    });

    paymentForm.addEventListener("submit", function (event) {
      event.preventDefault();

      savePayment();
    });

    searchInput.addEventListener("input", function () {
      renderTransactions();
    });

    paymentMethodFilter.addEventListener("change", function () {
      renderTransactions();
    });

    dateFilter.addEventListener("change", function () {
      renderTransactions();
    });

    paymentModal.addEventListener("click", function (event) {
      if (event.target === paymentModal) {
        closePaymentModal();
      }
    });

    detailsModal.addEventListener("click", function (event) {
      if (event.target === detailsModal) {
        closeDetailsModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePaymentModal();

        closeDetailsModal();
      }
    });
  }

  function loadTransactions() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (savedData === null) {
        transactions = createSampleTransactions();

        saveTransactions();

        return;
      }

      const parsedData = JSON.parse(savedData);

      if (Array.isArray(parsedData)) {
        transactions = parsedData.map(function (transaction) {
          return {
            ...transaction,
            status: "Paid",
          };
        });

        saveTransactions();
      } else {
        transactions = [];
      }
    } catch (error) {
      console.error("Unable to load finance transactions:", error);

      transactions = [];
    }
  }

  function createSampleTransactions() {
    const today = getTodayString();

    const baseDate = new Date();

    function getPastDate(daysAgo) {
      const date = new Date(baseDate);

      date.setDate(date.getDate() - daysAgo);

      const year = date.getFullYear();

      const month = String(date.getMonth() + 1).padStart(2, "0");

      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return [
      {
        id: "TXN-SAMPLE-001",
        patientName: "Erwin Jacaba",
        service: "Dental Cleaning",
        amount: 1700,
        date: today,
        paymentMethod: "Cash",
        status: "Paid",
        notes: "Regular dental cleaning.",
        createdTime: "09:15:00",
        createdAt: new Date().toISOString(),
      },

      {
        id: "TXN-SAMPLE-002",
        patientName: "Maria Santos",
        service: "Tooth Filling / Pasta",
        amount: 2500,
        date: today,
        paymentMethod: "GCash",
        status: "Paid",
        notes: "Composite tooth filling.",
        createdTime: "10:30:00",
        createdAt: new Date().toISOString(),
      },

      {
        id: "TXN-SAMPLE-003",
        patientName: "John Cruz",
        service: "Tooth Extraction",
        amount: 3500,
        date: getPastDate(1),
        paymentMethod: "Card",
        status: "Paid",
        notes: "Tooth extraction treatment.",
        createdTime: "11:45:00",
        createdAt: new Date().toISOString(),
      },

      {
        id: "TXN-SAMPLE-004",
        patientName: "Angela Reyes",
        service: "Root Canal",
        amount: 8500,
        date: getPastDate(2),
        paymentMethod: "Bank Transfer",
        status: "Paid",
        notes: "Root canal treatment.",
        createdTime: "14:00:00",
        createdAt: new Date().toISOString(),
      },

      {
        id: "TXN-SAMPLE-005",
        patientName: "Carlos Mendoza",
        service: "Braces Adjustment",
        amount: 1800,
        date: getPastDate(3),
        paymentMethod: "GCash",
        status: "Paid",
        notes: "Monthly braces adjustment.",
        createdTime: "15:30:00",
        createdAt: new Date().toISOString(),
      },

      {
        id: "TXN-SAMPLE-006",
        patientName: "Sofia Garcia",
        service: "Consultation",
        amount: 800,
        date: getPastDate(4),
        paymentMethod: "Cash",
        status: "Paid",
        notes: "Initial dental consultation.",
        createdTime: "13:15:00",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Unable to save finance transactions:", error);
    }
  }

  function createTransactionId() {
    const timestamp = Date.now().toString().slice(-8);

    const random = Math.floor(100 + Math.random() * 900);

    return "TXN-" + timestamp + random;
  }

  function getTodayString() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getMonthKey(dateString) {
    if (!dateString) {
      return "";
    }

    return dateString.substring(0, 7);
  }

  function getCurrentMonthKey() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  }

  function formatCurrency(amount) {
    const number = Number(amount) || 0;

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(number);
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString + "T00:00:00");

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatShortDate(dateString) {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString + "T00:00:00");

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getInitials(name) {
    if (!name) {
      return "PT";
    }

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  function updateCurrentMonthLabel() {
    const now = new Date();

    const monthName = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    document.getElementById("currentMonthLabel").textContent = monthName;
  }

  function updateMonthlyCollectionDescription() {
    const now = new Date();

    const monthName = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    document.getElementById("monthlyCollectionDescription").textContent =
      `Payment collection for ${monthName}.`;
  }

  function renderDashboard() {
    const today = getTodayString();

    const currentMonth = getCurrentMonthKey();

    let todayRevenue = 0;

    let monthlyRevenue = 0;

    let paidCount = 0;

    transactions.forEach(function (transaction) {
      const amount = Number(transaction.amount) || 0;

      if (transaction.status === "Paid" && transaction.date === today) {
        todayRevenue += amount;
      }

      if (
        transaction.status === "Paid" &&
        getMonthKey(transaction.date) === currentMonth
      ) {
        monthlyRevenue += amount;

        paidCount++;
      }
    });

    document.getElementById("todayRevenue").textContent =
      formatCurrency(todayRevenue);

    document.getElementById("monthlyRevenue").textContent =
      formatCurrency(monthlyRevenue);

    document.getElementById("paidTransactions").textContent = paidCount;

    renderPaymentMethods();
  }

  function createPaymentMethodTotals(filterType) {
    const methods = {
      Cash: {
        amount: 0,
        count: 0,
      },

      GCash: {
        amount: 0,
        count: 0,
      },

      "Bank Transfer": {
        amount: 0,
        count: 0,
      },

      Card: {
        amount: 0,
        count: 0,
      },
    };

    const today = getTodayString();

    const currentMonth = getCurrentMonthKey();

    transactions.forEach(function (transaction) {
      if (transaction.status !== "Paid") {
        return;
      }

      let includeTransaction = false;

      if (filterType === "today") {
        includeTransaction = transaction.date === today;
      }

      if (filterType === "month") {
        includeTransaction = getMonthKey(transaction.date) === currentMonth;
      }

      if (!includeTransaction) {
        return;
      }

      const method = transaction.paymentMethod;

      const amount = Number(transaction.amount) || 0;

      if (methods[method]) {
        methods[method].amount += amount;

        methods[method].count++;
      }
    });

    return methods;
  }

  function renderPaymentMethods() {
    const todayMethods = createPaymentMethodTotals("today");

    const monthlyMethods = createPaymentMethodTotals("month");

    renderTodayCollection(todayMethods);

    renderMonthlyCollection(monthlyMethods);
  }

  function renderTodayCollection(methods) {
    document.getElementById("todayCashAmount").textContent = formatCurrency(
      methods.Cash.amount,
    );

    document.getElementById("todayGcashAmount").textContent = formatCurrency(
      methods.GCash.amount,
    );

    document.getElementById("todayBankAmount").textContent = formatCurrency(
      methods["Bank Transfer"].amount,
    );

    document.getElementById("todayCardAmount").textContent = formatCurrency(
      methods.Card.amount,
    );

    document.getElementById("todayCashCount").textContent = transactionText(
      methods.Cash.count,
    );

    document.getElementById("todayGcashCount").textContent = transactionText(
      methods.GCash.count,
    );

    document.getElementById("todayBankCount").textContent = transactionText(
      methods["Bank Transfer"].count,
    );

    document.getElementById("todayCardCount").textContent = transactionText(
      methods.Card.count,
    );

    const total =
      methods.Cash.amount +
      methods.GCash.amount +
      methods["Bank Transfer"].amount +
      methods.Card.amount;

    document.getElementById("todayPaymentMethodTotal").textContent =
      formatCurrency(total);
  }

  function renderMonthlyCollection(methods) {
    document.getElementById("monthlyCashAmount").textContent = formatCurrency(
      methods.Cash.amount,
    );

    document.getElementById("monthlyGcashAmount").textContent = formatCurrency(
      methods.GCash.amount,
    );

    document.getElementById("monthlyBankAmount").textContent = formatCurrency(
      methods["Bank Transfer"].amount,
    );

    document.getElementById("monthlyCardAmount").textContent = formatCurrency(
      methods.Card.amount,
    );

    document.getElementById("monthlyCashCount").textContent = transactionText(
      methods.Cash.count,
    );

    document.getElementById("monthlyGcashCount").textContent = transactionText(
      methods.GCash.count,
    );

    document.getElementById("monthlyBankCount").textContent = transactionText(
      methods["Bank Transfer"].count,
    );

    document.getElementById("monthlyCardCount").textContent = transactionText(
      methods.Card.count,
    );

    const total =
      methods.Cash.amount +
      methods.GCash.amount +
      methods["Bank Transfer"].amount +
      methods.Card.amount;

    document.getElementById("monthlyPaymentMethodTotal").textContent =
      formatCurrency(total);
  }

  function showMonthlyCollection() {
    todayCollectionPage.classList.remove("active");

    monthlyCollectionPage.classList.add("active");

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function showTodayCollection() {
    monthlyCollectionPage.classList.remove("active");

    todayCollectionPage.classList.add("active");

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function transactionText(count) {
    return `${count} ${count === 1 ? "transaction" : "transactions"}`;
  }

  function getFilteredTransactions() {
    const searchValue = searchInput.value.trim().toLowerCase();

    const methodValue = paymentMethodFilter.value;

    const dateValue = dateFilter.value;

    const today = getTodayString();

    const currentMonth = getCurrentMonthKey();

    return transactions
      .filter(function (transaction) {
        const patient = String(transaction.patientName || "").toLowerCase();

        const service = String(transaction.service || "").toLowerCase();

        const transactionId = String(transaction.id || "").toLowerCase();

        const matchesSearch =
          !searchValue ||
          patient.includes(searchValue) ||
          service.includes(searchValue) ||
          transactionId.includes(searchValue);

        const matchesMethod =
          methodValue === "all" || transaction.paymentMethod === methodValue;

        let matchesDate = true;

        if (dateValue === "today") {
          matchesDate = transaction.date === today;
        } else if (dateValue === "month") {
          matchesDate = getMonthKey(transaction.date) === currentMonth;
        }

        return matchesSearch && matchesMethod && matchesDate;
      })
      .sort(function (a, b) {
        const dateA = new Date(`${a.date}T${a.createdTime || "00:00:00"}`);

        const dateB = new Date(`${b.date}T${b.createdTime || "00:00:00"}`);

        return dateB - dateA;
      });
  }

  function renderTransactions() {
    const filtered = getFilteredTransactions();

    tableBody.innerHTML = "";

    document.getElementById("transactionCount").textContent =
      `${filtered.length} ${
        filtered.length === 1 ? "transaction" : "transactions"
      }`;

    if (filtered.length === 0) {
      emptyState.style.display = "flex";

      return;
    }

    emptyState.style.display = "none";

    filtered.forEach(function (transaction) {
      const row = document.createElement("tr");

      const initials = getInitials(transaction.patientName);

      row.innerHTML = `
          <td>
            <div class="patient-cell">

              <div class="patient-avatar">
                ${escapeHtml(initials)}
              </div>

              <div class="patient-info">

                <strong>
                  ${escapeHtml(transaction.patientName || "Unknown Patient")}
                </strong>

                <span>
                  ${escapeHtml(transaction.id || "-")}
                </span>

              </div>

            </div>
          </td>

          <td>
            <span class="service-name">
              ${escapeHtml(transaction.service || "-")}
            </span>
          </td>

          <td>
            <div class="date-cell">

              <strong>
                ${escapeHtml(formatShortDate(transaction.date))}
              </strong>

              <span>
                ${escapeHtml(getTimeLabel(transaction.createdTime))}
              </span>

            </div>
          </td>

          <td class="amount-cell">
            ${escapeHtml(formatCurrency(transaction.amount))}
          </td>

          <td>
            <span class="method-badge">

              <span class="method-dot"></span>

              ${escapeHtml(transaction.paymentMethod || "-")}

            </span>
          </td>

          <td>
            <span class="status-badge status-paid">
              Paid
            </span>
          </td>

          <td class="action-cell">

            <button
              class="action-button"
              title="View Details"
              data-action="view"
              data-id="${escapeHtml(transaction.id)}"
            >
              <i data-lucide="eye"></i>
            </button>

            <button
              class="action-button"
              title="Edit Payment"
              data-action="edit"
              data-id="${escapeHtml(transaction.id)}"
            >
              <i data-lucide="pencil"></i>
            </button>

            <button
              class="action-button delete-action-button"
              title="Delete Payment"
              data-action="delete"
              data-id="${escapeHtml(transaction.id)}"
            >
              <i data-lucide="trash-2"></i>
            </button>

          </td>
        `;

      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        handleTransactionAction(button.dataset.action, button.dataset.id);
      });
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function handleTransactionAction(action, id) {
    const transaction = transactions.find(function (item) {
      return item.id === id;
    });

    if (!transaction) {
      return;
    }

    if (action === "view") {
      showTransactionDetails(transaction);

      return;
    }

    if (action === "edit") {
      openPaymentModal(transaction);

      return;
    }

    if (action === "delete") {
      deleteTransaction(transaction.id);
    }
  }

  function getTimeLabel(timeString) {
    if (!timeString) {
      return "";
    }

    const parts = timeString.split(":");

    if (parts.length < 2) {
      return timeString;
    }

    let hour = parseInt(parts[0], 10);

    const minute = parts[1];

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${period}`;
  }

  function openPaymentModal(transaction = null) {
    paymentModal.classList.add("active");

    if (transaction) {
      editingTransactionId = transaction.id;

      modalTitle.textContent = "Edit Payment";

      transactionIdInput.value = transaction.id;

      patientNameInput.value = transaction.patientName || "";

      serviceNameInput.value = transaction.service || "";

      paymentAmountInput.value = transaction.amount || "";

      paymentDateInput.value = transaction.date || getTodayString();

      paymentMethodInput.value = transaction.paymentMethod || "";

      paymentStatusInput.value = "Paid";

      paymentNotesInput.value = transaction.notes || "";
    } else {
      editingTransactionId = null;

      modalTitle.textContent = "Record Payment";

      paymentForm.reset();

      transactionIdInput.value = "";

      paymentDateInput.value = getTodayString();

      paymentStatusInput.value = "Paid";
    }

    setTimeout(function () {
      patientNameInput.focus();
    }, 100);
  }

  function closePaymentModal() {
    paymentModal.classList.remove("active");

    paymentForm.reset();

    editingTransactionId = null;

    transactionIdInput.value = "";

    modalTitle.textContent = "Record Payment";
  }

  function savePayment() {
    const patientName = patientNameInput.value.trim();

    const service = serviceNameInput.value.trim();

    const amount = parseFloat(paymentAmountInput.value);

    const date = paymentDateInput.value;

    const paymentMethod = paymentMethodInput.value;

    const notes = paymentNotesInput.value.trim();

    if (!patientName) {
      showToast("Please enter the patient name.");

      return;
    }

    if (!service) {
      showToast("Please enter the service.");

      return;
    }

    if (isNaN(amount) || amount < 0) {
      showToast("Please enter a valid amount.");

      return;
    }

    if (!date) {
      showToast("Please select the payment date.");

      return;
    }

    if (!paymentMethod) {
      showToast("Please select a payment method.");

      return;
    }

    const now = new Date();

    const createdTime = now.toTimeString().substring(0, 8);

    if (editingTransactionId) {
      const index = transactions.findIndex(function (item) {
        return item.id === editingTransactionId;
      });

      if (index !== -1) {
        transactions[index] = {
          ...transactions[index],

          patientName: patientName,

          service: service,

          amount: amount,

          date: date,

          paymentMethod: paymentMethod,

          status: "Paid",

          notes: notes,
        };
      }

      showToast("Payment updated successfully.");
    } else {
      const newTransaction = {
        id: createTransactionId(),

        patientName: patientName,

        service: service,

        amount: amount,

        date: date,

        paymentMethod: paymentMethod,

        status: "Paid",

        notes: notes,

        createdTime: createdTime,

        createdAt: new Date().toISOString(),
      };

      transactions.unshift(newTransaction);

      showToast("Payment recorded successfully.");
    }

    saveTransactions();

    closePaymentModal();

    renderDashboard();

    renderTransactions();
  }

  function showTransactionDetails(transaction) {
    document.getElementById("detailTransactionId").textContent =
      transaction.id || "-";

    document.getElementById("detailPatient").textContent =
      transaction.patientName || "-";

    document.getElementById("detailService").textContent =
      transaction.service || "-";

    document.getElementById("detailAmount").textContent = formatCurrency(
      transaction.amount,
    );

    document.getElementById("detailMethod").textContent =
      transaction.paymentMethod || "-";

    document.getElementById("detailDate").textContent = formatDate(
      transaction.date,
    );

    const detailStatus = document.getElementById("detailStatus");

    detailStatus.textContent = "Paid";

    detailStatus.style.color = "#16814b";

    document.getElementById("detailNotes").textContent =
      transaction.notes || "No notes.";

    detailsModal.classList.add("active");
  }

  function closeDetailsModal() {
    detailsModal.classList.remove("active");
  }

  function deleteTransaction(id) {
    const transaction = transactions.find(function (item) {
      return item.id === id;
    });

    if (!transaction) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this payment?\n\n` +
        `Patient: ${transaction.patientName}\n` +
        `Service: ${transaction.service}\n` +
        `Amount: ${formatCurrency(transaction.amount)}\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    transactions = transactions.filter(function (item) {
      return item.id !== id;
    });

    saveTransactions();

    renderDashboard();

    renderTransactions();

    showToast("Payment deleted successfully.");
  }

  function setDefaultPaymentDate() {
    paymentDateInput.value = getTodayString();
  }

  function showToast(message) {
    let toast = document.querySelector(".finance-toast");

    if (!toast) {
      toast = document.createElement("div");

      toast.className = "finance-toast";

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toast.hideTimer);

    toast.hideTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2500);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
