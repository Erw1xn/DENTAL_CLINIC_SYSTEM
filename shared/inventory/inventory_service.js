(() => {
  "use strict";

  const ITEMS_KEY = "dentanueva_inventory_items";
  const MOVEMENTS_KEY = "dentanueva_inventory_movements";
  const NOTIFICATIONS_KEY = "dentanueva_inventory_notifications";

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function readList(storageKey) {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Unable to load ${storageKey}:`, error);
      return [];
    }
  }

  function getTreatmentMaterials(procedure) {
    const materials = window.DentaNuevaTreatmentMaterials || {};

    return materials[normalizeName(procedure)] || [];
  }

  function getTreatmentMaterialSuggestions(procedure) {
    const items = readList(ITEMS_KEY);

    return getTreatmentMaterials(procedure).map((material) => {
      const item = items.find((candidate) =>
        material.names.some(
          (name) => normalizeName(candidate.name) === normalizeName(name),
        ),
      );

      return {
        itemId: item?.id || "",
        itemName: item?.name || material.names[0],
        quantity: Number(material.quantity) || 0,
        available: Number(item?.stock) || 0,
        unit: item?.unit || "unit",
        missing: !item,
      };
    });
  }

  function createMovementId() {
    return `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  function getPatientName(patient) {
    const fullName = [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(" ");

    return fullName || patient.name || patient.patientId || "Patient";
  }

  function saveTreatmentNotification(
    treatment,
    patient,
    movements,
    unresolvedMaterials = [],
  ) {
    if (!movements.length && !unresolvedMaterials.length) {
      return;
    }

    const notifications = readList(NOTIFICATIONS_KEY);
    notifications.unshift({
      id: `INV-NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: "clinical-treatment-inventory-update",
      patientName: getPatientName(patient),
      patientId: treatment.patientId || "",
      procedure: treatment.procedure || "Treatment",
      toothNumber: treatment.toothNumber || treatment.tooth || "",
      treatmentDate: treatment.date || "",
      appointmentId: treatment.appointmentId || "",
      items: [
        ...movements.map((movement) => ({
          itemName: movement.itemName,
          quantity: movement.quantity,
          unit: movement.unit || "unit",
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          status: "stock-out-completed",
        })),
        ...unresolvedMaterials.map((material) => ({
          itemName: material.itemName,
          quantity: material.quantity,
          unit: material.unit || "unit",
          available: material.available,
          status: material.status,
        })),
      ],
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent("inventory:notification-created"));
  }

  function getMovementDate(treatment, fallbackDate) {
    const treatmentDate = new Date(`${treatment.date}T12:00:00`);

    return Number.isNaN(treatmentDate.getTime())
      ? fallbackDate
      : treatmentDate.toISOString();
  }

  function deductForTreatment(treatment, patient, requestedMaterials) {
    const assignedMaterials = Array.isArray(requestedMaterials)
      ? requestedMaterials
          .map((material) => ({
            names: [material.itemName || material.name].filter(Boolean),
            quantity: Math.max(0, Number(material.quantity) || 0),
          }))
          .filter((material) => material.names.length && material.quantity)
      : getTreatmentMaterials(treatment.procedure);

    if (!assignedMaterials.length) {
      return { success: true, movements: [] };
    }

    const movements = readList(MOVEMENTS_KEY);
    const existingMovements = movements.filter(
      (movement) =>
        movement.source === "clinical-treatment" &&
        String(movement.treatmentId) === String(treatment.id),
    );

    if (existingMovements.length) {
      return {
        success: true,
        movements: existingMovements,
        alreadyProcessed: true,
      };
    }

    const items = readList(ITEMS_KEY);
    const unresolvedMaterials = [];
    const deductions = [];

    assignedMaterials.forEach((material) => {
      const item = items.find((candidate) =>
        material.names.some(
          (name) => normalizeName(candidate.name) === normalizeName(name),
        ),
      );

      if (!item) {
        unresolvedMaterials.push({
          itemName: material.names[0],
          quantity: material.quantity,
          unit: "unit",
          available: 0,
          status: "unregistered",
        });
        return;
      }

      const stock = Number(item.stock) || 0;

      if (stock < material.quantity) {
        unresolvedMaterials.push({
          itemName: item.name,
          quantity: material.quantity,
          unit: item.unit || "unit",
          available: stock,
          status: "insufficient-stock",
        });
        return;
      }

      deductions.push({ item, quantity: material.quantity });
    });

    const now = new Date().toISOString();
    const movementDate = getMovementDate(treatment, now);
    const patientName = getPatientName(patient);
    const createdMovements = [];

    deductions.forEach(({ item, quantity }) => {
      const previousStock = Number(item.stock) || 0;
      const newStock = previousStock - quantity;
      const movement = {
        id: createMovementId(),
        itemId: item.id,
        itemName: item.name,
        unit: item.unit || "unit",
        type: "stock-out",
        quantity,
        previousStock,
        newStock,
        reason: `Patient treatment: ${treatment.procedure} (${patientName})`,
        source: "clinical-treatment",
        treatmentId: treatment.id,
        patientId: treatment.patientId,
        appointmentId: treatment.appointmentId || "",
        date: movementDate,
        createdAt: now,
      };

      item.stock = newStock;
      item.updatedAt = now;
      movements.push(movement);
      createdMovements.push(movement);
    });

    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
    saveTreatmentNotification(
      treatment,
      patient,
      createdMovements,
      unresolvedMaterials,
    );
    window.dispatchEvent(new CustomEvent("inventory:data-changed"));

    return {
      success: true,
      movements: createdMovements,
      unresolvedMaterials,
    };
  }

  window.DentaNuevaInventoryService = Object.freeze({
    ITEMS_KEY,
    MOVEMENTS_KEY,
    NOTIFICATIONS_KEY,
    getTreatmentMaterials,
    getTreatmentMaterialSuggestions,
    deductForTreatment,
  });
})();
