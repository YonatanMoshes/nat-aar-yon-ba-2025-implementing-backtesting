import { STEP_PERCENT } from './consts';

export function getX(index, chartWidth, padding, sampleDataLength, zoom, zoomCenter, offset) {
  const baseX = padding.left + (index * chartWidth) / (sampleDataLength - 1);
  return (baseX - zoomCenter.x) * zoom + zoomCenter.x + offset.x;
}


export function getY(price, chartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset) {
  const priceRange = maxPrice - minPrice;
  const baseY = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  return (baseY - zoomCenter.y) * zoom + zoomCenter.y + offset.y;
}

export function drawGrid(ctx, padding, chartWidth, mainChartHeight, minPrice, maxPrice, sampleData, getXCoord, getYCoord) {
  ctx.strokeStyle = '#21262d'; // Color for the grid lines
  ctx.lineWidth = 1;
  ctx.font = '11px Segoe UI';

  const priceRange = maxPrice - minPrice;
  if (priceRange <= 0) return; // Avoid drawing if the range is invalid

  // --- Draw Horizontal (Price) Grid Lines and Labels ---
  const numYGridLines = 8;
  for (let i = 0; i <= numYGridLines; i++) {
    const price = maxPrice - (i * priceRange) / numYGridLines;
    const y = getYCoord(price);

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    // Draw the label
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'right';
    ctx.fillText(price.toFixed(2), padding.left - 8, y + 4);
  }

  // --- Draw Vertical (Time) Grid Lines and Labels ---
  // Only draw a reasonable number of labels to avoid clutter
  const numXGridLines = Math.min(10, Math.floor(sampleData.length / 5));
  if (numXGridLines <= 0) return;
  
  const step = Math.floor(sampleData.length / numXGridLines);
  for (let i = 0; i < sampleData.length; i += step) {
    const d = sampleData[i];
    const x = getXCoord(i);
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + mainChartHeight);
    ctx.stroke();

    // Draw the label
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.fillText(typeof d.time === 'string' ? d.time.slice(5, 16) : '', x, padding.top + mainChartHeight + 20);
  }
}

// Add future predictions at t + 1 hour for each prediction at time t
export function addPredictions(processed, threshold_num) {
    const predictionsToAdd = [];
    processed.forEach((d, index) => {
      // Combine binary and percentage prediction logic
      if (typeof d.close === 'number') {
        let predicted_close = undefined;
  
        // Prioritize combined logic if both binary and percentage predictions exist
        if (d.binary_predictions && d.pct_prediction !== undefined && d.pct_prediction !== null) {
          const binaryPrediction = d.binary_predictions[`threshold_${threshold_num - 1}`];
          
          if (binaryPrediction !== undefined && binaryPrediction !== null) {
            if (binaryPrediction === 1) {
              predicted_close = d.close * (1 +  Math.expm1(d.pct_prediction));
            } else if (binaryPrediction === 0) {
              predicted_close = d.close * (1 - Math.expm1(d.pct_prediction));
            }
          }
        }
        // Fallback to binary prediction if only binary exists
        else if (d.binary_predictions) {
          const binaryPrediction = d.binary_predictions.threshold_2;
          if (binaryPrediction !== undefined && binaryPrediction !== null) {
            if (binaryPrediction === 1) {
              predicted_close = d.close * (1 + STEP_PERCENT);
            } else if (binaryPrediction === 0) {
              predicted_close = d.close * (1 - STEP_PERCENT);
            }
          }
        }
        // Fallback to percentage prediction if only percentage exists
        else if (d.pct_prediction !== undefined && d.pct_prediction !== null) {
          predicted_close = d.close * (1 + Math.expm1(d.pct_prediction));
        }
  
        if (predicted_close !== undefined) {
          const futureTime = new Date(d.timestamp);
          futureTime.setMinutes(futureTime.getMinutes() + 60); // Add 1 hour
  
          predictionsToAdd.push({
            timestamp: dateToString(futureTime),
            open: null,
            high: null,
            low: null,
            close: null,
            predicted_close: predicted_close,
            binary_predictions: d.binary_predictions,
            pct_prediction: Math.expm1(d.pct_prediction),
            is_prediction: true
          });
        }
      }
    });
    // Add the future predictions to the dataset
    processed = [...processed, ...predictionsToAdd];
    
    // Sort by timestamp to maintain chronological order
    processed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return processed;
}

// Helper to convert 'YYYY-MM-DDTHH:mm' string to a Date object
export function stringToDate(dtString) {
  return new Date(dtString);
}

// Helper to convert a Date object back to 'YYYY-MM-DDTHH:mm' string
export function dateToString(dtObject) {
  if (!dtObject) return '';
  // Pad single digit month/day/hour/minute with a leading zero
  const pad = (num) => num.toString().padStart(2, '0');
  
  const year = dtObject.getFullYear();
  const month = pad(dtObject.getMonth() + 1); // getMonth() is 0-indexed
  const day = pad(dtObject.getDate());
  const hours = pad(dtObject.getHours());
  const minutes = pad(dtObject.getMinutes());
  const seconds = pad(dtObject.getSeconds());
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatCurrency(value) {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};