import drawIndicators from '../../utilities/DrawIndicators';
import { getX, getY, drawGrid } from '../../utilities/helpers';

export default function drawCandlestickChart(ctx, canvas, sampleData, fullData, activeIndicators, showPredictions, offset, zoom, zoomCenter) {
  // Clear canvas
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Calculate chart dimensions
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  
  // Calculate the space needed for sub-charts
  let subChartCount = 0;
  const SUB_CHART_HEIGHT = 120; // This must match the value in drawIndicators.js
  if (activeIndicators.rsi?.length > 0) subChartCount++;
  if (activeIndicators.macd?.length > 0) subChartCount++;
  if (activeIndicators.stochastic?.length > 0) subChartCount++;
  if (activeIndicators.atr?.length > 0) subChartCount++;
  const totalSubChartHeight = subChartCount * (SUB_CHART_HEIGHT + 20); // Add 20px gap for each

  // Define the dimensions for the MAIN PRICE CHART ONLY
  const chartWidth = canvas.width - padding.left - padding.right;
  const mainChartHeight = canvas.height - padding.top - padding.bottom - totalSubChartHeight;

  // Find min/max values with better scaling
  const allValues = sampleData.flatMap(d => [d.open, d.high, d.low, d.close]).filter(v => v !== null);
  const minPrice = Math.min(...allValues) * 0.9995;
  const maxPrice = Math.max(...allValues) * 1.0005;
  const priceRange = maxPrice - minPrice;

  const candleWidth = Math.max(1, Math.min(chartWidth / sampleData.length * 0.6, 20) * zoom);

  // Draw grid
  const getXCoord = (index) => getX(index, chartWidth, padding, sampleData.length, zoom, zoomCenter, offset);
  const getYCoord = (price) => getY(price, mainChartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset);

  // Draw grid
  drawGrid(
    ctx, 
    padding, 
    chartWidth, 
    mainChartHeight, 
    minPrice, 
    maxPrice, 
    sampleData,
    getXCoord,
    getYCoord
  );

  // Draw candlesticks (only for historical data)
  sampleData.forEach((d, i) => {
    // Skip this data point if it's a future prediction or if data is missing
    if (d.is_prediction || d.open === null || d.close === null) return;

    const x = getXCoord(i);
    const yOpen = getYCoord(d.open);
    const yHigh = getYCoord(d.high);
    const yLow = getYCoord(d.low);
    const yClose = getYCoord(d.close);

    const isGreen = d.close >= d.open; // Up or Down
    const color = isGreen ? '#238636' : '#da3633';

    // --- Draw the Wick (the high-low line) ---
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5; // Wicks can be slightly thinner than the body
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    
    // --- Draw the Candle Body ---
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.abs(yOpen - yClose);
    
    // For green candles, fill with the candle color.
    // For red candles, fill with the background color to make them appear "hollow".
    ctx.fillStyle = isGreen ? color : '#0d1117';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1; // Body outline can be 1px

    // Use Math.max(bodyHeight, 1) to ensure even "doji" candles (where open=close) are visible as a thin line.
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(bodyHeight, 1));
    ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(bodyHeight, 1));
  });

  // Draw indicators on top using full dataset for calculations
  drawIndicators(ctx,
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
  zoomCenter);
} 