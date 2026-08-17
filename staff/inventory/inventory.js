window.InventoryShared = (function () {
  const ITEMS_KEY = "dentanueva_inventory_items";
  const MOVEMENTS_KEY = "dentanueva_inventory_movements";

  const RESET_VERSION_KEY = "dentanueva_inventory_reset_version";
  const RESET_VERSION = "inventory-reset-2026-08-16-v1";

  const MIN_FORECAST_RECORDS = 3;

  const DATA_CHANGED_EVENT = "inventory:data-changed";

  function resetInventoryDataOnce() {
    const completedVersion = localStorage.getItem(RESET_VERSION_KEY);

    if (completedVersion === RESET_VERSION) {
      return;
    }

    localStorage.removeItem(ITEMS_KEY);
    localStorage.removeItem(MOVEMENTS_KEY);

    localStorage.setItem(RESET_VERSION_KEY, RESET_VERSION);
  }

  function initializeStorage() {
    if (!localStorage.getItem(ITEMS_KEY)) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify([]));
    }

    if (!localStorage.getItem(MOVEMENTS_KEY)) {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([]));
    }
  }

  resetInventoryDataOnce();
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

  function formatExpiry(dateString) {
    if (!dateString) {
      return `
        <span class="no-expiry">
          No expiry
        </span>
      `;
    }

    const days = getDaysUntilExpiry(dateString);

    const date = new Date(`${dateString}T00:00:00`);

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (days !== null && days < 0) {
      return `
        <span class="expiry-danger">
          Expired
        </span>
      `;
    }

    if (days !== null && days <= 30) {
      return `
        <span class="expiry-danger">
          ${escapeHTML(formatted)}
        </span>
      `;
    }

    if (days !== null && days <= 90) {
      return `
        <span class="expiry-warning">
          ${escapeHTML(formatted)}
        </span>
      `;
    }

    return `
      <span class="expiry-normal">
        ${escapeHTML(formatted)}
      </span>
    `;
  }

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
          (total, movement) => total + Number(movement.quantity),
          0,
        );

        const average = records.length ? totalUsed / records.length : 0;

        const estimate =
          records.length >= MIN_FORECAST_RECORDS
            ? Math.max(1, Math.ceil(average))
            : 0;

        return {
          item,

          usageRecords: records.length,

          totalUsed,

          average,

          estimate,

          hasEnoughData: records.length >= MIN_FORECAST_RECORDS,
        };
      })
      .filter((forecast) => forecast.usageRecords > 0)
      .sort((a, b) =>
        String(a.item.name || "").localeCompare(String(b.item.name || "")),
      );
  }

  function notifyDataChanged() {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }

  return {
    ITEMS_KEY,
    MOVEMENTS_KEY,
    MIN_FORECAST_RECORDS,
    DATA_CHANGED_EVENT,

    getItems,
    saveItems,
    getMovements,
    saveMovements,

    generateItemId,
    generateMovementId,

    escapeHTML,
    getStockStatus,
    getStatusLabel,
    getDaysUntilExpiry,
    formatExpiry,

    getUsageMovements,
    buildForecastData,

    notifyDataChanged,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.querySelectorAll(".inventory-page-btn");
  const pageSections = document.querySelectorAll("[data-page-section]");
  const panelHeader = document.querySelector(".panel-header");

  function goToPage(pageNumber) {
    navButtons.forEach((button) => {
      const isActive = button.dataset.page === String(pageNumber);

      button.classList.toggle("active", isActive);

      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    pageSections.forEach((section) => {
      section.classList.toggle(
        "active",
        section.dataset.pageSection === String(pageNumber),
      );
    });

    if (panelHeader) {
      panelHeader.style.display = String(pageNumber) === "1" ? "" : "none";
    }
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(button.dataset.page);
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const shared = window.InventoryShared;

  const addItemBtn = document.getElementById("addItemBtn");
  const emptyAddItemBtn = document.getElementById("emptyAddItemBtn");

  const stockMovementBtn = document.getElementById("stockMovementBtn");

  const inventorySearch = document.getElementById("inventorySearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  const inventoryTableBody = document.getElementById("inventoryTableBody");

  const emptyState = document.getElementById("emptyState");

  const itemCount = document.getElementById("itemCount");

  let stockStatusIcon = document.getElementById("stockStatusIcon");

  const commonInventoryItems = [
    {
      name: "Prophy Paste",
      category: "Dental Materials",
      unit: "Tube",
    },
    {
      name: "Fluoride Varnish",
      category: "Medications",
      unit: "Box",
    },
    {
      name: "Cotton Rolls",
      category: "Dental Supplies",
      unit: "Pack",
    },
    {
      name: "Saliva Ejectors",
      category: "Dental Supplies",
      unit: "Pack",
    },
    {
      name: "Disposable Gloves",
      category: "PPE",
      unit: "Box",
    },
    {
      name: "Surgical Masks",
      category: "PPE",
      unit: "Box",
    },
  ];

  const dentalItemSuggestions = [
    {
      name: "Composite Resins",
      category: "Restorative Materials",
      unit: "Syringe",
      keywords: ["composite", "composite resin", "resin"],
    },
    {
      name: "Dental Etchant",
      category: "Dental Materials",
      unit: "Syringe",
      keywords: ["etchant", "etching", "acid etch"],
    },
    {
      name: "Bonding Agent",
      category: "Dental Materials",
      unit: "Bottle",
      keywords: ["bonding", "bond", "adhesive"],
    },
    {
      name: "Glass Ionomer Cement",
      category: "Restorative Materials",
      unit: "Set",
      keywords: ["glass ionomer", "gi cement", "gic"],
    },
    {
      name: "Dental Alginate",
      category: "Impression Materials",
      unit: "Pack",
      keywords: ["alginate", "impression"],
    },
    {
      name: "Dental Impression Trays",
      category: "Dental Supplies",
      unit: "Set",
      keywords: ["impression tray", "impression trays"],
    },
    {
      name: "Dental Floss",
      category: "Oral Care Supplies",
      unit: "Box",
      keywords: ["floss", "dental floss"],
    },
    {
      name: "Interdental Brushes",
      category: "Oral Care Supplies",
      unit: "Pack",
      keywords: ["interdental", "interdental brush"],
    },
    {
      name: "Topical Anesthetic",
      category: "Medications",
      unit: "Tube",
      keywords: ["topical anesthetic", "anesthetic gel", "anesthetic"],
    },
    {
      name: "Local Anesthetic",
      category: "Medications",
      unit: "Box",
      keywords: ["local anesthetic", "lidocaine", "anesthetic cartridge"],
    },
    {
      name: "Dental Needles",
      category: "Dental Supplies",
      unit: "Box",
      keywords: ["dental needle", "needles", "needle"],
    },
    {
      name: "Dental Syringes",
      category: "Dental Supplies",
      unit: "Box",
      keywords: ["dental syringe", "syringes", "syringe"],
    },
    {
      name: "Dental Burs",
      category: "Dental Instruments",
      unit: "Box",
      keywords: ["bur", "burs", "dental bur"],
    },
    {
      name: "Prophy Cups",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["prophy cup", "prophy cups"],
    },
    {
      name: "Prophy Brushes",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["prophy brush", "prophy brushes"],
    },
    {
      name: "Dental Suction Tips",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["suction tip", "suction tips"],
    },
    {
      name: "Dental Bibs",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["dental bib", "dental bibs", "bib"],
    },
    {
      name: "Patient Cups",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["patient cup", "patient cups", "cup"],
    },
    {
      name: "Paper Towels",
      category: "Clinic Supplies",
      unit: "Pack",
      keywords: ["paper towel", "paper towels"],
    },
    {
      name: "Alcohol",
      category: "Disinfectants",
      unit: "Bottle",
      keywords: ["alcohol", "isopropyl alcohol"],
    },
    {
      name: "Surface Disinfectant",
      category: "Disinfectants",
      unit: "Bottle",
      keywords: ["surface disinfectant", "disinfectant"],
    },
    {
      name: "Dental Cotton Pellets",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["cotton pellet", "cotton pellets"],
    },
    {
      name: "Dental Gauze",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["gauze", "dental gauze"],
    },
    {
      name: "Sterilization Pouches",
      category: "Sterilization Supplies",
      unit: "Pack",
      keywords: ["sterilization pouch", "sterilization pouches"],
    },
    {
      name: "Autoclave Indicator Strips",
      category: "Sterilization Supplies",
      unit: "Pack",
      keywords: ["autoclave indicator", "indicator strip"],
    },
    {
      name: "Disposable Syringe Tips",
      category: "Dental Supplies",
      unit: "Pack",
      keywords: ["syringe tip", "syringe tips"],
    },
    {
      name: "Matrix Bands",
      category: "Restorative Materials",
      unit: "Pack",
      keywords: ["matrix band", "matrix bands"],
    },
    {
      name: "Dental Wedges",
      category: "Restorative Materials",
      unit: "Pack",
      keywords: ["dental wedge", "wedges"],
    },
    {
      name: "Articulating Paper",
      category: "Dental Materials",
      unit: "Pack",
      keywords: ["articulating paper", "bite paper"],
    },
    {
      name: "Temporary Filling Material",
      category: "Restorative Materials",
      unit: "Jar",
      keywords: ["temporary filling", "temporary restoration"],
    },
    {
      name: "Calcium Hydroxide",
      category: "Dental Materials",
      unit: "Tube",
      keywords: ["calcium hydroxide"],
    },
    {
      name: "Zinc Oxide Eugenol",
      category: "Dental Materials",
      unit: "Set",
      keywords: ["zinc oxide", "eugenol", "zinc oxide eugenol", "zoe"],
    },
    {
      name: "Dental Cement",
      category: "Dental Materials",
      unit: "Set",
      keywords: ["dental cement", "cement"],
    },
    {
      name: "Fluoride Gel",
      category: "Preventive Materials",
      unit: "Bottle",
      keywords: ["fluoride gel", "fluoride"],
    },
    {
      name: "Mouthwash",
      category: "Oral Care Supplies",
      unit: "Bottle",
      keywords: ["mouthwash", "oral rinse"],
    },
    {
      name: "Toothbrush",
      category: "Oral Care Supplies",
      unit: "Piece",
      keywords: ["toothbrush", "tooth brush"],
    },
    {
      name: "Toothpaste",
      category: "Oral Care Supplies",
      unit: "Tube",
      keywords: ["toothpaste", "tooth paste"],
    },
  ];

  const allKnownDentalItems = [
    ...commonInventoryItems,
    ...dentalItemSuggestions,
  ];

  function setupInventoryHeader() {
    if (!itemCount || !stockMovementBtn || !addItemBtn) {
      return;
    }

    const headerRight = itemCount.parentElement;

    if (!headerRight) {
      return;
    }

    if (!stockStatusIcon) {
      stockStatusIcon = document.createElement("button");
      stockStatusIcon.type = "button";
      stockStatusIcon.id = "stockStatusIcon";
      stockStatusIcon.className = "stock-status-icon";
      stockStatusIcon.setAttribute("aria-label", "Inventory stock status");
      stockStatusIcon.innerHTML =
        '<i class="fa-solid fa-triangle-exclamation"></i>';
    }

    headerRight.appendChild(itemCount);
    headerRight.appendChild(stockStatusIcon);
    headerRight.appendChild(stockMovementBtn);
    headerRight.appendChild(addItemBtn);

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
      addItemText.textContent = "Add Patient";
    } else {
      addItemBtn.innerHTML =
        '<i class="fa-solid fa-plus"></i><span>Add Patient</span>';
    }

    stockStatusIcon.style.width = "32px";
    stockStatusIcon.style.height = "32px";
    stockStatusIcon.style.minWidth = "32px";
    stockStatusIcon.style.padding = "0";
    stockStatusIcon.style.display = "inline-flex";
    stockStatusIcon.style.alignItems = "center";
    stockStatusIcon.style.justifyContent = "center";
    stockStatusIcon.style.border = "none";
    stockStatusIcon.style.background = "transparent";
    stockStatusIcon.style.color = "#d9950b";
    stockStatusIcon.style.fontSize = "0.9rem";
    stockStatusIcon.style.cursor = "pointer";
    stockStatusIcon.style.flexShrink = "0";
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

  if (itemSupplier) {
    itemSupplier.removeAttribute("required");
    itemSupplier.setAttribute("aria-required", "false");
  }

  if (itemExpiry) {
    itemExpiry.removeAttribute("required");
    itemExpiry.setAttribute("aria-required", "false");
  }

  const movementModal = document.getElementById("movementModal");

  const movementModalClose = document.getElementById("movementModalClose");

  const movementCancelBtn = document.getElementById("movementCancelBtn");

  const movementForm = document.getElementById("movementForm");

  const movementItem = document.getElementById("movementItem");

  const movementType = document.getElementById("movementType");

  const movementQuantity = document.getElementById("movementQuantity");

  const movementReason = document.getElementById("movementReason");

  const actionMenu = document.getElementById("actionMenu");

  let itemDetailsModal = null;

  let selectedActionItemId = null;

  function ensureViewDetailsAction() {
    if (!actionMenu) {
      return;
    }

    if (actionMenu.querySelector('[data-action="view-details"]')) {
      return;
    }

    const viewButton = document.createElement("button");

    viewButton.type = "button";

    viewButton.dataset.action = "view-details";

    viewButton.innerHTML = '<i class="fa-solid fa-eye"></i> View Details';

    const firstButton = actionMenu.querySelector("button");

    if (firstButton) {
      actionMenu.insertBefore(viewButton, firstButton);
    } else {
      actionMenu.appendChild(viewButton);
    }
  }

  ensureViewDetailsAction();

  function setupItemSuggestions() {
    if (!itemName) {
      return;
    }

    let dataList = document.getElementById("inventoryItemSuggestions");

    if (!dataList) {
      dataList = document.createElement("datalist");

      dataList.id = "inventoryItemSuggestions";

      document.body.appendChild(dataList);
    }

    itemName.setAttribute("list", "inventoryItemSuggestions");

    if (itemUnit) {
      itemUnit.placeholder = "e.g. Box, Pack, Tube, Piece";

      itemUnit.title =
        "Unit guide: Box for gloves/masks, Pack for cotton rolls/saliva ejectors, Tube for prophy paste, Piece for individual items.";

      let unitGuide = document.getElementById("inventoryUnitGuide");

      if (!unitGuide) {
        unitGuide = document.createElement("small");

        unitGuide.id = "inventoryUnitGuide";

        unitGuide.textContent =
          "Unit guide: Box = gloves/masks • Pack = cotton rolls/supplies • Tube = paste/toothpaste • Bottle = liquids • Piece = individual items";

        unitGuide.style.display = "block";
        unitGuide.style.marginTop = "2px";
        unitGuide.style.color = "#87938c";
        unitGuide.style.fontSize = "0.58rem";
        unitGuide.style.lineHeight = "1.5";

        const unitGroup = itemUnit.closest(".form-group");

        if (unitGroup) {
          unitGroup.appendChild(unitGuide);
        }
      }
    }

    function renderSuggestions(searchValue = "") {
      const value = String(searchValue || "")
        .trim()
        .toLowerCase();

      let matches = [];

      if (!value) {
        matches = commonInventoryItems;
      } else {
        matches = allKnownDentalItems.filter((item) => {
          const itemNameValue = item.name.toLowerCase();

          const keywordMatch = (item.keywords || []).some((keyword) =>
            keyword.toLowerCase().includes(value),
          );

          return itemNameValue.includes(value) || keywordMatch;
        });
      }

      dataList.innerHTML = "";

      matches.forEach((item) => {
        const option = document.createElement("option");

        option.value = item.name;

        dataList.appendChild(option);
      });
    }

    function findKnownDentalItem(value) {
      const typedValue = String(value || "")
        .trim()
        .toLowerCase();

      if (!typedValue) {
        return null;
      }

      const exactMatch = allKnownDentalItems.find(
        (item) => item.name.toLowerCase() === typedValue,
      );

      if (exactMatch) {
        return exactMatch;
      }

      const keywordMatch = allKnownDentalItems.find((item) =>
        (item.keywords || []).some(
          (keyword) =>
            keyword.toLowerCase() === typedValue ||
            typedValue.includes(keyword.toLowerCase()),
        ),
      );

      if (keywordMatch) {
        return keywordMatch;
      }

      return null;
    }

    function applyAutomaticItemDetails() {
      const typedName = itemName.value.trim();

      const matchedItem = findKnownDentalItem(typedName);

      if (!matchedItem) {
        return;
      }

      if (itemCategory) {
        itemCategory.value = matchedItem.category;

        if (itemCategory.value !== matchedItem.category) {
          const existingCategoryOption = [...itemCategory.options].find(
            (option) =>
              option.value.toLowerCase() === matchedItem.category.toLowerCase(),
          );

          if (existingCategoryOption) {
            itemCategory.value = existingCategoryOption.value;
          } else {
            const newOption = document.createElement("option");

            newOption.value = matchedItem.category;

            newOption.textContent = matchedItem.category;

            itemCategory.appendChild(newOption);

            itemCategory.value = matchedItem.category;
          }
        }
      }

      if (itemUnit && !itemUnit.value.trim()) {
        itemUnit.value = matchedItem.unit;
      }
    }

    renderSuggestions();

    itemName.addEventListener("input", () => {
      renderSuggestions(itemName.value);

      applyAutomaticItemDetails();
    });

    itemName.addEventListener("change", () => {
      applyAutomaticItemDetails();
    });

    itemName.addEventListener("blur", () => {
      applyAutomaticItemDetails();
    });
  }

  setupItemSuggestions();

  function getItems() {
    return shared.getItems();
  }

  function saveItems(items) {
    shared.saveItems(items);
  }

  function getMovements() {
    return shared.getMovements();
  }

  function saveMovements(movements) {
    shared.saveMovements(movements);
  }

  function escapeHTML(value) {
    return shared.escapeHTML(value);
  }

  function getStockStatus(item) {
    return shared.getStockStatus(item);
  }

  function getStatusLabel(status) {
    return shared.getStatusLabel(status);
  }

  function getDaysUntilExpiry(dateString) {
    return shared.getDaysUntilExpiry(dateString);
  }

  function formatExpiry(dateString) {
    return shared.formatExpiry(dateString);
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

    categoryFilter.innerHTML = `
      <option value="all">
        All Categories
      </option>
    `;

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

    const selectedCategory = categoryFilter.value || "all";

    const selectedStatus = statusFilter.value || "all";

    const selectedSort = sortFilter.value || "name-asc";

    const filtered = items.filter((item) => {
      const itemNameValue = String(item.name || "").toLowerCase();

      const itemCategoryValue = String(item.category || "").toLowerCase();

      const itemSupplierValue = String(item.supplier || "").toLowerCase();

      const matchesSearch =
        !searchValue ||
        itemNameValue.includes(searchValue) ||
        itemCategoryValue.includes(searchValue) ||
        itemSupplierValue.includes(searchValue);

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" || getStockStatus(item) === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
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

    itemCount.textContent = `${filteredItems.length} ${
      filteredItems.length === 1 ? "item" : "items"
    }`;

    if (emptyState) {
      emptyState.hidden = true;

      emptyState.style.display = "none";
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
                <span
                  class="item-name"
                  title="${escapeHTML(item.name)}"
                >
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
            <span
              class="status-badge status-${status}"
            >
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

    if (filteredItems.length === 0 && emptyState) {
      emptyState.hidden = false;

      emptyState.style.display = "flex";
    }
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
      stockStatusIcon.title = `${outCount} ${
        outCount === 1 ? "item is" : "items are"
      } out of stock${
        lowCount > 0
          ? ` and ${lowCount} ${
              lowCount === 1 ? "item is" : "items are"
            } low on stock.`
          : "."
      }`;

      return;
    }

    if (lowCount > 0) {
      stockStatusIcon.title = `${lowCount} ${
        lowCount === 1 ? "item needs" : "items need"
      } attention because stock is at or below the minimum stock level.`;

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

      itemCategory.value = item.category;

      itemUnit.value = item.unit;

      itemStock.value = item.stock;

      itemMinimum.value = item.minimum;

      if (itemSupplier) {
        itemSupplier.value = item.supplier || "";
      }

      if (itemExpiry) {
        itemExpiry.value = item.expiry || "";
      }
    } else {
      itemModalTitle.textContent = "Add Inventory Item";

      itemId.value = "";

      itemStock.value = "0";

      itemMinimum.value = "5";
    }

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

    if (itemName) {
      const typedName = itemName.value.trim().toLowerCase();

      const matchedItem = allKnownDentalItems.find((item) => {
        if (item.name.toLowerCase() === typedName) {
          return true;
        }

        return (item.keywords || []).some((keyword) =>
          typedName.includes(keyword.toLowerCase()),
        );
      });

      if (matchedItem) {
        if (itemCategory) {
          itemCategory.value = matchedItem.category;

          if (itemCategory.value !== matchedItem.category) {
            const existingOption = [...itemCategory.options].find(
              (option) =>
                option.value.toLowerCase() ===
                matchedItem.category.toLowerCase(),
            );

            if (existingOption) {
              itemCategory.value = existingOption.value;
            } else {
              const option = document.createElement("option");

              option.value = matchedItem.category;

              option.textContent = matchedItem.category;

              itemCategory.appendChild(option);

              itemCategory.value = matchedItem.category;
            }
          }
        }

        if (itemUnit && !itemUnit.value.trim()) {
          itemUnit.value = matchedItem.unit;
        }
      }
    }

    const name = itemName.value.trim();

    const category = itemCategory.value;

    const unit = itemUnit.value.trim();

    const stock = Number(itemStock.value);

    const minimum = Number(itemMinimum.value);

    const supplier = itemSupplier ? itemSupplier.value.trim() : "";

    const expiry = itemExpiry ? itemExpiry.value : "";

    if (!name) {
      alert("Please enter the item name.");

      return;
    }

    if (!category) {
      alert("Please select a category.");

      return;
    }

    if (!unit) {
      alert("Please enter the unit.");

      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      alert("Current stock cannot be negative.");

      return;
    }

    if (Number.isNaN(minimum) || minimum < 0) {
      alert("Minimum stock cannot be negative.");

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
        id: shared.generateItemId(),

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

    shared.notifyDataChanged();

    renderAll();

    closeItemModal();

    alert(
      existingId
        ? "Inventory item updated successfully."
        : "Inventory item added successfully.",
    );
  });

  function openMovementModal(selectedItemId = "") {
    closeActionMenu();

    populateMovementItems();

    movementForm.reset();

    movementType.value = "stock-in";

    movementQuantity.value = "1";

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

  function populateMovementItems() {
    const items = getItems();

    movementItem.innerHTML = `
      <option value="">
        Select item
      </option>
    `;

    [...items]
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .forEach((item) => {
        const option = document.createElement("option");

        option.value = item.id;

        option.textContent = `${item.name} — ${item.stock} ${item.unit}`;

        movementItem.appendChild(option);
      });
  }

  movementForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedId = movementItem.value;

    const type = movementType.value;

    const quantity = Number(movementQuantity.value);

    const reason = movementReason.value.trim();

    if (!selectedId) {
      alert("Please select an inventory item.");

      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");

      return;
    }

    const items = getItems();

    const itemIndex = items.findIndex(
      (item) => String(item.id) === String(selectedId),
    );

    if (itemIndex === -1) {
      alert("The selected inventory item could not be found.");

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
        alert(
          `Insufficient stock.\n\nAvailable: ${previousStock} ${item.unit}\nRequested: ${quantity} ${item.unit}`,
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
      id: shared.generateMovementId(),

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

    shared.notifyDataChanged();

    renderAll();

    closeMovementModal();

    alert(
      type === "stock-in"
        ? `${quantity} ${item.unit} added to ${item.name}.`
        : `${quantity} ${item.unit} deducted from ${item.name}.`,
    );
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

  function injectItemDetailsStyles() {
    if (document.getElementById("inventoryItemDetailsStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "inventoryItemDetailsStyles";

    style.textContent = `
      .inventory-item-details-modal {
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

      .inventory-item-details-modal.active {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .inventory-item-details-card {
        width: 100%;
        max-width: 720px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        padding: 24px;
        border: 1px solid #e2e9e4;
        border-radius: 18px;
        background: #ffffff;
        box-shadow:
          0 25px 70px rgba(0, 0, 0, 0.18);
        transform:
          translateY(10px)
          scale(0.98);
        transition:
          transform 0.2s ease;
        box-sizing: border-box;
      }

      .inventory-item-details-modal.active
      .inventory-item-details-card {
        transform:
          translateY(0)
          scale(1);
      }

      .inventory-details-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid #edf1ee;
      }

      .inventory-details-title-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .inventory-details-icon {
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

      .inventory-details-eyebrow {
        display: block;
        margin-bottom: 3px;
        color: #176b38;
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .inventory-details-title {
        margin: 0;
        color: #17251d;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .inventory-details-id {
        margin-top: 3px;
        color: #98a49e;
        font-size: 0.58rem;
      }

      .inventory-details-close {
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

      .inventory-details-close:hover {
        background: #f4f7f5;
        border-color: #d9e2dc;
        color: #26352d;
      }

      .inventory-details-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
        padding: 13px 14px;
        border: 1px solid #edf1ee;
        border-radius: 12px;
        background: #fafcfb;
      }

      .inventory-details-status-label {
        color: #7a867f;
        font-size: 0.62rem;
        font-weight: 600;
      }

      .inventory-details-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .inventory-details-field {
        min-width: 0;
        padding: 13px;
        border: 1px solid #edf1ee;
        border-radius: 12px;
        background: #ffffff;
      }

      .inventory-details-field.full {
        grid-column: 1 / -1;
      }

      .inventory-details-field-label {
        display: block;
        margin-bottom: 4px;
        color: #89958f;
        font-size: 0.56rem;
        font-weight: 600;
      }

      .inventory-details-field-value {
        display: block;
        color: #26352d;
        font-size: 0.7rem;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .inventory-details-stock {
        color: #176b38;
      }

      .inventory-details-expiry-normal {
        color: #6b7970;
      }

      .inventory-details-expiry-warning {
        color: #c38308;
      }

      .inventory-details-expiry-danger {
        color: #d34d4d;
      }

      .inventory-details-section {
        margin-top: 20px;
      }

      .inventory-details-section-title {
        margin:
          0 0 9px;
        color: #26352d;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .inventory-details-latest {
        padding: 14px;
        border: 1px solid #e7ece9;
        border-radius: 13px;
        background: #fcfdfc;
      }

      .inventory-details-latest-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .inventory-details-movement-type {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 0.56rem;
        font-weight: 700;
      }

      .inventory-details-movement-type.in {
        background: #eaf8ef;
        color: #267b47;
      }

      .inventory-details-movement-type.out {
        background: #fff5dc;
        color: #b67a08;
      }

      .inventory-details-movement-date {
        color: #8a958f;
        font-size: 0.58rem;
        text-align: right;
      }

      .inventory-details-latest-values {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .inventory-details-mini {
        padding: 9px;
        border-radius: 9px;
        background: #f4f7f5;
      }

      .inventory-details-mini span {
        display: block;
        color: #89958f;
        font-size: 0.52rem;
      }

      .inventory-details-mini strong {
        display: block;
        margin-top: 2px;
        color: #2b3a31;
        font-size: 0.65rem;
      }

      .inventory-details-reason {
        margin:
          12px 0 0;
        color: #65736b;
        font-size: 0.61rem;
        line-height: 1.5;
      }

      .inventory-details-empty {
        padding: 18px;
        border: 1px dashed #d5e1d9;
        border-radius: 12px;
        background: #f8fbf9;
        color: #87938c;
        font-size: 0.61rem;
        line-height: 1.5;
        text-align: center;
      }

      .inventory-details-actions {
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #edf1ee;
      }

      .inventory-details-action-btn {
        min-height: 40px;
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
        font-size: 0.66rem;
        font-weight: 600;
        cursor: pointer;
      }

      .inventory-details-action-btn.primary {
        border-color: #176b38;
        background: #176b38;
        color: #ffffff;
      }

      @media (max-width: 600px) {
        .inventory-item-details-modal {
          padding: 12px;
        }

        .inventory-item-details-card {
          max-height:
            calc(100vh - 24px);
          padding: 18px;
          border-radius: 15px;
        }

        .inventory-details-grid {
          grid-template-columns: 1fr;
        }

        .inventory-details-field.full {
          grid-column: auto;
        }

        .inventory-details-latest-top {
          align-items: flex-start;
          flex-direction: column;
        }

        .inventory-details-movement-date {
          text-align: left;
        }

        .inventory-details-latest-values {
          grid-template-columns: 1fr;
        }

        .inventory-details-actions {
          flex-direction: column;
        }

        .inventory-details-action-btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureItemDetailsModal() {
    if (itemDetailsModal) {
      return itemDetailsModal;
    }

    injectItemDetailsStyles();

    itemDetailsModal = document.createElement("div");

    itemDetailsModal.className = "inventory-item-details-modal";

    itemDetailsModal.setAttribute("aria-hidden", "true");

    itemDetailsModal.innerHTML = `
      <div
        class="inventory-item-details-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventoryDetailsTitle"
      >
        <div class="inventory-details-header">
          <div class="inventory-details-title-wrap">
            <div class="inventory-details-icon">
              <i class="fa-solid fa-box"></i>
            </div>

            <div>
              <span class="inventory-details-eyebrow">
                Inventory Item
              </span>

              <h3
                class="inventory-details-title"
                id="inventoryDetailsTitle"
              >
                Item Details
              </h3>

              <div
                class="inventory-details-id"
                id="inventoryDetailsId"
              ></div>
            </div>
          </div>

          <button
            type="button"
            class="inventory-details-close"
            id="inventoryDetailsClose"
            aria-label="Close item details"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div
          id="inventoryDetailsContent"
        ></div>

        <div class="inventory-details-actions">
          <button
            type="button"
            class="inventory-details-action-btn"
            id="inventoryDetailsMovementBtn"
          >
            <i class="fa-solid fa-right-left"></i>
            Stock Movement
          </button>

          <button
            type="button"
            class="inventory-details-action-btn primary"
            id="inventoryDetailsEditBtn"
          >
            <i class="fa-solid fa-pen"></i>
            Edit Item
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(itemDetailsModal);

    itemDetailsModal.addEventListener("click", (event) => {
      if (event.target === itemDetailsModal) {
        closeItemDetailsModal();
      }
    });

    itemDetailsModal
      .querySelector("#inventoryDetailsClose")
      .addEventListener("click", closeItemDetailsModal);

    itemDetailsModal
      .querySelector("#inventoryDetailsMovementBtn")
      .addEventListener("click", () => {
        const id = itemDetailsModal.dataset.itemId;

        closeItemDetailsModal();

        if (id) {
          openMovementModal(id);
        }
      });

    itemDetailsModal
      .querySelector("#inventoryDetailsEditBtn")
      .addEventListener("click", () => {
        const id = itemDetailsModal.dataset.itemId;

        const item = getItems().find(
          (inventoryItem) => String(inventoryItem.id) === String(id),
        );

        closeItemDetailsModal();

        if (item) {
          openItemModal(item);
        }
      });

    return itemDetailsModal;
  }

  function formatDetailsDate(dateString, includeTime = false) {
    if (!dateString) {
      return "—";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(includeTime
        ? {
            hour: "numeric",
            minute: "2-digit",
          }
        : {}),
    });
  }

  function getExpiryDetails(item) {
    if (!item.expiry) {
      return {
        text: "No expiry date",
        className: "",
      };
    }

    const days = getDaysUntilExpiry(item.expiry);

    const date = new Date(`${item.expiry}T00:00:00`);

    const formatted = Number.isNaN(date.getTime())
      ? item.expiry
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

    if (days !== null && days < 0) {
      return {
        text: `Expired — ${formatted}`,
        className: "inventory-details-expiry-danger",
      };
    }

    if (days !== null && days <= 30) {
      return {
        text: `${formatted} — ${days} day${days === 1 ? "" : "s"} remaining`,
        className: "inventory-details-expiry-danger",
      };
    }

    if (days !== null && days <= 90) {
      return {
        text: `${formatted} — ${days} days remaining`,
        className: "inventory-details-expiry-warning",
      };
    }

    return {
      text: formatted,
      className: "inventory-details-expiry-normal",
    };
  }

  function openItemDetailsModal(item) {
    if (!item) {
      return;
    }

    closeActionMenu();

    const modal = ensureItemDetailsModal();

    const content = modal.querySelector("#inventoryDetailsContent");

    const title = modal.querySelector("#inventoryDetailsTitle");

    const idElement = modal.querySelector("#inventoryDetailsId");

    const status = getStockStatus(item);

    const statusLabel = getStatusLabel(status);

    const expiry = getExpiryDetails(item);

    const movements = getMovements()
      .filter((movement) => String(movement.itemId) === String(item.id))
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      );

    const latestMovement = movements[0];

    title.textContent = item.name || "Inventory Item";

    idElement.textContent = item.id ? `ID: ${item.id}` : "";

    content.innerHTML = `
      <div class="inventory-details-status-row">
        <span class="inventory-details-status-label">
          Current Stock Status
        </span>

        <span
          class="status-badge status-${escapeHTML(status)}"
        >
          ${escapeHTML(statusLabel)}
        </span>
      </div>

      <div class="inventory-details-grid">
        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Item Name
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(item.name || "—")}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Category
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(item.category || "—")}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Current Stock
          </span>

          <span
            class="inventory-details-field-value inventory-details-stock"
          >
            ${Number(item.stock) || 0}
            ${escapeHTML(item.unit || "")}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Minimum Stock
          </span>

          <span class="inventory-details-field-value">
            ${Number(item.minimum) || 0}
            ${escapeHTML(item.unit || "")}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Unit
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(item.unit || "—")}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Supplier
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(item.supplier || "No supplier recorded")}
          </span>
        </div>

        <div
          class="inventory-details-field full"
        >
          <span class="inventory-details-field-label">
            Expiry Date
          </span>

          <span
            class="inventory-details-field-value ${expiry.className}"
          >
            ${escapeHTML(expiry.text)}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Date Added
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(formatDetailsDate(item.createdAt))}
          </span>
        </div>

        <div class="inventory-details-field">
          <span class="inventory-details-field-label">
            Last Updated
          </span>

          <span class="inventory-details-field-value">
            ${escapeHTML(formatDetailsDate(item.updatedAt || item.createdAt))}
          </span>
        </div>
      </div>

      <div class="inventory-details-section">
        <h4 class="inventory-details-section-title">
          Latest Stock Update
        </h4>

        ${
          latestMovement
            ? `
              <div class="inventory-details-latest">
                <div class="inventory-details-latest-top">
                  <span
                    class="inventory-details-movement-type ${
                      latestMovement.type === "stock-in" ? "in" : "out"
                    }"
                  >
                    <i
                      class="fa-solid ${
                        latestMovement.type === "stock-in"
                          ? "fa-arrow-down"
                          : "fa-arrow-up"
                      }"
                    ></i>

                    ${
                      latestMovement.type === "stock-in"
                        ? "Stock In"
                        : "Stock Out"
                    }
                  </span>

                  <span
                    class="inventory-details-movement-date"
                  >
                    ${escapeHTML(formatDetailsDate(latestMovement.date, true))}
                  </span>
                </div>

                <div class="inventory-details-latest-values">
                  <div class="inventory-details-mini">
                    <span>
                      Quantity
                    </span>

                    <strong>
                      ${Number(latestMovement.quantity) || 0}

                      ${escapeHTML(item.unit || "")}
                    </strong>
                  </div>

                  <div class="inventory-details-mini">
                    <span>
                      Previous Stock
                    </span>

                    <strong>
                      ${Number(latestMovement.previousStock) || 0}
                    </strong>
                  </div>

                  <div class="inventory-details-mini">
                    <span>
                      New Stock
                    </span>

                    <strong>
                      ${Number(latestMovement.newStock) || 0}
                    </strong>
                  </div>
                </div>

                <p class="inventory-details-reason">
                  <strong>
                    Reason:
                  </strong>

                  ${escapeHTML(latestMovement.reason || "No reason recorded")}
                </p>
              </div>
            `
            : `
              <div class="inventory-details-empty">
                No stock movement has been recorded for this item yet.
              </div>
            `
        }
      </div>
    `;

    modal.dataset.itemId = item.id;

    modal.classList.add("active");

    modal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      modal.querySelector("#inventoryDetailsClose")?.focus();
    }, 50);
  }

  function closeItemDetailsModal() {
    if (!itemDetailsModal) {
      return;
    }

    itemDetailsModal.classList.remove("active");

    itemDetailsModal.setAttribute("aria-hidden", "true");

    itemDetailsModal.dataset.itemId = "";
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

    if (action === "view-details") {
      openItemDetailsModal(item);

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

    shared.notifyDataChanged();

    renderAll();

    alert(
      `"${item.name}" was deleted successfully.\n\nIts movement history was also removed.`,
    );
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

  sortFilter.addEventListener("change", renderInventoryTable);

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

    closeItemDetailsModal();
  });

  window.addEventListener("resize", () => {
    closeActionMenu();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === shared.ITEMS_KEY || event.key === shared.MOVEMENTS_KEY) {
      renderAll();
    }
  });

  function renderAll() {
    renderCategoryFilter();

    renderInventoryTable();

    updateStatistics();

    populateMovementItems();
  }

  renderAll();
});
