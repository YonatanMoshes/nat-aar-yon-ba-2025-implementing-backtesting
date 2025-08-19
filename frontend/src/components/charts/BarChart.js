import drawIndicators from '../../utilities/DrawIndicators';
import { getX, getY, drawGrid } from '../../utilities/helpers';

export default function drawBarChart(ctx, canvas, sampleData, fullData, activeIndicators, showPredictions, offset, zoom, zoomCenter) {
  // --- 1. Clear Canvas ---
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // --- 2. Define Chart Dimensions ---
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  
  // Calculate the space needed for sub-charts (this logic is correct)
  let subChartCount = 0;
  if (activeIndicators.rsi?.length > 0) subChartCount++;
  if (activeIndicators.macd?.length > 0) subChartCount++;
  if (activeIndicators.stochastic?.length > 0) subChartCount++;
  if (activeIndicators.atr?.length > 0) subChartCount++;
  const totalSubChartHeight = subChartCount * 150; // Use the total slot height from ChartCanvas

  // Define the dimensions for the MAIN PRICE CHART ONLY
  const chartWidth = canvas.width - padding.left - padding.right;
  const mainChartHeight = canvas.height - padding.top - padding.bottom - totalSubChartHeight;

  // --- 3. Calculate Price Scale and Coordinate Helpers ---
  // We calculate the scale once and use helpers for all drawing.
  const allValues = sampleData.flatMap(d => [d?.open, d?.high, d?.low, d?.close]).filter(v => v != null);
  const minPrice = Math.min(...allValues) * 0.9995;
  const maxPrice = Math.max(...allValues) * 1.0005;

  const getXCoord = (index) => getX(index, chartWidth, padding, sampleData.length, zoom, zoomCenter, offset);
  const getYCoord = (price) => getY(price, mainChartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset);

  // --- 4. Draw Grid ---
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

  // --- 5. Draw the OHLC Bars ---
  const barWidth = Math.max(3, Math.min(chartWidth / sampleData.length * 0.6, 20) * zoom);

  sampleData.forEach((d, i) => {
    if (d.open === null || d.high === null || d.low === null || d.close === null) return;

    const x = getXCoord(i);
    const yHigh = getYCoord(d.high);
    const yLow = getYCoord(d.low);
    const yOpen = getYCoord(d.open);
    const yClose = getYCoord(d.close);

    // Set color based on whether the price went up or down
    ctx.strokeStyle = d.close >= d.open ? '#238636' : '#da3633'; // Green for up, Red for down
    ctx.lineWidth = 1.5;

    // Draw the main High-Low vertical line
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Draw the Open tick (a small horizontal line to the left)
    ctx.beginPath();
    ctx.moveTo(x - barWidth / 2, yOpen);
    ctx.lineTo(x, yOpen);
    ctx.stroke();

    // Draw the Close tick (a small horizontal line to the right)
    ctx.beginPath();
    ctx.moveTo(x, yClose);
    ctx.lineTo(x + barWidth / 2, yClose);
    ctx.stroke();
  });
  
  // --- 6. Draw Indicators ---
  // The call to drawIndicators is now correct because we pass it the right dimensions.
  drawIndicators(
    ctx, fullData, sampleData, activeIndicators, showPredictions,
    padding, chartWidth, mainChartHeight, minPrice, maxPrice,
    barWidth, // Pass barWidth instead of candleWidth
    offset, zoom, zoomCenter
  );
}