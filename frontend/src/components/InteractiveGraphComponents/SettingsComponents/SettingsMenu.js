import React from 'react';
import { CHART_TYPES, STOCKS } from '../../../utilities/consts';
import { useNavigate } from 'react-router-dom';

export default function SettingsMenu({ 
  openPanel, 
  setOpenPanel, 
  onClose, 
  chartType, 
  setChartType, 
  selectedStock, 
  setSelectedStock,
  riskLevel,
  setRiskLevel 
 }) {
  const navigate = useNavigate();

  const handlePanelClick = (panel) => {
    setOpenPanel(panel);
    onClose();
  };
  return (
    <div className="settings-menu-dropdown" style={{ position: 'absolute', top: 48, right: 24, background: '#23272f', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 180 }}>
      {/* Stock selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #404040' }}>
        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>Stock</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STOCKS.map(stock => (
            <button
              key={stock.value}
              onClick={() => setSelectedStock(stock.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: selectedStock === stock.value ? '2px solid #4fc3f7' : '1px solid #404040',
                background: selectedStock === stock.value ? '#4fc3f7' : '#161b22',
                color: selectedStock === stock.value ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: selectedStock === stock.value ? 'bold' : 'normal',
                fontSize: 12
              }}
            >
              {stock.value}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart type selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #404040' }}>
        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>Chart Type</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CHART_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setChartType(type.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: chartType === type.value ? '2px solid #4fc3f7' : '1px solid #404040',
                background: chartType === type.value ? '#4fc3f7' : '#161b22',
                color: chartType === type.value ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: chartType === type.value ? 'bold' : 'normal',
                fontSize: 12
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Risk Level Slider */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #404040' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#aaa' }}>Risk Level</span>
          <span style={{ fontSize: 14, color: '#fff', background: '#161b22', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold' }}>
            {riskLevel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="range"
            min="1"
            max="9"
            step="1"
            value={riskLevel}
            // Use Number() to ensure the state is set as a number, not a string
            onChange={(e) => setRiskLevel(Number(e.target.value))}
            className="risk-slider" // Add class for styling
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 4 }}>
          <span>Most Risk (1)</span>
          <span>Least Risk (9)</span>
        </div>
      </div>

      <button
        className={`settings-menu-btn${openPanel === 'indicators' ? ' active' : ''}`}
        style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 16 }}
        onClick={() => handlePanelClick('indicators')}
      >
        Indicators
      </button>
      <button
        className={`settings-menu-btn${openPanel === 'dates' ? ' active' : ''}`}
        style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 16 }}
        onClick={() => handlePanelClick('dates')}
      >
        Dates
      </button>
      <button
        className={`settings-menu-home`}
        style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 16 }}
        onClick={() => navigate('/')}
      >
        Go Back Home
      </button>
      <button
        className="settings-menu-close"
        style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', color: '#aaa', textAlign: 'left', cursor: 'pointer', fontSize: 16 }}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
} 