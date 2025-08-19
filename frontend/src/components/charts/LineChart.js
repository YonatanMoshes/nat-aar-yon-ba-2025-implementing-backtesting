import drawIndicators from '../../utilities/DrawIndicators';
import { getX, getY, drawGrid } from '../../utilities/helpers';

export default function drawLineChart(ctx, canvas, sampleData, fullData, activeIndicators, showPredictions, offset, zoom, zoomCenter) {
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

  const getXCoord = (index) => getX(index, chartWidth, padding, sampleData.length, zoom, zoomCenter, offset);
  const getYCoord = (price) => getY(price, mainChartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset);

  // --- Draw Grid ---
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

  // Draw line for close prices
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  sampleData.forEach((d, i) => {
    if (typeof d.close === 'number') {
      const x = getXCoord(i);
      const y = getYCoord(d.close);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  // Draw indicators on top using full dataset for calculations
  
  const candleWidth = Math.min(chartWidth / sampleData.length * 0.6, 20) * zoom;
  
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