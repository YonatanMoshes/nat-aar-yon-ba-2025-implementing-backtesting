import React from 'react';
import './UserInfoPanel.css';

export default function UserInfoPanel({ userData, selectedStock }) {
  if (!userData) {
    return null; // Don't render if there's no user data
  }

  const { liquidBalance, initialBalance, totalBalance, stockInvested } = userData;
  const earnings = totalBalance - initialBalance;
  const earningsClass = earnings >= 0 ? 'profit' : 'loss';
  const amountOwned = stockInvested[selectedStock] || 0;

  return (
    <div className="user-info-panel">
      <div className="info-item">
        <span className="info-label">Liquid Cash</span>
        <span className="info-value">${liquidBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="info-item">
        <span className="info-label">Total Balance</span>
        <span className="info-value">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="info-item">
        <span className="info-label">Total Earnings</span>
        <span className={`info-value ${earningsClass}`}>
          {earnings >= 0 ? '+' : '-'}${Math.abs(earnings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="info-item">
        <span className="info-label">{selectedStock} Owned</span>
        <span className="info-value">{amountOwned.toLocaleString()}</span>
      </div>
    </div>
  );
}