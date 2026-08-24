document.addEventListener("DOMContentLoaded", () => {
  const ITEMS_KEY = "dentanueva_inventory_items";
  const MOVEMENTS_KEY = "dentanueva_inventory_movements";
  const RESET_VERSION_KEY = "dentanueva_inventory_reset_version";
  const RESET_VERSION = "inventory-reset-2026-08-16-v1";
  const addItemBtn = document.getElementById("addItemBtn");
  const emptyAddItemBtn = document.getElementById("emptyAddItemBtn");
  const stockMovementBtn = document.getElementById("stockMovementBtn");
  const inventorySearch = document.getElementById("inventorySearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const expiryFilter = document.getElementById("expiryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const inventoryTableBody = document.getElementById("inventoryTableBody");
  const emptyState = document.getElementById("emptyState");
  const itemCount = document.getElementById("itemCount");
  let stockStatusIcon = document.getElementById("stockStatusIcon");
  function showInventoryMessage(message) {}
  function setupInventoryHeader() {
    if (!itemCount || !stockMovementBtn || !addItemBtn) {
      return;
    }
    const headerRight = itemCount.parentElement;
    if (!headerRight) {
      return;
    }
    if (stockStatusIcon) {
      stockStatusIcon.remove();
      stockStatusIcon = null;
    }
    const inventoryToast = document.getElementById("inventoryToast");
    if (inventoryToast) {
      inventoryToast.remove();
    }
    headerRight.appendChild(itemCount);
    const headerActions = headerRight.querySelector(
      ".inventory-header-actions",
    );
    if (headerActions) {
      headerRight.appendChild(headerActions);
    }
    [stockMovementBtn, addItemBtn].forEach((button) => {
      button.style.minHeight = "36px";
      button.style.height = "36px";
      button.style.padding = "0 12px";
      button.style.gap = "6px";
      button.style.borderRadius = "9px";
      button.style.fontSize = "0.68rem";
      button.style.whiteSpace = "nowrap";
    });
    const addItemText = addItemBtn.querySelector("span");
    if (addItemText) {
      addItemText.textContent = "Add Item";
    } else {
      addItemBtn.innerHTML =
        '<i class="fa-solid fa-plus"></i><span>Add Item</span>';
    }
  }
  setupInventoryHeader();
  const itemModal = document.getElementById("itemModal");
  const itemModalClose = document.getElementById("itemModalClose");
  const itemCancelBtn = document.getElementById("itemCancelBtn");
  const itemModalTitle = document.getElementById("itemModalTitle");
  const itemForm = document.getElementById("itemForm");
  const itemId = document.getElementById("itemId");
  const itemName = document.getElementById("itemName");
  const itemCategory = document.getElementById("itemCategory");
  const itemUnit = document.getElementById("itemUnit");
  const itemStock = document.getElementById("itemStock");
  const itemMinimum = document.getElementById("itemMinimum");
  const itemSupplier = document.getElementById("itemSupplier");
  const itemExpiry = document.getElementById("itemExpiry");
  const DENTAL_ITEM_CATEGORIES = {
    "Restorative Materials": [
      "Composite Resin",
      "Composite Resins",
      "Flowable Composite",
      "Flowable Composites",
      "Etching Gel",
      "Dental Bonding Agent",
      "Bonding Agent",
      "Universal Bond",
      "Glass Ionomer Cement",
      "Glass Ionomer",
      "Temporary Filling Material",
      "Dental Cement",
      "Zinc Oxide Eugenol",
    ],
    "Preventive Materials": [
      "Prophy Paste",
      "Prophylaxis Paste",
      "Fluoride Gel",
      "Fluoride Varnish",
      "Fluoride Foam",
      "Pit and Fissure Sealant",
      "Dental Sealant",
      "Pumice Powder",
    ],
    "Disposable Supplies": [
      "Cotton Rolls",
      "Sterile Gauze",
      "Dental Bibs",
      "Disposable Dental Cups",
      "Dental Cups",
      "Saliva Ejector",
      "High-Volume Suction Tip",
      "HVE Tip",
      "Air-Water Syringe Tip",
      "Three-Way Syringe Tip",
      "Microbrush",
      "Micro Brushes",
      "Cotton Swabs",
      "Paper Towels",
      "Dental Floss",
      "Disposable Gloves",
      "Nitrile Gloves",
      "Latex Gloves",
      "Surgical Face Mask",
      "Face Mask",
    ],
    "Infection Control": [
      "Surface Disinfectant",
      "Dental Disinfectant",
      "Instrument Disinfectant",
      "Hand Sanitizer",
      "Alcohol Pads",
      "Alcohol Swabs",
    ],
    "Sterilization Supplies": [
      "Sterilization Pouch",
      "Sterilization Pouches",
      "Sterilization Wrap",
      "Autoclave Indicator",
      "Sterilization Indicator",
    ],
    "Dental Instruments": [
      "Dental Mirror",
      "Mouth Mirror",
      "Dental Explorer",
      "Dental Probe",
      "Dental Tweezers",
      "College Tweezers",
      "Scaler",
      "Dental Scaler",
      "Curette",
      "Dental Curette",
      "Periodontal Probe",
    ],
    "Oral Care Supplies": [
      "Toothbrush",
      "Interdental Brush",
      "Mouthwash",
      "Oral Rinse",
      "Dental Floss",
    ],
  };
  const COMMON_DENTAL_ITEM_SUGGESTIONS = [
    "Composite Resin",
    "Etching Gel",
    "Dental Bonding Agent",
    "Glass Ionomer Cement",
    "Prophy Paste",
    "Fluoride Gel",
  ];
  const DENTAL_ITEM_SUGGESTIONS = [
    ...new Set(Object.values(DENTAL_ITEM_CATEGORIES).flat()),
  ];
  function normalizeDentalItemName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }
  function getAutomaticItemCategory(itemNameValue) {
    const normalizedName = normalizeDentalItemName(itemNameValue);
    if (!normalizedName) {
      return "";
    }
    for (const [category, itemNames] of Object.entries(
      DENTAL_ITEM_CATEGORIES,
    )) {
      const matched = itemNames.some(
        (name) => normalizeDentalItemName(name) === normalizedName,
      );
      if (matched) {
        return category;
      }
    }
    return "";
  }
  function ensureItemCategoryOption(category) {
    if (!itemCategory || !category) {
      return;
    }
    const existingOption = [...itemCategory.options].find(
      (option) =>
        normalizeDentalItemName(option.value) ===
          normalizeDentalItemName(category) ||
        normalizeDentalItemName(option.textContent) ===
          normalizeDentalItemName(category),
    );
    if (existingOption) {
      return;
    }
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    itemCategory.appendChild(option);
  }
  function autoSetItemCategoryFromName() {
    if (!itemName || !itemCategory) {
      return;
    }
    const automaticCategory = getAutomaticItemCategory(itemName.value);
    if (!automaticCategory) {
      return;
    }
    ensureItemCategoryOption(automaticCategory);
    itemCategory.value = automaticCategory;
    updateExpiryFieldState();
  }
  function setupDentalItemSuggestions() {
    if (!itemName) {
      return;
    }
    const datalistId = "dentalItemNameSuggestions";
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }
    function updateItemNameSuggestions() {
      const query = normalizeDentalItemName(itemName.value);
      const suggestions = query
        ? DENTAL_ITEM_SUGGESTIONS.filter((item) =>
            normalizeDentalItemName(item).includes(query),
          )
        : COMMON_DENTAL_ITEM_SUGGESTIONS;
      datalist.innerHTML = "";
      suggestions.forEach((item) => {
        const option = document.createElement("option");
        option.value = item;
        datalist.appendChild(option);
      });
    }
    updateItemNameSuggestions();
    itemName.setAttribute("list", datalistId);
    itemName.setAttribute("autocomplete", "off");
    itemName.addEventListener("input", () => {
      updateItemNameSuggestions();
      autoSetItemCategoryFromName();
    });
    itemName.addEventListener("change", () => {
      updateItemNameSuggestions();
      autoSetItemCategoryFromName();
    });
  }
  setupDentalItemSuggestions();
  const movementModal = document.getElementById("movementModal");
  const movementModalClose = document.getElementById("movementModalClose");
  const movementCancelBtn = document.getElementById("movementCancelBtn");
  const movementForm = document.getElementById("movementForm");
  const movementItem = document.getElementById("movementItem");
  const movementType = document.getElementById("movementType");
  const movementQuantity = document.getElementById("movementQuantity");
  const movementReason = document.getElementById("movementReason");
  const actionMenu = document.getElementById("actionMenu");
  let selectedActionItemId = null;
  if (itemCancelBtn) {
    itemCancelBtn.style.width = "82px";
    itemCancelBtn.style.minWidth = "82px";
    itemCancelBtn.style.padding = "0 10px";
  }
  if (movementCancelBtn) {
    movementCancelBtn.style.width = "82px";
    movementCancelBtn.style.minWidth = "82px";
    movementCancelBtn.style.padding = "0 10px";
  }
  const forecastMovementCount = document.getElementById(
    "forecastMovementCount",
  );
  const forecastUsageCount = document.getElementById("forecastUsageCount");
  const forecastItemsWithData = document.getElementById(
    "forecastItemsWithData",
  );
  const forecastTableBody = document.getElementById("forecastTableBody");
  const forecastEmpty = document.getElementById("forecastEmpty");
  const refreshForecastBtn = document.getElementById("refreshForecastBtn");
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
  const MIN_FORECAST_RECORDS = 3;
  function resetInventoryDataOnce() {
    const completedVersion = localStorage.getItem(RESET_VERSION_KEY);
    if (completedVersion === RESET_VERSION) {
      return;
    }
    localStorage.removeItem(ITEMS_KEY);
    localStorage.removeItem(MOVEMENTS_KEY);
    localStorage.setItem(RESET_VERSION_KEY, RESET_VERSION);
  }
  resetInventoryDataOnce();
  function initializeStorage() {
    if (!localStorage.getItem(ITEMS_KEY)) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(MOVEMENTS_KEY)) {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([]));
    }
  }
  initializeStorage();
  function getItems() {
    try {
      const raw = localStorage.getItem(ITEMS_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Unable to load inventory items:", error);
      return [];
    }
  }
  function saveItems(items) {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }
  function getMovements() {
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Unable to load inventory movements:", error);
      return [];
    }
  }
  function saveMovements(movements) {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  }
  function generateItemId() {
    const items = getItems();
    let number = 1;
    let id = `INV-${String(number).padStart(3, "0")}`;
    while (items.some((item) => String(item.id) === String(id))) {
      number++;
      id = `INV-${String(number).padStart(3, "0")}`;
    }
    return id;
  }
  function generateMovementId() {
    return "MOV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function getStockStatus(item) {
    const stock = Number(item.stock) || 0;
    const minimum = Number(item.minimum) || 0;
    if (stock <= 0) {
      return "out";
    }
    if (stock <= minimum) {
      return "low";
    }
    return "normal";
  }
  function getStatusLabel(status) {
    if (status === "out") {
      return "Out of Stock";
    }
    if (status === "low") {
      return "Low Stock";
    }
    return "Normal";
  }
  function getDaysUntilExpiry(dateString) {
    if (!dateString) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) {
      return null;
    }
    const difference = expiry.getTime() - today.getTime();
    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }
  function categoryHasExpiry(category) {
    const normalizedCategory = String(category || "")
      .trim()
      .toLowerCase();
    return (
      !normalizedCategory.includes("instrument") &&
      !normalizedCategory.includes("equipment")
    );
  }
  function getExpiryStatus(item) {
    if (!categoryHasExpiry(item.category) || !item.expiry) {
      return "no-expiry";
    }
    const days = getDaysUntilExpiry(item.expiry);
    if (days === null) {
      return "no-expiry";
    }
    if (days <= 0) {
      return "expired";
    }
    if (days <= 7) {
      return "expiring-soon";
    }
    return "normal";
  }
  function updateExpiryFieldState() {
    if (!itemExpiry || !itemCategory) {
      return;
    }
    const hasExpiry = categoryHasExpiry(itemCategory.value);
    itemExpiry.disabled = !hasExpiry;
    if (!hasExpiry) {
      itemExpiry.value = "";
    }
  }
  function formatExpiry(dateString) {
    if (!dateString) {
      return `<span class="no-expiry">No expiry</span>`;
    }
    const days = getDaysUntilExpiry(dateString);
    const date = new Date(`${dateString}T00:00:00`);
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (days !== null && days <= 0) {
      return `<span class="expiry-danger">Expired</span>`;
    }
    if (days !== null && days <= 7) {
      return `<span class="expiry-warning">${escapeHTML(formatted)}</span>`;
    }
    return `<span class="expiry-normal">${escapeHTML(formatted)}</span>`;
  }
  function renderCategoryFilter() {
    if (!categoryFilter) {
      return;
    }
    const items = getItems();
    const categories = [
      ...new Set(items.map((item) => item.category).filter(Boolean)),
    ].sort((a, b) => String(a).localeCompare(String(b)));
    const currentValue = categoryFilter.value || "all";
    categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
    if (categories.includes(currentValue)) {
      categoryFilter.value = currentValue;
    } else {
      categoryFilter.value = "all";
    }
  }
  function getFilteredItems() {
    const items = getItems();
    const searchValue = inventorySearch.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedExpiry = expiryFilter ? expiryFilter.value : "all";
    const selectedSort = sortFilter.value;
    let filtered = items.filter((item) => {
      const itemName = String(item.name || "").toLowerCase();
      const itemCategory = String(item.category || "").toLowerCase();
      const itemSupplier = String(item.supplier || "").toLowerCase();
      const matchesSearch =
        !searchValue ||
        itemName.includes(searchValue) ||
        itemCategory.includes(searchValue) ||
        itemSupplier.includes(searchValue);
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "all" || getStockStatus(item) === selectedStatus;
      const matchesExpiry =
        selectedExpiry === "all" || getExpiryStatus(item) === selectedExpiry;
      return matchesSearch && matchesCategory && matchesStatus && matchesExpiry;
    });
    filtered.sort((a, b) => {
      if (selectedSort === "name-asc") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      if (selectedSort === "name-desc") {
        return String(b.name || "").localeCompare(String(a.name || ""));
      }
      if (selectedSort === "stock-low") {
        return Number(a.stock || 0) - Number(b.stock || 0);
      }
      if (selectedSort === "stock-high") {
        return Number(b.stock || 0) - Number(a.stock || 0);
      }
      if (selectedSort === "expiry") {
        const aExpiry = a.expiry ? new Date(a.expiry).getTime() : Infinity;
        const bExpiry = b.expiry ? new Date(b.expiry).getTime() : Infinity;
        return aExpiry - bExpiry;
      }
      return 0;
    });
    return filtered;
  }
  function renderInventoryTable() {
    if (!inventoryTableBody) {
      return;
    }
    const filteredItems = getFilteredItems();
    inventoryTableBody.innerHTML = "";
    itemCount.textContent = `${filteredItems.length} ${filteredItems.length === 1 ? "item" : "items"}`;
    if (emptyState) {
      emptyState.hidden = true;
      emptyState.style.display = "none";
    }
    if (filteredItems.length === 0 && emptyState) {
      emptyState.hidden = false;
      emptyState.style.display = "flex";
    }
    filteredItems.forEach((item) => {
      const status = getStockStatus(item);
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>
            <div class="item-cell">
              <div class="item-avatar">
                <i class="fa-solid fa-box"></i>
              </div>
              <div class="item-info">
                <span class="item-name" title="${escapeHTML(item.name)}">
                  ${escapeHTML(item.name)}
                </span>
                <span class="item-id">
                  ${escapeHTML(item.id)}
                </span>
              </div>
            </div>
          </td>
          <td>
            <span class="category-badge">
              ${escapeHTML(item.category)}
            </span>
          </td>
          <td>
            <span class="stock-value">
              ${Number(item.stock) || 0}
            </span>
            <span class="stock-unit">
              ${escapeHTML(item.unit)}
            </span>
          </td>
          <td>
            <span class="minimum-value">
              ${Number(item.minimum) || 0}
            </span>
          </td>
          <td>
            ${escapeHTML(item.unit)}
          </td>
          <td>
            ${formatExpiry(item.expiry)}
          </td>
          <td>
            <span class="status-badge status-${status}">
              ${getStatusLabel(status)}
            </span>
          </td>
          <td>
            <button
              type="button"
              class="action-button"
              data-item-id="${escapeHTML(item.id)}"
              aria-label="Item actions"
            >
              <i class="fa-solid fa-ellipsis"></i>
            </button>
          </td>
        `;
      inventoryTableBody.appendChild(row);
    });
  }
  function updateStatistics() {
    const items = getItems();
    const lowStockItems = items.filter(
      (item) => getStockStatus(item) === "low",
    );
    const outOfStockItems = items.filter(
      (item) => getStockStatus(item) === "out",
    );
    updateStockStatusIcon(lowStockItems.length, outOfStockItems.length);
  }
  function updateStockStatusIcon(lowCount, outCount) {
    if (!stockStatusIcon) {
      return;
    }
    const hasWarning = lowCount > 0 || outCount > 0;
    stockStatusIcon.classList.toggle("has-warning", hasWarning);
    if (outCount > 0) {
      stockStatusIcon.title = `${outCount} ${outCount === 1 ? "item is" : "items are"} out of stock${
        lowCount > 0
          ? ` and ${lowCount} ${lowCount === 1 ? "item is" : "items are"} low on stock.`
          : "."
      }`;
      return;
    }
    if (lowCount > 0) {
      stockStatusIcon.title = `${lowCount} ${lowCount === 1 ? "item needs" : "items need"} attention because stock is at or below the minimum level.`;
      return;
    }
    stockStatusIcon.title =
      "All inventory items are currently above their minimum stock levels.";
  }
  function openItemModal(item = null) {
    closeActionMenu();
    itemForm.reset();
    if (item) {
      itemModalTitle.textContent = "Edit Inventory Item";
      itemId.value = item.id;
      itemName.value = item.name;
      ensureItemCategoryOption(item.category);
      itemCategory.value = item.category;
      itemUnit.value = item.unit;
      itemStock.value = item.stock;
      itemMinimum.value = item.minimum;
      itemSupplier.value = item.supplier || "";
      itemExpiry.value = item.expiry || "";
    } else {
      itemModalTitle.textContent = "Add Inventory Item";
      itemId.value = "";
      itemStock.value = "0";
      itemMinimum.value = "5";
    }
    updateExpiryFieldState();
    itemModal.classList.add("active");
    itemModal.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      itemName.focus();
    }, 100);
  }
  function closeItemModal() {
    itemModal.classList.remove("active");
    itemModal.setAttribute("aria-hidden", "true");
  }
  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = itemName.value.trim();
    const automaticCategory = getAutomaticItemCategory(name);
    if (automaticCategory) {
      ensureItemCategoryOption(automaticCategory);
      itemCategory.value = automaticCategory;
    }
    const category = itemCategory.value;
    const unit = itemUnit.value.trim();
    const stock = Number(itemStock.value);
    const minimum = Number(itemMinimum.value);
    const supplier = itemSupplier.value.trim();
    const expiry = categoryHasExpiry(category) ? itemExpiry.value : "";
    if (!name) {
      showInventoryMessage("Please enter the item name.");
      return;
    }
    if (!category) {
      showInventoryMessage("Please select a category.");
      return;
    }
    if (!unit) {
      showInventoryMessage("Please enter the unit.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      showInventoryMessage("Current stock cannot be negative.");
      return;
    }
    if (Number.isNaN(minimum) || minimum < 0) {
      showInventoryMessage("Minimum stock cannot be negative.");
      return;
    }
    if (minimum > stock) {
      showInventoryMessage(
        "Minimum stock cannot be greater than current stock.",
      );
      return;
    }
    const items = getItems();
    const existingId = itemId.value;
    if (existingId) {
      const index = items.findIndex(
        (item) => String(item.id) === String(existingId),
      );
      if (index !== -1) {
        items[index] = {
          ...items[index],
          name,
          category,
          unit,
          stock,
          minimum,
          supplier,
          expiry,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      items.push({
        id: generateItemId(),
        name,
        category,
        unit,
        stock,
        minimum,
        supplier,
        expiry,
        createdAt: new Date().toISOString(),
      });
    }
    saveItems(items);
    renderAll();
    closeItemModal();
    if (existingId) {
      showInventoryMessage("Inventory item updated successfully.");
    } else {
      showInventoryMessage("Inventory item added successfully.");
    }
  });
  function openMovementModal(selectedItemId = "") {
    closeActionMenu();
    movementForm.reset();
    movementType.value = "stock-in";
    movementQuantity.value = "1";
    populateMovementItems(selectedItemId);
    if (selectedItemId) {
      movementItem.value = selectedItemId;
    }
    movementModal.classList.add("active");
    movementModal.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      movementItem.focus();
    }, 100);
  }
  function closeMovementModal() {
    movementModal.classList.remove("active");
    movementModal.setAttribute("aria-hidden", "true");
  }
  function populateMovementItems(selectedItemId = "") {
    const items = getItems();
    movementItem.innerHTML = `<option value="">Select item</option>`;
    const itemsToShow = selectedItemId
      ? items.filter((item) => String(item.id) === String(selectedItemId))
      : [...items].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        );
    itemsToShow.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.name} — ${item.stock} ${item.unit}`;
      movementItem.appendChild(option);
    });
    if (selectedItemId && itemsToShow.length > 0) {
      movementItem.value = selectedItemId;
    }
  }
  movementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedId = movementItem.value;
    const type = movementType.value;
    const quantity = Number(movementQuantity.value);
    const reason = movementReason.value.trim();
    if (!selectedId) {
      showInventoryMessage("Please select an inventory item.");
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      showInventoryMessage("Please enter a valid quantity.");
      return;
    }
    const items = getItems();
    const itemIndex = items.findIndex(
      (item) => String(item.id) === String(selectedId),
    );
    if (itemIndex === -1) {
      showInventoryMessage("The selected inventory item could not be found.");
      return;
    }
    const item = items[itemIndex];
    const previousStock = Number(item.stock) || 0;
    let newStock = previousStock;
    if (type === "stock-in") {
      newStock = previousStock + quantity;
    }
    if (type === "stock-out") {
      if (quantity > previousStock) {
        showInventoryMessage(
          `Insufficient stock. Available: ${previousStock} ${item.unit}. Requested: ${quantity} ${item.unit}.`,
        );
        return;
      }
      newStock = previousStock - quantity;
    }
    item.stock = newStock;
    item.updatedAt = new Date().toISOString();
    saveItems(items);
    const movements = getMovements();
    movements.push({
      id: generateMovementId(),
      itemId: item.id,
      itemName: item.name,
      type,
      quantity,
      previousStock,
      newStock,
      reason:
        reason ||
        (type === "stock-in" ? "Stock replenishment" : "Inventory usage"),
      date: new Date().toISOString(),
    });
    saveMovements(movements);
    renderAll();
    closeMovementModal();
    if (type === "stock-in") {
      showInventoryMessage(`${quantity} ${item.unit} added to ${item.name}.`);
    } else {
      showInventoryMessage(
        `${quantity} ${item.unit} deducted from ${item.name}.`,
      );
    }
  });
  function openActionMenu(button, id) {
    selectedActionItemId = id;
    const rect = button.getBoundingClientRect();
    actionMenu.classList.add("active");
    const menuWidth = actionMenu.offsetWidth;
    const menuHeight = actionMenu.offsetHeight;
    let left = rect.right - menuWidth;
    let top = rect.bottom + 6;
    if (left < 8) {
      left = 8;
    }
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - 6;
    }
    actionMenu.style.left = `${left}px`;
    actionMenu.style.top = `${top}px`;
  }
  function closeActionMenu() {
    actionMenu.classList.remove("active");
    selectedActionItemId = null;
  }
  actionMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const id = selectedActionItemId;
    if (!id) {
      return;
    }
    const items = getItems();
    const item = items.find(
      (inventoryItem) => String(inventoryItem.id) === String(id),
    );
    if (!item) {
      closeActionMenu();
      return;
    }
    if (action === "edit") {
      openItemModal(item);
      return;
    }
    if (action === "movement") {
      openMovementModal(id);
      return;
    }
    if (action === "delete") {
      deleteItem(item);
    }
  });
  function deleteItem(item) {
    closeActionMenu();
    const confirmed = confirm(
      `Are you sure you want to delete "${item.name}"?\n\nThis will delete the inventory item AND all stock movement history associated with this item.\n\nThis action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    const remainingItems = getItems().filter(
      (inventoryItem) => String(inventoryItem.id) !== String(item.id),
    );
    saveItems(remainingItems);
    const remainingMovements = getMovements().filter(
      (movement) => String(movement.itemId) !== String(item.id),
    );
    saveMovements(remainingMovements);
    renderAll();
    showInventoryMessage(`"${item.name}" was deleted successfully.`);
  }
  inventoryTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".action-button");
    if (!button) {
      return;
    }
    const id = button.dataset.itemId;
    openActionMenu(button, id);
  });
  inventorySearch.addEventListener("input", renderInventoryTable);
  categoryFilter.addEventListener("change", renderInventoryTable);
  statusFilter.addEventListener("change", renderInventoryTable);
  if (expiryFilter) {
    expiryFilter.addEventListener("change", renderInventoryTable);
  }
  sortFilter.addEventListener("change", renderInventoryTable);
  itemCategory.addEventListener("change", updateExpiryFieldState);
  addItemBtn.addEventListener("click", () => {
    openItemModal();
  });
  emptyAddItemBtn.addEventListener("click", () => {
    openItemModal();
  });
  stockMovementBtn.addEventListener("click", () => {
    openMovementModal();
  });
  if (stockStatusIcon) {
    stockStatusIcon.addEventListener("click", () => {
      statusFilter.value = "low";
      const items = getItems();
      const hasLowStock = items.some((item) => getStockStatus(item) === "low");
      if (!hasLowStock) {
        statusFilter.value = "out";
      }
      renderInventoryTable();
      document.querySelector(".inventory-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }
  itemModalClose.addEventListener("click", closeItemModal);
  itemCancelBtn.addEventListener("click", closeItemModal);
  movementModalClose.addEventListener("click", closeMovementModal);
  movementCancelBtn.addEventListener("click", closeMovementModal);
  itemModal.addEventListener("click", (event) => {
    if (event.target === itemModal) {
      closeItemModal();
    }
  });
  movementModal.addEventListener("click", (event) => {
    if (event.target === movementModal) {
      closeMovementModal();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      actionMenu.classList.contains("active") &&
      !event.target.closest(".action-menu") &&
      !event.target.closest(".action-button")
    ) {
      closeActionMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    closeItemModal();
    closeMovementModal();
    closeActionMenu();
  });
  window.addEventListener("resize", () => {
    closeActionMenu();
  });
  function getUsageMovements() {
    return getMovements().filter((movement) => movement.type === "stock-out");
  }
  function buildForecastData() {
    const items = getItems();
    const usageMovements = getUsageMovements();
    return items
      .map((item) => {
        const records = usageMovements.filter(
          (movement) => String(movement.itemId) === String(item.id),
        );
        const totalUsed = records.reduce(
          (total, movement) => total + Number(movement.quantity || 0),
          0,
        );
        const hasEnoughData = records.length >= MIN_FORECAST_RECORDS;
        const average = hasEnoughData ? totalUsed / records.length : null;
        const estimate = hasEnoughData
          ? Math.max(1, Math.round(average))
          : null;
        return {
          item,
          records,
          usageRecords: records.length,
          totalUsed,
          average,
          estimate,
          hasEnoughData,
        };
      })
      .filter((forecast) => forecast.usageRecords > 0)
      .sort((a, b) => b.usageRecords - a.usageRecords);
  }
  function renderForecast() {
    const movements = getMovements();
    const usageMovements = getUsageMovements();
    const forecastData = buildForecastData();
    if (forecastMovementCount) {
      forecastMovementCount.textContent = movements.length;
    }
    if (forecastUsageCount) {
      forecastUsageCount.textContent = usageMovements.length;
    }
    if (forecastItemsWithData) {
      forecastItemsWithData.textContent = forecastData.length;
    }
    if (!forecastTableBody) {
      return;
    }
    forecastTableBody.innerHTML = "";
    if (forecastEmpty) {
      forecastEmpty.hidden = true;
      forecastEmpty.style.display = "none";
    }
    if (forecastData.length === 0) {
      if (forecastEmpty) {
        forecastEmpty.hidden = false;
        forecastEmpty.style.display = "flex";
      }
      return;
    }
    forecastData.forEach((forecast) => {
      const row = document.createElement("tr");
      const hasEnoughData = forecast.hasEnoughData;
      const statusText = hasEnoughData ? "Usable Data" : "Limited Data";
      const statusClass = hasEnoughData ? "" : "insufficient";
      const averageHTML = hasEnoughData
        ? `
              <span class="forecast-average">
                ${forecast.average.toFixed(1)}
              </span>
              <span class="forecast-unit">
                ${escapeHTML(forecast.item.unit)}
              </span>
            `
        : `
              <span class="forecast-average">
                —
              </span>
            `;
      const estimateHTML = hasEnoughData
        ? `
              <span class="forecast-estimate">
                ${forecast.estimate}
              </span>
              <span class="forecast-unit">
                ${escapeHTML(forecast.item.unit)}
              </span>
            `
        : `
              <span class="forecast-estimate">
                —
              </span>
            `;
      row.innerHTML = `
          <td>
            <div class="forecast-item-cell">
              <div class="forecast-item-icon">
                <i class="fa-solid fa-box"></i>
              </div>
              <span class="forecast-item-name">
                ${escapeHTML(forecast.item.name)}
              </span>
            </div>
          </td>
          <td>
            <span class="forecast-number">
              ${forecast.usageRecords}
            </span>
          </td>
          <td>
            <span class="forecast-number">
              ${forecast.totalUsed}
            </span>
            <span class="forecast-unit">
              ${escapeHTML(forecast.item.unit)}
            </span>
          </td>
          <td>
            ${averageHTML}
          </td>
          <td>
            ${estimateHTML}
          </td>
          <td>
            <span class="forecast-data-status ${statusClass}">
              ${statusText}
            </span>
          </td>
        `;
      forecastTableBody.appendChild(row);
    });
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
    const usageMovements = [...getUsageMovements()].sort(
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
    const forecastData = buildForecastData();
    const usageMovements = getUsageMovements();
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
  if (refreshForecastBtn) {
    refreshForecastBtn.addEventListener("click", () => {
      renderForecast();
      renderForecastChart();
    });
  }
  window.addEventListener("storage", (event) => {
    if (event.key === ITEMS_KEY || event.key === MOVEMENTS_KEY) {
      renderAll();
    }
  });
  function renderAll() {
    renderCategoryFilter();
    renderInventoryTable();
    updateStatistics();
    populateMovementItems();
    renderForecast();
    renderForecastChart();
  }
  renderAll();
});
