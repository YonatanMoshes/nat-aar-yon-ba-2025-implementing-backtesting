import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateIchimoku
} from './indicators';

import { getX, getY } from './helpers';

// (The helper functions: downsampleIndicatorData, drawLine, drawSubChartContainer are correct and should remain here)
function downsampleIndicatorData(indicatorData, fullDataLength, desiredLength, pointsToKeep = 0) {
  if (fullDataLength <= desiredLength || fullDataLength <= pointsToKeep) {
    return indicatorData.map((value, index) => ({ value, originalIndex: index }));
  }
  const downsampledData = [];
  const partToSample = indicatorData.slice(0, fullDataLength - pointsToKeep);
  const tail = indicatorData.slice(fullDataLength - pointsToKeep);
  const headDesiredLength = desiredLength - pointsToKeep;
  if (headDesiredLength > 0) {
    const step = Math.max(1, Math.floor(partToSample.length / headDesiredLength));
    for (let i = 0; i < headDesiredLength; i++) {
      const index = i * step;
      if (index < partToSample.length) {
        downsampledData.push({ value: partToSample[index], originalIndex: index });
      }
    }
  }
  tail.forEach((value, i) => {
    downsampledData.push({ value, originalIndex: fullDataLength - pointsToKeep + i });
  });
  return downsampledData;
}

function drawLine(ctx, data, getXCoord, getYCoord, color, lineWidth = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  let firstPoint = true;
  data.forEach(point => {
    if (point.value !== null && !isNaN(point.value)) {
      const x = getXCoord(point.originalIndex);
      const y = getYCoord(point.value);
      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** Draws the background and grid for a sub-chart. */
function drawSubChartContainer(ctx, yPos, height, chartWidth, padding, staticLevels = [], yMin = 0, yMax = 100) {
  // --- Draw Background ---
  ctx.fillStyle = '#161b22';
  ctx.fillRect(padding.left, yPos, chartWidth, height);

  // --- Draw Static Reference Lines AND Their Labels ---
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px Segoe UI';
  ctx.textAlign = 'right';

  // The range of the y-axis is now always fixed, e.g., 0 to 100 for RSI/Stochastic
  const range = yMax - yMin;
  if (range <= 0) return;

  staticLevels.forEach(level => {
    // Calculate the y-position based on the fixed range (0-100)
    const y = yPos + height - ((level - yMin) / range) * height;

    // Draw the horizontal grid line
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    // Draw the text label for this level
    ctx.fillText(level.toString(), padding.left - 5, y + 3);
  });
}

// ==================================================================================
// 3. MAIN DRAWING FUNCTION (Fully Refactored and Corrected)
// ==================================================================================

export default function drawIndicators(
  ctx,
  // Data parameters
  fullData,
  sampleData,
  activeIndicators,
  showPredictions,
  // Inherited Coordinate System Parameters (from the parent chart)
  padding,
  chartWidth,
  mainChartHeight, // The height of the main price chart ONLY
  minPrice,
  maxPrice,
  candleWidth,
  // Zoom/Pan state
  offset,
  zoom,
  zoomCenter
) {
  
  const dataForCalculations = fullData
    .filter(d => d) // Remove any top-level null entries
    .map(d => {
      const close = d.close ?? d.predicted_close;
      // If historical data exists, use it. Otherwise, synthesize future data.
      return {
        ...d,
        close: close,
        high: d.high ?? close, // Use predicted_close as high if historical high is null
        low: d.low ?? close,   // Use predicted_close as low if historical low is null
      };
    });

  // --- Step 2: Calculate ALL on-chart indicator data BEFORE finding the scale ---
  const smaResults = [];
  if (Array.isArray(activeIndicators.sma) && activeIndicators.sma.length > 0) {
    activeIndicators.sma.forEach(cfg => {
      smaResults.push({ data: calculateSMA(dataForCalculations, cfg.period), color: cfg.color || '#58a6ff' });
    });
  }

  const emaResults = [];
  if (Array.isArray(activeIndicators.ema) && activeIndicators.ema.length > 0) {
    activeIndicators.ema.forEach(cfg => {
      emaResults.push({ data: calculateEMA(dataForCalculations, cfg.period), color: cfg.color || '#10b981' });
    });
  }

  let bollingerResult = null;
  if (Array.isArray(activeIndicators.bollinger) && activeIndicators.bollinger.length > 0) {
    const cfg = activeIndicators.bollinger[0];
    bollingerResult = calculateBollingerBands(dataForCalculations, cfg.period, cfg.multiplier);
  }

  let ichimokuResult = null;
  if (Array.isArray(activeIndicators.ichimoku) && activeIndicators.ichimoku.length > 0) {
    if (dataForCalculations.length >= 52) {
      ichimokuResult = calculateIchimoku(dataForCalculations);
    }
  }

  // --- Step 3: Create the Unified Y-Axis Scale ---
  let onChartIndicatorValues = [
    ...smaResults.flatMap(r => r.data),
    ...emaResults.flatMap(r => r.data),
  ];
  if (bollingerResult) onChartIndicatorValues.push(...bollingerResult.upper, ...bollingerResult.middle, ...bollingerResult.lower);
  if (ichimokuResult) onChartIndicatorValues.push(...ichimokuResult.conversion, ...ichimokuResult.base, ...ichimokuResult.spanA, ...ichimokuResult.spanB);

  const allDrawableValues = [
    ...sampleData.flatMap(d => [d?.open, d?.high, d?.low, d?.close]),
    ...onChartIndicatorValues
  ].filter(v => v !== null && !isNaN(v));

  const finalMinPrice = Math.min(...allDrawableValues) * 0.9995;
  const finalMaxPrice = Math.max(...allDrawableValues) * 1.0005;

  // --- Step 4: Create the Final Coordinate Helpers ---
  const getYCoord = (value) => getY(value, mainChartHeight, padding, finalMinPrice, finalMaxPrice, zoom, zoomCenter, offset);
  const getVisibleX = (index) => getX(index, chartWidth, padding, sampleData.length, zoom, zoomCenter, offset);


  // --- Step 5: Draw Everything ---

  if (smaResults.length > 0) {
    smaResults.forEach(res => {
      const downsampled = downsampleIndicatorData(res.data, fullData.length, sampleData.length);

      ctx.beginPath();
      let firstMove = true;
      downsampled.forEach((point, i) => {
        if (point.value !== null && !isNaN(point.value)) {
          // Use the downsampled index 'i' with the getVisibleX helper
          const x = getVisibleX(i);
          const y = getYCoord(point.value);
          if (firstMove) {
            ctx.moveTo(x, y);
            firstMove = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.strokeStyle = res.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // Draw EMAs
  if (emaResults.length > 0) {
    emaResults.forEach(res => {
      const downsampled = downsampleIndicatorData(res.data, fullData.length, sampleData.length);

      ctx.beginPath();
      let firstMove = true;
      downsampled.forEach((point, i) => {
        if (point.value !== null && !isNaN(point.value)) {
          // Use the downsampled index 'i' with the getVisibleX helper
          const x = getVisibleX(i);
          const y = getYCoord(point.value);
          if (firstMove) {
            ctx.moveTo(x, y);
            firstMove = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.strokeStyle = res.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // Draw Bollinger Bands
  if (bollingerResult) {
    const drawBandLine = (data, color, lineWidth = 1) => {
      const downsampled = downsampleIndicatorData(data, fullData.length, sampleData.length);
      ctx.beginPath();
      let firstMove = true;
      downsampled.forEach((point, i) => {
        if (point.value !== null && !isNaN(point.value)) {
          // Use the downsampled index 'i' with the getVisibleX helper
          const x = getVisibleX(i);
          const y = getYCoord(point.value);
          if (firstMove) {
            ctx.moveTo(x, y);
            firstMove = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    drawBandLine(bollingerResult.upper, '#da3633');
    drawBandLine(bollingerResult.middle, '#8b949e');
    drawBandLine(bollingerResult.lower, '#238636');
  }

  if (ichimokuResult) {
    // We already calculated ichimokuResult, now we just draw it.
    const downsampledConversion = downsampleIndicatorData(ichimokuResult.conversion, fullData.length, sampleData.length);
    const downsampledBase = downsampleIndicatorData(ichimokuResult.base, fullData.length, sampleData.length);
    const downsampledSpanA = downsampleIndicatorData(ichimokuResult.spanA, fullData.length, sampleData.length);
    const downsampledSpanB = downsampleIndicatorData(ichimokuResult.spanB, fullData.length, sampleData.length);
    const downsampledChikou = ichimokuResult.chikou ? downsampleIndicatorData(ichimokuResult.chikou, fullData.length, sampleData.length) : [];

    // Kumo (Cloud) Drawing
    ctx.beginPath();
    let firstPoint = true;
    downsampledSpanA.forEach((point, i) => {
      if (point.value !== null && !isNaN(point.value)) {
        const x = getVisibleX(i + 26);
        const y = getYCoord(point.value);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    [...downsampledSpanB].reverse().forEach((point, i) => {
      const originalI = downsampledSpanB.length - 1 - i;
      if (point.value !== null && !isNaN(point.value)) {
        const x = getVisibleX(originalI + 26);
        const y = getYCoord(point.value);
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();

    if (ichimokuResult.spanA.length > 0 && ichimokuResult.spanB.length > 0) {
      const lastA = ichimokuResult.spanA[ichimokuResult.spanA.length - 1];
      const lastB = ichimokuResult.spanB[ichimokuResult.spanB.length - 1];
      ctx.fillStyle = lastA > lastB ? 'rgba(35, 134, 54, 0.2)' : 'rgba(218, 54, 51, 0.2)';
    }
    ctx.fill();

    // Line Drawing Helper
    const drawIchimokuLine = (data, color, shift = 0) => {
      ctx.beginPath();
      let firstMove = true;
      data.forEach((point, i) => {
        if (point.value !== null && !isNaN(point.value)) {
          const x = getVisibleX(i + shift);
          const y = getYCoord(point.value);
          if (firstMove) {
            ctx.moveTo(x, y);
            firstMove = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawIchimokuLine(downsampledConversion, '#58a6ff', 0);
    drawIchimokuLine(downsampledBase, '#da3633', 0);
    drawIchimokuLine(downsampledChikou, '#238636', -26);
  }

  // --- SUB-CHART INDICATORS (With Correct Centering) ---

  // --- Step 1: Define constants and identify active sub-charts ---
  const SUB_CHART_DRAW_HEIGHT = 120; // The height of the graph part of one sub-chart
  const SUB_CHART_GAP = 30;         // The vertical space between sub-charts
  const getXCoord = (index) => getX(index, chartWidth, padding, fullData.length, zoom, zoomCenter, offset);

  const activeSubCharts = [];
  if (Array.isArray(activeIndicators.rsi) && activeIndicators.rsi.length > 0) activeSubCharts.push({ type: 'rsi', configs: activeIndicators.rsi });
  if (Array.isArray(activeIndicators.stochastic) && activeIndicators.stochastic.length > 0) activeSubCharts.push({ type: 'stochastic', configs: activeIndicators.stochastic });
  if (Array.isArray(activeIndicators.macd) && activeIndicators.macd.length > 0) activeSubCharts.push({ type: 'macd', configs: activeIndicators.macd });
  if (Array.isArray(activeIndicators.atr) && activeIndicators.atr.length > 0) activeSubCharts.push({ type: 'atr', configs: activeIndicators.atr });


  if (activeSubCharts.length > 0) {
    // --- Step 2: Calculate the required space and the correct starting position ---

    // Calculate the total height that our block of active sub-charts will occupy.
    const totalBlockHeight = (activeSubCharts.length * SUB_CHART_DRAW_HEIGHT) + (Math.max(0, activeSubCharts.length - 1) * SUB_CHART_GAP);

    // Calculate the total available vertical space for all sub-charts below the main chart.
    const subChartAreaTotalHeight = (mainChartHeight - padding.bottom) - (padding.top + mainChartHeight);

    // Calculate the correct starting Y-position to center the block within the available area.
    const startY = (padding.top + mainChartHeight) + (subChartAreaTotalHeight / 2) - (totalBlockHeight / 2);

    // This variable will track the Y-position for the current sub-chart being drawn.
    let currentY = startY;

    // --- Step 3: Draw each active sub-chart sequentially ---
    activeSubCharts.forEach(indicator => {
      switch (indicator.type) {
        case 'rsi':
          indicator.configs.forEach((cfg) => {
            if (dataForCalculations.length >= cfg.period) {
              const rsiY = currentY;
              drawSubChartContainer(ctx, rsiY, SUB_CHART_DRAW_HEIGHT, chartWidth, padding, [30, 50, 70]);
              const rsi = calculateRSI(dataForCalculations, cfg.period);
              const getYRSI = (value) => rsiY + SUB_CHART_DRAW_HEIGHT - (value / 100) * SUB_CHART_DRAW_HEIGHT;
              drawLine(ctx, downsampleIndicatorData(rsi, fullData.length, sampleData.length), getXCoord, getYRSI, '#c9d1d9');
              currentY += SUB_CHART_DRAW_HEIGHT + SUB_CHART_GAP;
            }
          });
          break;

        case 'stochastic':
          indicator.configs.forEach((cfg) => {
            if (dataForCalculations.length >= cfg.kPeriod) {
              const stochY = currentY; // Use the calculated starting Y position

              const stoch = calculateStochastic(dataForCalculations, cfg.kPeriod, cfg.dPeriod);
              const downsampledK = downsampleIndicatorData(stoch.k, fullData.length, sampleData.length);
              const downsampledD = downsampleIndicatorData(stoch.d, fullData.length, sampleData.length);

              // 1. Find the min and max values ONLY from the data that will be drawn.
              const visibleValues = [
                ...downsampledK.map(p => p.value),
                ...downsampledD.map(p => p.value)
              ].filter(v => v !== null && !isNaN(v));

              // 2. Add some padding so the line doesn't touch the top/bottom edges.
              let yMin = Math.min(...visibleValues);
              let yMax = Math.max(...visibleValues);
              const range = yMax - yMin;
              yMin -= range * 0.1; // Add 10% padding below
              yMax += range * 0.1; // Add 10% padding above

              // 3. Draw the container using the new dynamic min/max for its grid lines.
              // We still show the 20/80 lines for context.
              drawSubChartContainer(ctx, stochY, SUB_CHART_DRAW_HEIGHT, chartWidth, padding, [20, 50, 80]);

              // 4. Create a scaling function that uses the new dynamic range.
              const getYStochScaled = (value) => {
                if (yMax - yMin === 0) return stochY + SUB_CHART_DRAW_HEIGHT / 2; // Avoid division by zero
                return stochY + SUB_CHART_DRAW_HEIGHT - ((value - yMin) / (yMax - yMin)) * SUB_CHART_DRAW_HEIGHT;
              };

              // 5. Draw the lines using the new scaling function.
              drawLine(ctx, downsampledK, getXCoord, getYStochScaled, '#58a6ff');
              drawLine(ctx, downsampledD, getXCoord, getYStochScaled, '#da3633');

              currentY += SUB_CHART_DRAW_HEIGHT + SUB_CHART_GAP;
            }
          });
          break;

        case 'macd':
          activeIndicators.macd.forEach((cfg) => {
            if (dataForCalculations.length >= Math.max(cfg.fastPeriod, cfg.slowPeriod, cfg.signalPeriod)) {
              const macdY = currentY;

              const macd = calculateMACD(dataForCalculations, cfg.fastPeriod, cfg.slowPeriod, cfg.signalPeriod);
              const dMACD = downsampleIndicatorData(macd.macdLine, fullData.length, sampleData.length);
              const dSignal = downsampleIndicatorData(macd.signalLine, fullData.length, sampleData.length);
              const dHist = downsampleIndicatorData(macd.histogram, fullData.length, sampleData.length);
              const visibleValues = [...dMACD.map(p => p.value), ...dSignal.map(p => p.value), ...dHist.map(p => p.value)].filter(v => v != null);
              if (visibleValues.length > 0) {
                const yMin = Math.min(...visibleValues);
                const yMax = Math.max(...visibleValues);
                drawSubChartContainer(ctx, macdY, SUB_CHART_DRAW_HEIGHT, chartWidth, padding, [0], yMin, yMax);
                const getYMACD = (value) => macdY + SUB_CHART_DRAW_HEIGHT - ((value - yMin) / (yMax - yMin)) * SUB_CHART_DRAW_HEIGHT;
                dHist.forEach(point => {
                  if (point.value != null) {
                    const x = getXCoord(point.originalIndex);
                    ctx.fillStyle = point.value >= 0 ? 'rgba(35, 134, 54, 0.7)' : 'rgba(218, 54, 51, 0.7)';
                    ctx.fillRect(x - candleWidth / 4, getYMACD(point.value), candleWidth / 2, getYMACD(0) - getYMACD(point.value));
                  }
                });
                drawLine(ctx, dMACD, getXCoord, getYMACD, '#58a6ff');
                drawLine(ctx, dSignal, getXCoord, getYMACD, '#f59e42');
              }
              currentY += SUB_CHART_DRAW_HEIGHT + SUB_CHART_GAP;
            }
          });
          break;

        case 'atr':
          activeIndicators.atr.forEach((cfg) => {
            if (dataForCalculations.length >= cfg.period) {
              const atrY = currentY;

              const atr = calculateATR(dataForCalculations, cfg.period);
              const dATR = downsampleIndicatorData(atr, fullData.length, sampleData.length);
              const visibleValues = dATR.map(p => p.value).filter(v => v != null);
              if (visibleValues.length > 0) {
                const yMax = Math.max(...visibleValues);
                drawSubChartContainer(ctx, atrY, SUB_CHART_DRAW_HEIGHT, chartWidth, padding, [], 0, yMax);
                const getYATR = (value) => atrY + SUB_CHART_DRAW_HEIGHT - (value / yMax) * SUB_CHART_DRAW_HEIGHT;
                drawLine(ctx, dATR, getXCoord, getYATR, '#c9d1d9');
              }
              currentY += SUB_CHART_DRAW_HEIGHT + SUB_CHART_GAP;
            }
          });
          break;

        default:
          break;
      }
    });
  }

  if (showPredictions) {
    // --- Part 1: Draw the full dashed line (existing logic) ---
    ctx.strokeStyle = '#8b5cf6'; // Purple for predictions
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); // Dashed line
    ctx.beginPath();

    let firstPredictionPoint = true;

    fullData.forEach((d, index) => {
      if (d?.is_prediction && d.predicted_close !== null) {
        const x = getX(index, chartWidth, padding, fullData.length, zoom, zoomCenter, offset);
        const y = getYCoord(d.predicted_close);

        if (firstPredictionPoint) {
          // Find the last historical point to connect to
          const lastHistoricalPoint = fullData[index - 1];
          if (lastHistoricalPoint && lastHistoricalPoint.close) {
            const lastX = getX(index - 1, chartWidth, padding, fullData.length, zoom, zoomCenter, offset);
            const lastY = getYCoord(lastHistoricalPoint.close);
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
          } else {
            ctx.moveTo(x, y);
          }
          firstPredictionPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash for the points


    // --- Part 2: Draw the "big points" on top of the line ---

    // First, get an array of only the prediction points
    const allPredictions = fullData.filter(d => d?.is_prediction && d.predicted_close !== null);

    // Then, get just the last 12 from that array
    const last12Predictions = allPredictions.slice(-12);

    // Now, loop through only these 12 points to draw them
    last12Predictions.forEach(point => {
      // We still need the original index to calculate the correct X position
      const index = fullData.indexOf(point);
      if (index === -1) return; // Safety check

      const x = getX(index, chartWidth, padding, fullData.length, zoom, zoomCenter, offset);
      const y = getYCoord(point.predicted_close);

      // Style for the big points
      ctx.fillStyle = '#8b5cf6'; // Solid fill color
      ctx.strokeStyle = '#0d1117'; // A border to make the points pop against the line
      ctx.lineWidth = 2;

      // Draw the circle
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI); // 5px radius circle
      ctx.fill();
      ctx.stroke();
    });
  }
}