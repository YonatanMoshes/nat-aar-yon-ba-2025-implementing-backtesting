import React, { useRef, useEffect, useState } from 'react';
import drawCandlestickChart from './charts/CandlestickChart';
import drawLineChart from './charts/LineChart';
import drawAreaChart from './charts/AreaChart';
import drawBarChart from './charts/BarChart';
import ChartTooltip from './ChartTooltip';
import { getX, getY } from '../utilities/helpers';

const calculateCanvasHeight = (activeIndicators) => {
  const BASE_HEIGHT = 600;
  const SUB_CHART_TOTAL_HEIGHT = 150;
  let subChartCount = 0;
  if (activeIndicators.rsi?.length > 0) subChartCount++;
  if (activeIndicators.macd?.length > 0) subChartCount++;
  if (activeIndicators.stochastic?.length > 0) subChartCount++;
  if (activeIndicators.atr?.length > 0) subChartCount++;
  return BASE_HEIGHT + (subChartCount * SUB_CHART_TOTAL_HEIGHT);
};

export default function ChartCanvas({
  sampleData,
  fullData,
  // If a parent doesn't provide these, they will default to these safe values.
  activeIndicators = {},
  showPredictions = false,
  chartType = 'candlestick'
}) {
  const canvasRef = useRef(null);

  const [tooltip, setTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  useEffect(() => {
    const visiblePrices = sampleData.flatMap(d => {
      const prices = [];
      if (d.high != null) prices.push(d.high);
      if (d.low != null) prices.push(d.low);
      return prices;
    });
    setMinPrice(Math.min(...visiblePrices));
    setMaxPrice(Math.max(...visiblePrices));

    const canvas = canvasRef.current;
    if (!canvas || !sampleData || sampleData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const totalHeight = calculateCanvasHeight(activeIndicators);
    const parentWidth = canvas.parentElement.clientWidth;
    if (canvas.width !== parentWidth || canvas.height !== totalHeight) {
      canvas.width = parentWidth;
      canvas.height = totalHeight;
    }
    const chartFunctions = {
      candlestick: drawCandlestickChart,
      line: drawLineChart,
      area: drawAreaChart,
      bar: drawBarChart,
    };
    const drawFunction = chartFunctions[chartType];
    if (drawFunction) {
      drawFunction(ctx, canvas, sampleData, fullData, activeIndicators, showPredictions, offset, zoom, zoomCenter);
    }
  }, [sampleData, fullData, activeIndicators, showPredictions, offset, zoom, zoomCenter, chartType]);

  // --- MOUSE EVENT HANDLERS ---

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !sampleData || sampleData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    // This now uses 'isDragging', 'dragStart', and 'setOffset' correctly.
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset(prevOffset => ({
        x: prevOffset.x + dx,
        y: prevOffset.y + dy
      }));
      // Update the drag start point for the next mouse move event
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    // Tooltip logic
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const mainChartHeight = 600 - padding.top - padding.bottom;

    if (y > padding.top && y < padding.top + mainChartHeight) {
      const candleWidth = Math.min(chartWidth / sampleData.length * 0.6, 20) * zoom;
      let hoveredCandle = null;

      sampleData.forEach((d, i) => {
        const candleX = getX(i, chartWidth, padding, sampleData.length, zoom, zoomCenter, offset);

        const yHigh = getY(d.high, mainChartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset);
        const yLow = getY(d.low, mainChartHeight, padding, minPrice, maxPrice, zoom, zoomCenter, offset);

        const withinX = Math.abs(x - candleX) < candleWidth / 2;

        if (d.is_prediction && withinX) {
          hoveredCandle = d;
        }
        else {
          const withinY = y >= Math.min(yHigh, yLow) + 10 &&
            y <= Math.max(yHigh, yLow) + 70; // There is some error margin here, to allow bigger hover zone

          // This horizontal check is sufficient for tooltip detection.
          if (withinX && withinY) {
            hoveredCandle = d;
          }
        }
      });
      setTooltip(hoveredCandle);
    } else {
      setTooltip(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setZoomCenter({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.min(Math.max(prevZoom * zoomFactor, 0.5), 10)); // Increased max zoom
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setTooltip(null);
  };

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
      />
      <ChartTooltip tooltip={tooltip} mousePos={mousePos} showPredictions={showPredictions} />
    </div>
  );
}