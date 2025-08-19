import React from 'react';
import { DEFAULT_COLORS, INDICATOR_LABELS } from '../../../utilities/consts';

export default function IndicatorLegend({ activeIndicators, onColorChange, onRemove }) {
  const getIndicatorConfigs = () => {
    const configs = [];
    
    Object.entries(activeIndicators).forEach(([indicatorType, indicatorConfigs]) => {
      indicatorConfigs.forEach((config, index) => {
        configs.push({
          type: indicatorType,
          label: INDICATOR_LABELS[indicatorType],
          config: config,
          index: index,
          color: config.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
        });
      });
    });
    
    return configs;
  };

  const handleColorChange = (indicatorType, index, newColor) => {
    onColorChange(indicatorType, index, newColor);
  };

  const getIndicatorDescription = (type, config) => {
    switch (type) {
      case 'sma':
        return `(${config.period})`;
      case 'ema':
        return `(${config.period})`;
      case 'rsi':
        return `(${config.period})`;
      case 'macd':
        return `(${config.fastPeriod},${config.slowPeriod},${config.signalPeriod})`;
      case 'bollinger':
        return `(${config.period},${config.multiplier})`;
      case 'stochastic':
        return `(${config.kPeriod},${config.dPeriod})`;
      case 'atr':
        return `(${config.period})`;
      case 'ichimoku':
        return '';
      default:
        return '';
    }
  };

  const allConfigs = getIndicatorConfigs();

  if (allConfigs.length === 0) {
    return (
      <div style={{ 
        padding: '12px', 
        background: '#161b22', 
        borderRadius: '6px', 
        border: '1px solid #30363d',
        marginBottom: '12px'
      }}>
        <div style={{ color: '#8b949e', fontSize: '14px', textAlign: 'center' }}>
          No indicators active
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '12px', 
      background: '#161b22', 
      borderRadius: '6px', 
      border: '1px solid #30363d',
      marginBottom: '12px'
    }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '500', 
        color: '#f0f6fc', 
        marginBottom: '8px',
        borderBottom: '1px solid #30363d',
        paddingBottom: '4px'
      }}>
        Active Indicators
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {allConfigs.map((item, idx) => (
          <div
            key={`${item.type}-${item.index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: '#21262d',
              borderRadius: '4px',
              border: '1px solid #30363d',
              fontSize: '12px'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: item.color,
                border: '1px solid #30363d'
              }}
            />
            <span style={{ color: '#f0f6fc' }}>
              {item.label} {getIndicatorDescription(item.type, item.config)}
            </span>
            {(item.type === 'sma' || item.type === 'ema') && (
              <input
                type="color"
                value={item.color}
                onChange={(e) => handleColorChange(item.type, item.index, e.target.value)}
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
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(item.type, item.index)}
                style={{
                  color: '#f87171',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginLeft: '2px',
                  lineHeight: 1
                }}
                title="Remove indicator"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 