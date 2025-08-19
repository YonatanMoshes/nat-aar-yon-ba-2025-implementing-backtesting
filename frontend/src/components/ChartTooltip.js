import React from 'react';

export default function ChartTooltip({ tooltip, mousePos, showPredictions }) {
  if (!tooltip) return null;
  
  return (
    <div>
      {(tooltip.is_prediction && !showPredictions) ? null : (
        <div 
        className="tooltip"
        style={{
          left: mousePos.x + 10,
          top: mousePos.y - 100,
          transform: 'translate(-50%, 0)'
        }}
      >
        <div className="tooltip-title">{tooltip.time}</div>
        <div className="tooltip-content">
          {tooltip.is_prediction ? (
            // Future prediction tooltip
            <>
              <div className="tooltip-row">
                <span className="tooltip-label timestamp">Time Stamp:</span>
                <span className="tooltip-value">{tooltip.timestamp.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label future">Future Prediction:</span>
                <span className="tooltip-value">${tooltip.predicted_close.toLocaleString()}</span>
              </div>
            </>
          ) : (
            // Historical data tooltip
            <>
              <div className="tooltip-row">
                <span className="tooltip-label timestamp">Time Stamp:</span>
                <span className="tooltip-value">{tooltip.timestamp.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label open">Open:</span>
                <span className="tooltip-value">${tooltip.open.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label high">High:</span>
                <span className="tooltip-value">${tooltip.high.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label low">Low:</span>
                <span className="tooltip-value">${tooltip.low.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label close">Close:</span>
                <span className="tooltip-value">${tooltip.close.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
} 