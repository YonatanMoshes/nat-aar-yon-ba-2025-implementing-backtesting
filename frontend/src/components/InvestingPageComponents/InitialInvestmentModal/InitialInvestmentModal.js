import React, { useState } from 'react';
import { STOCKS } from '../../../utilities/consts';
import './InitialInvestmentModal.css';

export default function InitialInvestmentModal({ onSave, isSaving }) {
  const [startingCash, setStartingCash] = useState('');
  const [stockHoldings, setStockHoldings] = useState(
    STOCKS.reduce((acc, stock) => {
      acc[stock.value] = ''; // Initialize all stock holdings as empty strings
      return acc;
    }, {})
  );

  const handleStockChange = (stockSymbol, value) => {
    setStockHoldings(prev => ({
      ...prev,
      [stockSymbol]: value
    }));
  };

  const handleSaveClick = () => {
    // Convert holdings to numbers, defaulting to 0 if empty/invalid
    const finalHoldings = Object.entries(stockHoldings).reduce((acc, [key, value]) => {
        acc[key] = parseFloat(value) || 0;
        return acc;
    }, {});
    
    onSave({
      startingCash: parseFloat(startingCash) || 0,
      stockInvested: finalHoldings
    });
  };

  return (
    <div className="initial-modal-overlay">
      <div className="initial-modal-content">
        <h2>Welcome to Investly!</h2>
        <p>Let's set up your portfolio. Please enter your starting balance and any stocks you already own.</p>
        
        <div className="form-group">
          <label htmlFor="startingCash">Starting Cash Balance ($)</label>
          <input
            type="number"
            id="startingCash"
            className="form-control"
            placeholder="e.g., 10000"
            value={startingCash}
            onChange={(e) => setStartingCash(e.target.value)}
          />
        </div>

        <h4 className="stock-holdings-title">Existing Stock Holdings (Optional)</h4>
        <div className="stock-inputs-container">
          {STOCKS.map(stock => (
            <div className="form-group" key={stock.value}>
              <label htmlFor={`stock-${stock.value}`}>{stock.label}</label>
              <input
                type="number"
                id={`stock-${stock.value}`}
                className="form-control"
                placeholder="Amount owned"
                value={stockHoldings[stock.value]}
                onChange={(e) => handleStockChange(stock.value, e.target.value)}
              />
            </div>
          ))}
        </div>

        <button 
          className="btn btn-primary btn-save-setup" 
          onClick={handleSaveClick}
          disabled={isSaving || !startingCash}
        >
          {isSaving ? 'Saving...' : 'Save and Start Investing'}
        </button>
      </div>
    </div>
  );
}