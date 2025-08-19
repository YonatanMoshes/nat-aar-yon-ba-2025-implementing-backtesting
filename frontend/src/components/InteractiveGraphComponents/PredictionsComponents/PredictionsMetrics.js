import React, { useRef, useEffect, useState } from 'react';

const calculateMetrics = (data, currentTimeIndex, threshold_num, windowHours = 3, classStats = "Class 1") => {
  if (!data || data.length === 0) return { accuracy: 0, precision: 0, recall: 0, truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0, totalPredictions: 0, mse: 0 };
  
  const historicalData = data.filter(point => !point.is_prediction);
  if (historicalData.length === 0) return { accuracy: 0, precision: 0, recall: 0, truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0, totalPredictions: 0, mse: 0 };
  
  // Convert window hours to data points (assuming 5-minute intervals)
  const windowPoints = Math.floor((windowHours * 60) / 5);
  const startIndex = Math.max(0, currentTimeIndex - windowPoints);
  const endIndex = Math.min(currentTimeIndex, historicalData.length - 1);
  
  const windowData = historicalData.slice(startIndex, endIndex + 1);
  
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalPredictions = 0;

  let squaredErrorSum = 0;
  let mseCount = 0;
  
  windowData.forEach(point => {
    let prediction = null;
    if (point.binary_predictions && point.binary_predictions[`threshold_${threshold_num - 1}`] !== undefined) {
      prediction = point.binary_predictions[`threshold_${threshold_num - 1}`];
    } else if (point.pct_prediction !== undefined && point.pct_prediction !== null) {
      // Convert percentage prediction to binary
      prediction = point.pct_prediction > 0 ? 1 : 0;
    }

    let actual_direction = null;
    if(point.oneHourLaterPrice !== null && point.oneHourLaterPrice !== undefined){
      actual_direction = point.oneHourLaterPrice >= point.close ? 'up' : 'down';  
    }
    
    if (prediction !== null && prediction !== undefined && 
        actual_direction !== null && actual_direction !== undefined) {
      totalPredictions++;
      
      if (prediction === 1 && actual_direction === 'up') {
        truePositives++;
      } else if (prediction === 1 && actual_direction === 'down') {
        falsePositives++;
      } else if (prediction === 0 && actual_direction === 'up') {
        falseNegatives++;
      } else if (prediction === 0 && actual_direction === 'down') {
        trueNegatives++;
      }
    }

    if (point.pct_prediction !== null && point.pct_prediction !== undefined && 
        point.oneHourLaterPrice !== null && point.oneHourLaterPrice !== undefined) {
      
      // We need to reverse the log1p transformation on both values
      let pred_pct = null;
      if(prediction === 1) {
        pred_pct = Math.expm1(point.pct_prediction);
      } else if(prediction === 0) {
        pred_pct = -Math.expm1(point.pct_prediction);
      }
      const actual_pct_change = (point.oneHourLaterPrice - point.close) / point.close;
      
      if(pred_pct !== null && actual_pct_change !== null) {
        const error = actual_pct_change - pred_pct;
        squaredErrorSum += error * error;
        mseCount++; 
      }
    }
  });
  
  let accuracy = totalPredictions > 0 ? (truePositives + trueNegatives) / totalPredictions : 0;; 
  let precision;
  let recall; 
  if(classStats === "Class 1"){
    precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0;
    recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  } else if(classStats === "Class 0"){
    precision = (trueNegatives + falseNegatives) > 0 ? trueNegatives / (trueNegatives + falseNegatives) : 0;
    recall = (trueNegatives + falsePositives) > 0 ? trueNegatives / (trueNegatives + falsePositives) : 0;
  }
  const mse = mseCount > 0 ? squaredErrorSum / mseCount : 0;


  return {
    accuracy: accuracy * 100,
    precision: precision * 100,
    recall: recall * 100,
    totalPredictions,
    truePositives, falsePositives, trueNegatives, falseNegatives,
    mse
  };
};

const drawMetricsGraph = (canvas, metricsHistory) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);
  
  if (metricsHistory.length === 0) return;
  
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Find min/max values
  const allValues = metricsHistory.flatMap(m => [m.accuracy, m.precision, m.recall]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  
  // Draw grid
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i * graphHeight) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + graphWidth, y);
    ctx.stroke();
    
    const value = maxValue - (i * valueRange) / 4;
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText(`${value.toFixed(1)}%`, padding.left - 5, y + 3);
  }
  
  // Draw metrics lines
  const colors = {
    accuracy: '#10b981',
    precision: '#3b82f6',
    recall: '#f59e0b'
  };
  
  Object.entries(colors).forEach(([metric, color]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    metricsHistory.forEach((point, i) => {
      const x = padding.left + (i * graphWidth) / (metricsHistory.length - 1);
      const y = padding.top + graphHeight - ((point[metric] - minValue) / valueRange) * graphHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  });
  
  // Draw legend
  const legendY = height - 15;
  Object.entries(colors).forEach(([metric, color], i) => {
    const x = padding.left + (i * 80);
    ctx.fillStyle = color;
    ctx.fillRect(x, legendY - 8, 12, 2);
    ctx.fillStyle = '#f0f6fc';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText(metric.charAt(0).toUpperCase() + metric.slice(1), x + 15, legendY);
  });
};

export default function PredictionsMetrics({ data, showMetrics, threshold_num, onClose }) {
  const canvasRef = useRef(null);
  
  const [classStats, setClassStats] = useState("Class 1"); // 1 = Up, 0 = Down
  const [windowHours, setWindowHours] = useState(3);
  
  

  useEffect(() => {
    if (!showMetrics || !data || data.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Filter out future prediction points first
    const historicalData = data.filter(point => !point.is_prediction);
    
    if (historicalData.length === 0) return;
    
    // Calculate metrics for each point in the historical data
    const metricsHistory = [];
    for (let i = 0; i < historicalData.length; i++) {
      const metrics = calculateMetrics(data, i, threshold_num, windowHours, classStats);
      metricsHistory.push(metrics);
    }
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;
    
    // Draw the metrics graph
    drawMetricsGraph(canvas, metricsHistory);
    
  }, [data, showMetrics, threshold_num, windowHours, classStats]);
  
  if (!showMetrics) return null;
  
  // Calculate current metrics
  const historicalData = data ? data.filter(point => !point.is_prediction) : [];
  const currentMetrics = historicalData.length > 0 
    ? calculateMetrics(data, historicalData.length - 1, threshold_num, windowHours, classStats)
    : { accuracy: 0, precision: 0, recall: 0, truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0, totalPredictions: 0, mse: 0 };
  
  const averageMetrics = calculateMetrics(data, historicalData.length - 1, threshold_num, 99999, classStats);
  
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '20px',
      zIndex: 1000,
      minWidth: '450px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #30363d',
        paddingBottom: '10px'
      }}>
        <h3 style={{ color: '#f0f6fc', margin: 0 }}>Prediction Metrics ({windowHours}h Window)</h3>

        {/* Class (Up/Down) Selector */}
        <div style={{ background: '#21262d', borderRadius: '6px', padding: '2px' }}>
          {/* We use map just like the other selector */}
          {[{ label: 'Up', value: 'Class 1' }, { label: 'Down', value: 'Class 0' }].map(opt => (
            <button key={opt.value} onClick={() => setClassStats(opt.value)}
              style={{
                background: classStats === opt.value ? (opt.value === 'Class 1' ? '#22c55e' : '#ef4444') : 'none',
                color: classStats === opt.value ? '#fff' : '#8b949e',
                border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
                fontWeight: classStats === opt.value ? 'bold' : 'normal'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>        

        {/* Window Size Selector */}
        <div style={{ background: '#21262d', borderRadius: '6px', padding: '2px' }}>
            {[1, 2, 3].map(hours => (
                <button key={hours} onClick={() => setWindowHours(hours)}
                    style={{
                        background: windowHours === hours ? '#3b82f6' : 'none',
                        color: windowHours === hours ? '#fff' : '#8b949e',
                        border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
                        fontWeight: windowHours === hours ? 'bold' : 'normal'
                    }}
                >{hours}h</button>
            ))}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8b949e',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
      
      {/* Average Metrics Display */}
      <div style={{
        background: '#0d1117',
        padding: '15px',
        borderRadius: '6px',
        border: '1px solid #30363d',
        marginBottom: '20px'
      }}>
        <div style={{
          color: '#8b949e',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          Average Metrics (All Time)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px'
        }}>
          <div style={{
            background: '#21262d',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '3px' }}>Avg Accuracy</div>
            <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
              {averageMetrics.accuracy.toFixed(1)}%
            </div>
          </div>
          <div style={{
            background: '#21262d',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '3px' }}>Avg Precision</div>
            <div style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 'bold' }}>
              {averageMetrics.precision.toFixed(1)}%
            </div>
          </div>
          <div style={{
            background: '#21262d',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '3px' }}>Avg Recall</div>
            <div style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 'bold' }}>
              {averageMetrics.recall.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Current Metrics Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: '#21262d',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '5px' }}>Current Accuracy</div>
          <div style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold' }}>
            {currentMetrics.accuracy.toFixed(1)}%
          </div>
        </div>
        <div style={{
          background: '#21262d',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '5px' }}>Current Precision</div>
          <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold' }}>
            {currentMetrics.precision.toFixed(1)}%
          </div>
        </div>
        <div style={{
          background: '#21262d',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '5px' }}>Current Recall</div>
          <div style={{ color: '#f59e0b', fontSize: '24px', fontWeight: 'bold' }}>
            {currentMetrics.recall.toFixed(1)}%
          </div>
        </div>
      </div>
      
      {/* Confusion Matrix and MSE Display */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {/* Confusion Matrix Box */}
        <div style={{ flex: 1, background: '#0d1117', padding: '15px', borderRadius: '6px', border: '1px solid #30363d' }}>
            <div style={{ color: '#8b949e', fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>
                All Time Confusion Matrix
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#21262d', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ color: '#8b949e', fontSize: '11px' }}>True Positive</div>
                    <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>{averageMetrics.truePositives}</div>
                </div>
                <div style={{ background: '#21262d', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ color: '#8b949e', fontSize: '11px' }}>False Positive</div>
                    <div style={{ color: '#f87171', fontSize: '18px', fontWeight: 'bold' }}>{averageMetrics.falsePositives}</div>
                </div>
                <div style={{ background: '#21262d', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ color: '#8b949e', fontSize: '11px' }}>False Negative</div>
                    <div style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 'bold' }}>{averageMetrics.falseNegatives}</div>
                </div>
                <div style={{ background: '#21262d', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ color: '#8b949e', fontSize: '11px' }}>True Negative</div>
                    <div style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 'bold' }}>{averageMetrics.trueNegatives}</div>
                </div>
            </div>
        </div>
        {/* MSE Box */}
        <div style={{ flex: 1, background: '#0d1117', padding: '15px', borderRadius: '6px', border: '1px solid #30363d', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#8b949e', fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>
                Mean Squared Error (MSE)
            </div>
            <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 'bold' }}>
                {(averageMetrics.mse * 1e6).toFixed(4)}
            </div>
             <div style={{ color: '#8b949e', fontSize: '20px', marginTop: '5px' }}>(×10⁻⁶)</div>
        </div>
      </div>

      {/* Metrics Graph */}
      <div style={{
        background: '#0d1117',
        borderRadius: '6px',
        padding: '10px',
        border: '1px solid #30363d'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '300px',
            display: 'block'
          }}
        />
      </div>
      
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        color: '#8b949e',
        textAlign: 'center'
      }}>
        Metrics calculated over a {windowHours}-hour sliding window. Total predictions: {averageMetrics.totalPredictions}
      </div>
    </div>
  );
} 