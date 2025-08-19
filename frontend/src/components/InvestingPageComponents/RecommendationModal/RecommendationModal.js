import React from 'react';
import './RecommendationModal.css';

export default function RecommendationModal({
    isOpen,
    onClose,
    onAccept,
    recommendation,
    isLoading,
    error
}) {
    // If there's no recommendation, we can't show the modal
    if (!recommendation) {
        return null;
    }

    // If the modal isn't open, render nothing.
    if (!isOpen) {
        return null;
    }

    return (
        // The dark background overlay
        <div className="modal-overlay" onClick={onClose}>
            {/* The modal content itself. stopPropagation prevents clicks inside from closing it. */}
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Investment Recommendation</h3>
                    <button className="modal-close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {isLoading && <p>Getting recommendation...</p>}
                    {error && <p className="modal-error">{error}</p>}
                    {recommendation && !isLoading && (
                        <>
                            <div className="recommendation-details">
                                <span><strong>Action:</strong> {recommendation.action}</span>
                                <span><strong>Percentage:</strong> {
                                    typeof recommendation.pct === 'number'
                                        ? recommendation.pct.toFixed(3)
                                        : 'N/A'}%</span>
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    {/* Only show the "Buy"\"Sell" button if there is a valid recommendation */}
                    {recommendation && recommendation.action === "BUY" && (
                        <button className="btn btn-primary btn-buy" onClick={onAccept}>
                            Accept & Buy
                        </button>
                    )}
                    {recommendation && recommendation.action === "SELL" && (
                        <button className="btn btn-primary btn-sell" onClick={onAccept}>
                            Accept & Sell
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}