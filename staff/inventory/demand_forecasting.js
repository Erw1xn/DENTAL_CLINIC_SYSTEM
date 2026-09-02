(() => {
  "use strict";

  const ITEMS_KEY = "dentanueva_inventory_items";
  const MOVEMENTS_KEY = "dentanueva_inventory_movements";

  const MOVING_AVERAGE_WINDOW = 3;
  const MINIMUM_RECORDS_FOR_ML = 8;
  const TRAINING_RATIO = 0.8;
  const EPOCHS = 80;
  const BATCH_SIZE = 4;
  const LOOKBACK = 3;

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

  function getStockOutMovements(itemId) {
    return getMovements()
      .filter(
        (movement) =>
          movement.type === "stock-out" &&
          String(movement.itemId) === String(itemId),
      )
      .filter((movement) => {
        const quantity = Number(movement.quantity);

        return Number.isFinite(quantity) && quantity > 0;
      })
      .filter((movement) => {
        const date = new Date(movement.date || "");

        return !Number.isNaN(date.getTime());
      })
      .sort((a, b) => {
        const aTime = new Date(a.date || "").getTime();
        const bTime = new Date(b.date || "").getTime();

        return aTime - bTime;
      });
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey) {
    const parts = String(dateKey).split("-");

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
  }

  function getDailyDemandSeries(itemId) {
    const movements = getStockOutMovements(itemId);

    if (!movements.length) {
      return [];
    }

    const dailyTotals = new Map();

    movements.forEach((movement) => {
      const date = new Date(movement.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      date.setHours(0, 0, 0, 0);

      const dateKey = formatDateKey(date);
      const quantity = Number(movement.quantity) || 0;

      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + quantity);
    });

    const dateKeys = [...dailyTotals.keys()].sort();

    if (!dateKeys.length) {
      return [];
    }

    const firstDate = parseDateKey(dateKeys[0]);
    const lastDate = parseDateKey(dateKeys[dateKeys.length - 1]);

    if (!firstDate || !lastDate) {
      return [];
    }

    const series = [];
    const currentDate = new Date(firstDate);

    while (currentDate <= lastDate) {
      const dateKey = formatDateKey(currentDate);

      series.push({
        value: Number(dailyTotals.get(dateKey) || 0),
        date: dateKey,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return series;
  }

  function getDemandSeries(itemId) {
    if (
      window.DentaNuevaMovingAverage &&
      typeof window.DentaNuevaMovingAverage.getDailyDemandSeries === "function"
    ) {
      return window.DentaNuevaMovingAverage.getDailyDemandSeries(itemId);
    }

    return getDailyDemandSeries(itemId);
  }

  function normalizeSeries(values) {
    const numericValues = values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!numericValues.length) {
      return {
        values: [],
        min: 0,
        max: 1,
      };
    }

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    if (min === max) {
      return {
        values: numericValues.map(() => 0.5),
        min,
        max: min + 1,
      };
    }

    return {
      values: numericValues.map((value) => (value - min) / (max - min)),
      min,
      max,
    };
  }

  function denormalizeValue(value, min, max) {
    return Number(value) * (max - min) + min;
  }

  function createTrainingSequences(values, lookback = LOOKBACK) {
    const sequences = [];
    const targets = [];

    const normalizedLookback = Math.max(1, Number(lookback) || LOOKBACK);

    for (let index = normalizedLookback; index < values.length; index++) {
      const input = values.slice(index - normalizedLookback, index);

      const target = values[index];

      sequences.push(input);
      targets.push(target);
    }

    return {
      sequences,
      targets,
    };
  }

  function calculateMAPE(actualValues, predictedValues) {
    if (
      !Array.isArray(actualValues) ||
      !Array.isArray(predictedValues) ||
      actualValues.length === 0 ||
      actualValues.length !== predictedValues.length
    ) {
      return null;
    }

    const validPairs = actualValues
      .map((actual, index) => ({
        actual: Number(actual),
        predicted: Number(predictedValues[index]),
      }))
      .filter(
        (pair) =>
          Number.isFinite(pair.actual) &&
          Number.isFinite(pair.predicted) &&
          pair.actual !== 0,
      );

    if (!validPairs.length) {
      return null;
    }

    const totalPercentageError = validPairs.reduce(
      (sum, pair) =>
        sum + Math.abs((pair.actual - pair.predicted) / pair.actual),
      0,
    );

    return (totalPercentageError / validPairs.length) * 100;
  }

  function calculateRMSE(actualValues, predictedValues) {
    if (
      !Array.isArray(actualValues) ||
      !Array.isArray(predictedValues) ||
      actualValues.length === 0 ||
      actualValues.length !== predictedValues.length
    ) {
      return null;
    }

    const validPairs = actualValues
      .map((actual, index) => ({
        actual: Number(actual),
        predicted: Number(predictedValues[index]),
      }))
      .filter(
        (pair) =>
          Number.isFinite(pair.actual) && Number.isFinite(pair.predicted),
      );

    if (!validPairs.length) {
      return null;
    }

    const meanSquaredError =
      validPairs.reduce(
        (sum, pair) => sum + Math.pow(pair.actual - pair.predicted, 2),
        0,
      ) / validPairs.length;

    return Math.sqrt(meanSquaredError);
  }

  function calculateMovingAveragePrediction(
    trainingValues,
    actualValues,
    windowSize = MOVING_AVERAGE_WINDOW,
  ) {
    if (
      !window.DentaNuevaMovingAverage ||
      !Array.isArray(trainingValues) ||
      !Array.isArray(actualValues)
    ) {
      return {
        predictions: [],
        mape: null,
        rmse: null,
      };
    }

    const history = [...trainingValues];
    const predictions = [];

    actualValues.forEach((actualValue) => {
      const prediction = window.DentaNuevaMovingAverage.forecastNextPeriod(
        history,
        windowSize,
      );

      const safePrediction = prediction === null ? 0 : prediction;

      predictions.push(safePrediction);

      history.push(Number(actualValue));
    });

    return {
      predictions,
      mape: calculateMAPE(actualValues, predictions),
      rmse: calculateRMSE(actualValues, predictions),
    };
  }

  async function trainMLModel(values) {
    if (typeof tf === "undefined") {
      throw new Error(
        "TensorFlow.js is not available. Load TensorFlow.js before demand_forecasting.js.",
      );
    }

    if (!Array.isArray(values) || values.length < MINIMUM_RECORDS_FOR_ML) {
      return null;
    }

    const normalized = normalizeSeries(values);

    const sequencesData = createTrainingSequences(normalized.values, LOOKBACK);

    if (
      sequencesData.sequences.length < 3 ||
      sequencesData.targets.length < 3
    ) {
      return null;
    }

    const splitIndex = Math.max(
      1,
      Math.floor(sequencesData.sequences.length * TRAINING_RATIO),
    );

    const trainingSequences = sequencesData.sequences.slice(0, splitIndex);

    const trainingTargets = sequencesData.targets.slice(0, splitIndex);

    const testingSequences = sequencesData.sequences.slice(splitIndex);

    if (
      trainingSequences.length < 3 ||
      trainingTargets.length < 3 ||
      testingSequences.length < 1
    ) {
      return null;
    }

    const xTrain = tf.tensor2d(trainingSequences);

    const yTrain = tf.tensor2d(trainingTargets.map((value) => [value]));

    // ai
    const model = tf.sequential();

    model.add(
      tf.layers.dense({
        inputShape: [LOOKBACK],
        units: 16,
        activation: "relu",
      }),
    );

    model.add(
      tf.layers.dense({
        units: 8,
        activation: "relu",
      }),
    );

    model.add(
      tf.layers.dense({
        units: 1,
      }),
    );
    // hanggang dito

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: "meanSquaredError",
    });

    await model.fit(xTrain, yTrain, {
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
      shuffle: false,
      verbose: 0,
    });

    xTrain.dispose();
    yTrain.dispose();

    let testPredictions = [];

    if (testingSequences.length > 0) {
      const xTest = tf.tensor2d(testingSequences);

      const predictionTensor = model.predict(xTest);

      const predictionValues = Array.from(await predictionTensor.data());

      xTest.dispose();
      predictionTensor.dispose();

      testPredictions = predictionValues.map((value) =>
        Math.max(0, denormalizeValue(value, normalized.min, normalized.max)),
      );
    }

    const testStartIndex = LOOKBACK + trainingSequences.length;

    const actualTestValues = values.slice(testStartIndex);

    const alignedLength = Math.min(
      actualTestValues.length,
      testPredictions.length,
    );

    const alignedActualValues = actualTestValues.slice(0, alignedLength);

    const alignedPredictions = testPredictions.slice(0, alignedLength);

    const mape = calculateMAPE(alignedActualValues, alignedPredictions);

    const rmse = calculateRMSE(alignedActualValues, alignedPredictions);

    const recentValues = normalized.values.slice(-LOOKBACK);

    let nextForecast = null;

    if (recentValues.length === LOOKBACK) {
      const inputTensor = tf.tensor2d([recentValues]);

      const predictionTensor = model.predict(inputTensor);

      const predictionData = Array.from(await predictionTensor.data());

      inputTensor.dispose();
      predictionTensor.dispose();

      if (predictionData.length) {
        nextForecast = Math.max(
          0,
          denormalizeValue(predictionData[0], normalized.min, normalized.max),
        );
      }
    }

    model.dispose();

    return {
      nextForecast,
      testActual: alignedActualValues,
      testPredictions: alignedPredictions,
      mape,
      rmse,
      trainingRecords: trainingSequences.length,
      testingRecords: testingSequences.length,
    };
  }

  async function forecastItem(itemId) {
    const demandSeries = getDemandSeries(itemId);

    const values = demandSeries.map((entry) => Number(entry.value));

    const movingAverage =
      window.DentaNuevaMovingAverage &&
      typeof window.DentaNuevaMovingAverage.buildMovingAverageResult ===
        "function"
        ? window.DentaNuevaMovingAverage.buildMovingAverageResult(
            values,
            MOVING_AVERAGE_WINDOW,
          )
        : null;

    if (values.length < MINIMUM_RECORDS_FOR_ML) {
      return {
        ready: false,
        reason: "insufficient-data",
        itemId,
        records: values.length,
        requiredRecords: MINIMUM_RECORDS_FOR_ML,
        movingAverage,
        ml: null,
        demandSeries,
      };
    }

    try {
      const mlResult = await trainMLModel(values);

      return {
        ready: Boolean(mlResult),
        reason: mlResult ? "ready" : "insufficient-data",
        itemId,
        records: values.length,
        requiredRecords: MINIMUM_RECORDS_FOR_ML,
        movingAverage,
        ml: mlResult,
        demandSeries,
      };
    } catch (error) {
      console.error(`Unable to generate forecast for item ${itemId}:`, error);

      return {
        ready: false,
        reason: "model-error",
        itemId,
        records: values.length,
        requiredRecords: MINIMUM_RECORDS_FOR_ML,
        movingAverage,
        ml: null,
        demandSeries,
        error: error.message,
      };
    }
  }

  async function forecastAllItems() {
    const items = getItems();
    const results = [];

    for (const item of items) {
      const result = await forecastItem(item.id);

      results.push({
        item,
        ...result,
      });
    }

    return results;
  }

  function formatMetric(value, decimals = 2) {
    if (!Number.isFinite(Number(value))) {
      return "—";
    }

    return Number(value).toFixed(decimals);
  }

  function formatForecast(value) {
    if (!Number.isFinite(Number(value))) {
      return "—";
    }

    return Math.max(0, Math.round(Number(value)));
  }

  function getStatus(result) {
    if (!result) {
      return "Insufficient Data";
    }

    if (result.ready) {
      return "Ready";
    }

    if (result.reason === "model-error") {
      return "Model Error";
    }

    return "Insufficient Data";
  }

  function formatDemandStatus(result) {
    if (!result) {
      return "Insufficient Data";
    }

    if (result.ready && result.ml) {
      return "Ready";
    }

    if (result.reason === "model-error") {
      return "Model Error";
    }

    return `${result.records}/${result.requiredRecords} Records`;
  }

  async function generateForecastReport() {
    const results = await forecastAllItems();

    const readyResults = results.filter((result) => result.ready && result.ml);

    const allActual = [];
    const allPredicted = [];

    readyResults.forEach((result) => {
      if (
        Array.isArray(result.ml.testActual) &&
        Array.isArray(result.ml.testPredictions)
      ) {
        allActual.push(...result.ml.testActual);
        allPredicted.push(...result.ml.testPredictions);
      }
    });

    const overallMAPE = calculateMAPE(allActual, allPredicted);

    const overallRMSE = calculateRMSE(allActual, allPredicted);

    return {
      generatedAt: new Date().toISOString(),
      results,
      summary: {
        totalItems: results.length,
        readyItems: readyResults.length,
        insufficientItems: results.length - readyResults.length,
        overallMAPE,
        overallRMSE,
      },
    };
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getDemandForecastStatus(result) {
    if (!result) {
      return "Insufficient Data";
    }

    if (result.ready && result.ml) {
      return "Ready";
    }

    if (result.reason === "model-error") {
      return "Model Error";
    }

    return `${result.records}/${result.requiredRecords} Records`;
  }

  async function renderDemandForecastTable() {
    const tableBody = document.getElementById("demandForecastTableBody");

    const emptyState = document.getElementById("demandForecastEmpty");

    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = "";

    const results = await forecastAllItems();

    if (!results.length) {
      if (emptyState) {
        emptyState.hidden = false;
      }

      return;
    }

    const hasReadyResult = results.some((result) => result.ready && result.ml);

    if (emptyState) {
      emptyState.hidden = hasReadyResult;
    }

    results.forEach((result) => {
      const item = result.item;

      const movingAverage =
        result.movingAverage &&
        Number.isFinite(Number(result.movingAverage.average))
          ? Number(result.movingAverage.average)
          : null;

      const mlForecast =
        result.ml && Number.isFinite(Number(result.ml.nextForecast))
          ? Number(result.ml.nextForecast)
          : null;

      const mape =
        result.ml && Number.isFinite(Number(result.ml.mape))
          ? Number(result.ml.mape)
          : null;

      const rmse =
        result.ml && Number.isFinite(Number(result.ml.rmse))
          ? Number(result.ml.rmse)
          : null;

      const status = getDemandForecastStatus(result);

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          <div class="forecast-item-cell">
            <div class="forecast-item-icon">
              <i class="fa-solid fa-box"></i>
            </div>
            <div>
              <span class="forecast-item-name">
                ${escapeHTML(item.name)}
              </span>
            </div>
          </div>
        </td>
        <td>
          <span class="forecast-number">
            ${result.records}
          </span>
        </td>
        <td>
          <span class="forecast-average">
            ${movingAverage === null ? "—" : formatMetric(movingAverage)}
          </span>
          <span class="forecast-unit">
            ${escapeHTML(item.unit || "")}
          </span>
        </td>
        <td>
          <span class="forecast-estimate">
            ${mlForecast === null ? "—" : formatForecast(mlForecast)}
          </span>
          <span class="forecast-unit">
            ${escapeHTML(item.unit || "")}
          </span>
        </td>
        <td>
          <span class="forecast-number">
            ${formatMetric(mape)}
            ${mape === null ? "" : "%"}
          </span>
        </td>
        <td>
          <span class="forecast-number">
            ${formatMetric(rmse)}
          </span>
        </td>
        <td>
          <span class="forecast-number">
            ${escapeHTML(status)}
          </span>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  async function refreshDemandForecast() {
    try {
      await renderDemandForecastTable();
    } catch (error) {
      console.error("Unable to refresh demand forecast:", error);
    }
  }

  window.refreshDemandForecast = refreshDemandForecast;
  window.renderDemandForecastTable = renderDemandForecastTable;

  window.DentaNuevaDemandForecasting = {
    ITEMS_KEY,
    MOVEMENTS_KEY,
    MOVING_AVERAGE_WINDOW,
    MINIMUM_RECORDS_FOR_ML,
    TRAINING_RATIO,
    EPOCHS,
    BATCH_SIZE,
    LOOKBACK,
    getItems,
    getMovements,
    getStockOutMovements,
    getDailyDemandSeries,
    getDemandSeries,
    normalizeSeries,
    denormalizeValue,
    createTrainingSequences,
    calculateMAPE,
    calculateRMSE,
    calculateMovingAveragePrediction,
    trainMLModel,
    forecastItem,
    forecastAllItems,
    formatMetric,
    formatForecast,
    getStatus,
    formatDemandStatus,
    getDemandForecastStatus,
    generateForecastReport,
    renderDemandForecastTable,
    refreshDemandForecast,
  };

  const initializeDemandForecast = () => {
    refreshDemandForecast();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDemandForecast, {
      once: true,
    });
  } else {
    initializeDemandForecast();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === ITEMS_KEY || event.key === MOVEMENTS_KEY) {
      refreshDemandForecast();
    }
  });
})();
