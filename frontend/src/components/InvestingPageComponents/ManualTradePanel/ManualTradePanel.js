import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../../utilities/helpers';
import './ManualTradePanel.css';

// Formatting utilities
const formatShares = (value) => parseFloat(value).toFixed(4);

export default function ManualTradePanel({ userData, selectedStock, onTrade, currentPrice }) {
    const [buyAmountUSD, setBuyAmountUSD] = useState('');
    const [sellAmountShares, setSellAmountShares] = useState('');

    // Memoize the user's holding quantity for the selected stock
    const userStockHoldingQuantity = useMemo(() => {
        return userData?.stockInvested?.[selectedStock] || 0;
    }, [userData, selectedStock]);

    const handleBuy = () => {
        const amountToBuy = parseFloat(buyAmountUSD);
        if (isNaN(amountToBuy) || amountToBuy <= 0 || userData.liquidBalance === 0) {
            alert("Please enter a valid amount to buy.");
            return;
        }

        // Translate the dollar amount into a percentage of the user's liquid balance
        const pct = (amountToBuy / userData.liquidBalance) * 100;

        onTrade({
            stockSymbol: selectedStock,
            action: 'BUY',
            pct: pct,
        });
        setBuyAmountUSD(''); // Reset input
    };

    const handleSell = () => {
        const amountToSell = parseFloat(sellAmountShares);
        if (isNaN(amountToSell) || amountToSell <= 0 || userStockHoldingQuantity === 0) {
            alert("Please enter a valid number of shares to sell.");
            return;
        }

        // Translate the number of shares into a percentage of the user's holding
        const pct = (amountToSell / userStockHoldingQuantity) * 100;

        onTrade({
            stockSymbol: selectedStock,
            action: 'SELL',
            pct: pct,
        });
        setSellAmountShares(''); // Reset input
    };

    // --- Validation for disabling buttons ---
    const buyAmountAsFloat = parseFloat(buyAmountUSD) || 0;
    const canBuy = buyAmountAsFloat > 0 && buyAmountAsFloat <= userData.liquidBalance;

    const sellAmountAsFloat = parseFloat(sellAmountShares) || 0;
    const canSell = sellAmountAsFloat > 0 && sellAmountAsFloat <= userStockHoldingQuantity;

    return (
        <div className="trade-panel">
            <h3>Trade {selectedStock}</h3>

            {/* --- BUY Section --- */}
            <div className="trade-action-group">
                <div className="trade-input-group">
                    <span>$</span>
                    <input
                        type="number"
                        value={buyAmountUSD}
                        onChange={(e) => setBuyAmountUSD(e.target.value)}
                        placeholder={`Max: ${formatCurrency(userData.liquidBalance)}`}
                        min="0"
                    />
                </div>
                <button
                    className="btn btn-buy"
                    onClick={handleBuy}
                    disabled={!canBuy}
                    title={!canBuy ? `Enter amount up to ${formatCurrency(userData.liquidBalance)}` : `Buy`}
                >
                    Buy
                </button>
            </div>

            <div className="trade-divider"></div>

            {/* --- SELL Section --- */}
            <div className="trade-action-group">
                <div className="trade-input-group">
                    <input
                        type="number"
                        value={sellAmountShares}
                        onChange={(e) => setSellAmountShares(e.target.value)}
                        placeholder={`Max: ${formatShares(userStockHoldingQuantity)}`}
                        min="0"
                    />
                    <span className="input-suffix">Shares</span>
                </div>
                <button
                    className="btn btn-sell"
                    onClick={handleSell}
                    disabled={!canSell}
                    title={!canSell ? `You only have ${formatShares(userStockHoldingQuantity)} shares` : `Sell`}
                >
                    Sell
                </button>
            </div>
        </div>
    );
}