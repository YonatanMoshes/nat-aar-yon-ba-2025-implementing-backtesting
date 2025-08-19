import React, { useState } from 'react';
import { INDICATOR_DEFAULTS, DEFAULT_COLORS } from '../../../utilities/consts';




export default function IndicatorMenu({ activeIndicators, setActiveIndicators, showPredictions, setShowPredictions }) {
  // Local state for new indicator params
  const [newParams, setNewParams] = useState({
    sma: { ...INDICATOR_DEFAULTS.sma },
    ema: { ...INDICATOR_DEFAULTS.ema },
    rsi: { ...INDICATOR_DEFAULTS.rsi },
    macd: { ...INDICATOR_DEFAULTS.macd },
    bollinger: { ...INDICATOR_DEFAULTS.bollinger },
    stochastic: { ...INDICATOR_DEFAULTS.stochastic },
    atr: { ...INDICATOR_DEFAULTS.atr },
    ichimoku: { ...INDICATOR_DEFAULTS.ichimoku },
  });

  const [newColors, setNewColors] = useState({
    sma: DEFAULT_COLORS[0],
    ema: DEFAULT_COLORS[1],
  });

  const handleAdd = (key) => {
    let newConfig;
    if (key === 'sma' || key === 'ema') {
      const colorIndex = activeIndicators[key].length;
      newConfig = { 
        ...newParams[key], 
        color: newColors[key] || DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length]
      };
    } else {
      newConfig = { ...newParams[key] };
    }
    
    setActiveIndicators(prev => ({
      ...prev,
      [key]: [...prev[key], newConfig]
    }));
  };
  const handleRemove = (key, idx) => {
    setActiveIndicators(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx)
    }));
  };
  const handleParamChange = (key, param, value) => {
    setNewParams(prev => ({
      ...prev,
      [key]: { ...prev[key], [param]: value }
    }));
  };

  const handleColorChange = (key, newColor) => {
    setNewColors(prev => ({
      ...prev,
      [key]: newColor
    }));
  };

  const handleExistingColorChange = (key, idx, newColor) => {
    setActiveIndicators(prev => ({
      ...prev,
      [key]: prev[key].map((config, i) => 
        i === idx ? { ...config, color: newColor } : config
      )
    }));
  };

  return (
    <div className="indicators-menu">
      <h3>Technical Indicators</h3>
      <div className="indicators-list">
        <div className="indicator-item">
          <label>
            <input
              type="checkbox"
              checked={showPredictions}
              onChange={() => setShowPredictions(!showPredictions)}
            />
            Predictions
          </label>
        </div>
        {/* SMA */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>SMA</div>
          {activeIndicators.sma.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: cfg.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                  border: '1px solid #30363d'
                }}
              />
              <span>Period: {cfg.period}</span>
            <input
                type="color"
                value={cfg.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                onChange={(e) => handleExistingColorChange('sma', idx, e.target.value)}
                style={{
                  width: '16px',
                  height: '16px',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  background: 'none'
                }}
                title="Change color"
              />
              <button onClick={() => handleRemove('sma', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.sma.period}
              onChange={e => handleParamChange('sma', 'period', parseInt(e.target.value) || 1)}
              min="1"
              max="200"
              style={{ width: 60 }}
            />
            <input
              type="color"
              value={newColors.sma}
              onChange={(e) => handleColorChange('sma', e.target.value)}
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                background: 'none'
              }}
              title="Choose color"
            />
            <button onClick={() => handleAdd('sma')}>Add</button>
          </div>
        </div>
        {/* EMA */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>EMA</div>
          {activeIndicators.ema.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: cfg.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                  border: '1px solid #30363d'
                }}
              />
              <span>Period: {cfg.period}</span>
            <input
                type="color"
                value={cfg.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                onChange={(e) => handleExistingColorChange('ema', idx, e.target.value)}
                style={{
                  width: '16px',
                  height: '16px',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  background: 'none'
                }}
                title="Change color"
              />
              <button onClick={() => handleRemove('ema', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.ema.period}
              onChange={e => handleParamChange('ema', 'period', parseInt(e.target.value) || 1)}
              min="1"
              max="200"
              style={{ width: 60 }}
            />
            <input
              type="color"
              value={newColors.ema}
              onChange={(e) => handleColorChange('ema', e.target.value)}
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                background: 'none'
              }}
              title="Choose color"
            />
            <button onClick={() => handleAdd('ema')}>Add</button>
          </div>
        </div>
        {/* RSI */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>RSI</div>
          {activeIndicators.rsi.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>Period: {cfg.period}</span>
              <button onClick={() => handleRemove('rsi', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.rsi.period}
              onChange={e => handleParamChange('rsi', 'period', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: 60 }}
            />
            <button onClick={() => handleAdd('rsi')}>Add</button>
          </div>
        </div>
        {/* MACD */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>MACD</div>
          {activeIndicators.macd.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>Fast: {cfg.fastPeriod}, Slow: {cfg.slowPeriod}, Signal: {cfg.signalPeriod}</span>
              <button onClick={() => handleRemove('macd', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.macd.fastPeriod}
              onChange={e => handleParamChange('macd', 'fastPeriod', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: 40 }}
            />
            <input
              type="number"
              value={newParams.macd.slowPeriod}
              onChange={e => handleParamChange('macd', 'slowPeriod', parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              style={{ width: 40 }}
            />
            <input
              type="number"
              value={newParams.macd.signalPeriod}
              onChange={e => handleParamChange('macd', 'signalPeriod', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: 40 }}
            />
            <button onClick={() => handleAdd('macd')}>Add</button>
          </div>
        </div>
        {/* Bollinger */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>Bollinger</div>
          {activeIndicators.bollinger.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>Period: {cfg.period}, Mult: {cfg.multiplier}</span>
              <button onClick={() => handleRemove('bollinger', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.bollinger.period}
              onChange={e => handleParamChange('bollinger', 'period', parseInt(e.target.value) || 1)}
              min="1"
              max="200"
              style={{ width: 40 }}
            />
            <input
              type="number"
              value={newParams.bollinger.multiplier}
              onChange={e => handleParamChange('bollinger', 'multiplier', parseInt(e.target.value) || 1)}
              min="1"
              max="10"
              style={{ width: 40 }}
            />
            <button onClick={() => handleAdd('bollinger')}>Add</button>
          </div>
        </div>
        {/* Stochastic */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>Stochastic</div>
          {activeIndicators.stochastic.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>K: {cfg.kPeriod}, D: {cfg.dPeriod}</span>
              <button onClick={() => handleRemove('stochastic', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.stochastic.kPeriod}
              onChange={e => handleParamChange('stochastic', 'kPeriod', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: 40 }}
            />
            <input
              type="number"
              value={newParams.stochastic.dPeriod}
              onChange={e => handleParamChange('stochastic', 'dPeriod', parseInt(e.target.value) || 1)}
              min="1"
              max="20"
              style={{ width: 40 }}
            />
            <button onClick={() => handleAdd('stochastic')}>Add</button>
          </div>
        </div>
        {/* ATR */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>ATR</div>
          {activeIndicators.atr.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>Period: {cfg.period}</span>
              <button onClick={() => handleRemove('atr', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={newParams.atr.period}
              onChange={e => handleParamChange('atr', 'period', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: 60 }}
            />
            <button onClick={() => handleAdd('atr')}>Add</button>
          </div>
        </div>
        {/* Ichimoku */}
        <div className="indicator-item">
          <div style={{ fontWeight: 500 }}>Ichimoku</div>
          {activeIndicators.ichimoku.map((cfg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>Enabled</span>
              <button onClick={() => handleRemove('ichimoku', idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <button onClick={() => handleAdd('ichimoku')}>Add</button>
        </div>
      </div>
    </div>
  );
} 