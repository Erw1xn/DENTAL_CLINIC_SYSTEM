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

  const collectionDrawer = document.getElementById("collectionDrawer");
  const collectionDrawerOverlay = document.getElementById(
    "collectionDrawerOverlay",
  );
  const openCollectionDrawerBtn = document.getElementById(
    "openCollectionDrawerBtn",
  );
  const closeCollectionDrawerBtn = document.getElementById(
    "closeCollectionDrawerBtn",
  );

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
    updateMonthlyCollectionDescription();
    renderTransactions();
    renderPaymentMethods();
    showTodayCollection();

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

    openCollectionDrawerBtn.addEventListener("click", function () {
      openCollectionDrawer();
    });

    closeCollectionDrawerBtn.addEventListener("click", function () {
      closeCollectionDrawer();
    });

    collectionDrawerOverlay.addEventListener("click", function () {
      closeCollectionDrawer();
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

    paymentAmountInput.addEventListener("input", function () {
      updatePaymentCalculation();
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
        closeCollectionDrawer();
      }
    });
  }

  function openCollectionDrawer() {
    if (!collectionDrawer || !collectionDrawerOverlay) {
      return;
    }

    showTodayCollection();

    collectionDrawer.classList.add("active");
    collectionDrawerOverlay.classList.add("active");

    document.body.style.overflow = "hidden";

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function closeCollectionDrawer() {
    if (!collectionDrawer || !collectionDrawerOverlay) {
      return;
    }

    collectionDrawer.classList.remove("active");
    collectionDrawerOverlay.classList.remove("active");

    document.body.style.overflow = "";
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
          return normalizeTransaction(transaction);
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

  function normalizeTransaction(transaction) {
    const oldAmount = Number(transaction.amount) || 0;
    const total = Number(transaction.total);
    const discount = Number(transaction.discount);
    const paid = Number(transaction.paid);

    const normalizedTotal = Number.isFinite(total) ? total : oldAmount;

    const normalizedDiscount = Number.isFinite(discount) ? discount : 0;

    const normalizedPaid = Number.isFinite(paid)
      ? paid
      : Number.isFinite(total)
        ? Math.max(normalizedTotal - normalizedDiscount, 0)
        : oldAmount;

    const balance = calculateBalance(
      normalizedTotal,
      normalizedDiscount,
      normalizedPaid,
    );

    return {
      ...transaction,
      total: normalizedTotal,
      discount: normalizedDiscount,
      paid: normalizedPaid,
      balance: balance,
      status: getTransactionStatus({
        total: normalizedTotal,
        discount: normalizedDiscount,
        paid: normalizedPaid,
      }),
    };
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
        total: 1700,
        discount: 0,
        paid: 1700,
        balance: 0,
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
        total: 2500,
        discount: 200,
        paid: 1000,
        balance: 1300,
        date: today,
        paymentMethod: "GCash",
        status: "Partial",
        notes: "Composite tooth filling.",
        createdTime: "10:30:00",
        createdAt: new Date().toISOString(),
      },
      {
        id: "TXN-SAMPLE-003",
        patientName: "John Cruz",
        service: "Tooth Extraction",
        total: 3500,
        discount: 0,
        paid: 0,
        balance: 3500,
        date: getPastDate(1),
        paymentMethod: "Card",
        status: "Unpaid",
        notes: "Tooth extraction treatment.",
        createdTime: "11:45:00",
        createdAt: new Date().toISOString(),
      },
      {
        id: "TXN-SAMPLE-004",
        patientName: "Angela Reyes",
        service: "Root Canal",
        total: 8500,
        discount: 500,
        paid: 3000,
        balance: 5000,
        date: getPastDate(2),
        paymentMethod: "Bank Transfer",
        status: "Partial",
        notes: "Root canal treatment.",
        createdTime: "14:00:00",
        createdAt: new Date().toISOString(),
      },
      {
        id: "TXN-SAMPLE-005",
        patientName: "Carlos Mendoza",
        service: "Braces Adjustment",
        total: 1800,
        discount: 0,
        paid: 1800,
        balance: 0,
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
        total: 800,
        discount: 0,
        paid: 800,
        balance: 0,
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

  function updateMonthlyCollectionDescription() {
    const now = new Date();

    const monthName = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    document.getElementById("monthlyCollectionDescription").textContent =
      `Payment collection for ${monthName}.`;
  }

  function calculateBalance(total, discount, paid) {
    const normalizedTotal = Math.max(Number(total) || 0, 0);

    const normalizedDiscount = Math.max(Number(discount) || 0, 0);

    const normalizedPaid = Math.max(Number(paid) || 0, 0);

    return Math.max(normalizedTotal - normalizedDiscount - normalizedPaid, 0);
  }

  function getTransactionStatus(transaction) {
    const total = Math.max(Number(transaction.total) || 0, 0);

    const discount = Math.max(Number(transaction.discount) || 0, 0);

    const paid = Math.max(Number(transaction.paid) || 0, 0);

    const balance = calculateBalance(total, discount, paid);

    if (balance <= 0) {
      return "Paid";
    }

    if (paid > 0) {
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
      const paid = Number(transaction.paid) || 0;

      if (paid <= 0) {
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

      if (methods[method]) {
        methods[method].amount += paid;
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
      .map(function (transaction) {
        return normalizeTransaction(transaction);
      })
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

      const status = getTransactionStatus(transaction);

      const statusClass = getStatusClass(status);

      const balance = calculateBalance(
        transaction.total,
        transaction.discount,
        transaction.paid,
      );

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
          ${escapeHtml(formatCurrency(transaction.total))}
        </td>

        <td class="amount-cell discount-cell">
          ${escapeHtml(formatCurrency(transaction.discount))}
        </td>

        <td class="amount-cell paid-cell">
          ${escapeHtml(formatCurrency(transaction.paid))}
        </td>

        <td class="amount-cell balance-cell">
          ${escapeHtml(formatCurrency(balance))}
        </td>

        <td>
          <span class="status-badge ${statusClass}">
            ${escapeHtml(status)}
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

  function updatePaymentCalculation() {
    const paid = Math.max(parseFloat(paymentAmountInput.value) || 0, 0);

    const status = paid > 0 ? "Paid" : "Unpaid";

    if (paymentStatusInput) {
      paymentStatusInput.value = status;
    }

    return {
      total: paid,
      discount: 0,
      paid: paid,
      balance: 0,
      status: status,
    };
  }

  function openPaymentModal(transaction = null) {
    paymentModal.classList.add("active");

    if (transaction) {
      const normalized = normalizeTransaction(transaction);

      editingTransactionId = normalized.id;

      modalTitle.textContent = "Edit Payment";

      transactionIdInput.value = normalized.id;

      patientNameInput.value = normalized.patientName || "";

      serviceNameInput.value = normalized.service || "";

      paymentAmountInput.value = normalized.paid || "";

      paymentDateInput.value = normalized.date || getTodayString();

      paymentMethodInput.value = normalized.paymentMethod || "";

      if (paymentStatusInput) {
        paymentStatusInput.value =
          normalized.status === "Paid" ? "Paid" : "Paid";
      }

      paymentNotesInput.value = normalized.notes || "";
    } else {
      editingTransactionId = null;

      modalTitle.textContent = "Record Payment";

      paymentForm.reset();

      transactionIdInput.value = "";

      paymentAmountInput.value = "";

      paymentDateInput.value = getTodayString();

      if (paymentStatusInput) {
        paymentStatusInput.value = "Paid";
      }
    }

    updatePaymentCalculation();

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

    const paid = parseFloat(paymentAmountInput.value);

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

    if (isNaN(paid) || paid <= 0) {
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

    const total = paid;
    const discount = 0;
    const balance = 0;
    const status = "Paid";

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
          total: total,
          discount: discount,
          paid: paid,
          balance: balance,
          date: date,
          paymentMethod: paymentMethod,
          status: status,
          notes: notes,
        };
      }

      showToast("Payment updated successfully.");
    } else {
      const newTransaction = {
        id: createTransactionId(),
        patientName: patientName,
        service: service,
        total: total,
        discount: discount,
        paid: paid,
        balance: balance,
        date: date,
        paymentMethod: paymentMethod,
        status: status,
        notes: notes,
        createdTime: createdTime,
        createdAt: new Date().toISOString(),
      };

      transactions.unshift(newTransaction);

      showToast("Payment recorded successfully.");
    }

    saveTransactions();

    closePaymentModal();

    renderPaymentMethods();

    renderTransactions();
  }

  function showTransactionDetails(transaction) {
    const normalized = normalizeTransaction(transaction);

    const detailTransactionId = document.getElementById("detailTransactionId");
    const detailPatient = document.getElementById("detailPatient");
    const detailService = document.getElementById("detailService");
    const detailAmount = document.getElementById("detailAmount");
    const detailTotal = document.getElementById("detailTotal");
    const detailDiscount = document.getElementById("detailDiscount");
    const detailPaid = document.getElementById("detailPaid");
    const detailBalance = document.getElementById("detailBalance");
    const detailMethod = document.getElementById("detailMethod");
    const detailDate = document.getElementById("detailDate");
    const detailStatus = document.getElementById("detailStatus");
    const detailNotes = document.getElementById("detailNotes");

    if (detailTransactionId) {
      detailTransactionId.textContent = normalized.id || "-";
    }

    if (detailPatient) {
      detailPatient.textContent = normalized.patientName || "-";
    }

    if (detailService) {
      detailService.textContent = normalized.service || "-";
    }

    if (detailTotal) {
      detailTotal.textContent = formatCurrency(normalized.total);
    }

    if (detailDiscount) {
      detailDiscount.textContent = formatCurrency(normalized.discount);
    }

    if (detailPaid) {
      detailPaid.textContent = formatCurrency(normalized.paid);
    }

    if (detailBalance) {
      detailBalance.textContent = formatCurrency(normalized.balance);
    }

    if (detailAmount) {
      detailAmount.textContent = formatCurrency(normalized.total);
    }

    if (detailMethod) {
      detailMethod.textContent = normalized.paymentMethod || "-";
    }

    if (detailDate) {
      detailDate.textContent = formatDate(normalized.date);
    }

    if (detailStatus) {
      detailStatus.textContent = normalized.status;

      detailStatus.className = `status-badge ${getStatusClass(normalized.status)}`;
    }

    if (detailNotes) {
      detailNotes.textContent = normalized.notes || "No notes.";
    }

    detailsModal.classList.add("active");

    if (window.lucide) {
      lucide.createIcons();
    }
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

    const normalized = normalizeTransaction(transaction);

    const confirmed = window.confirm(
      `Delete this payment record?\n\n` +
        `Patient: ${normalized.patientName}\n` +
        `Service: ${normalized.service}\n` +
        `Total: ${formatCurrency(normalized.total)}\n` +
        `Paid: ${formatCurrency(normalized.paid)}\n` +
        `Balance: ${formatCurrency(normalized.balance)}\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    transactions = transactions.filter(function (item) {
      return item.id !== id;
    });

    saveTransactions();

    renderPaymentMethods();

    renderTransactions();

    showToast("Payment record deleted successfully.");
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
