import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { stringToDate, formatCurrency } from '../../../utilities/helpers';
import { MIN_DATE, MAX_DATE, POLICY_CONFIG } from '../../../utilities/consts';
import { fetchDatesRange } from '../../../utilities/fetchApi'
import { useSockets } from '../../../utilities/SocketContext'; // Use your global context
import './BacktestModal.css';

export default function BacktestModal({ isOpen, onClose, selectedStock }) {
    // Consume the global socket context
    const { sockets, connectionStatus } = useSockets();
    const recoSocket = sockets.recommendation;
    const { isConnected } = connectionStatus.recommendation || { isConnected: false };

    // --- State managed within the modal ---
    const [startDate, setStartDate] = useState(stringToDate(MIN_DATE));
    const [endDate, setEndDate] = useState(stringToDate(MAX_DATE));
    const [minDate, setMinDate] = useState(stringToDate(MIN_DATE));
    const [maxDate, setMaxDate] = useState(stringToDate(MAX_DATE));

    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // This condition is true only when the modal transitions from closed to open
        if (isOpen) {
            setResults(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen])

    useEffect(() => {
        fetchDatesRange(selectedStock)
            .then(dataFetched => {
                setMinDate(stringToDate(dataFetched.start));
                setMaxDate(stringToDate(dataFetched.end));
            })
            .catch(err => {
                setError('Failed to fetch dates ranges');
            });
    }, [selectedStock]);

    // --- Attach listeners for backtest results ---
    useEffect(() => {
        if (!recoSocket || !isConnected) return;

        const handleBacktestResult = (response) => {
            console.log('Received backtest_result:', response);
            if (response.status === 'success') {
                setResults(response.data);
                setError(null);
            } else {
                setResults(null);
                setError(response.message || 'The backtest failed for an unknown reason.');
            }
            setIsLoading(false);
        };

        recoSocket.on('backtest_result', handleBacktestResult);

        // Cleanup listener when component unmounts
        return () => {
            recoSocket.off('backtest_result', handleBacktestResult);
        };
    }, [recoSocket, isConnected]);

    // --- Handler to start the backtest task ---
    const handleRunBacktest = () => {
        if (!isConnected) {
            setError("Cannot run backtest: Not connected to the server.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults(null);

        // Format dates into the string 'YYYY-MM-DD HH:MM:SS'
        const formatDate = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

        // Emit the request to the backend; no awaiting, no try/catch
        recoSocket.emit('request_backtest', {
            stock: selectedStock,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
        });
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Performance Backtest for {selectedStock}</h3>
                    <button className="modal-close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="backtest-controls">
                        <div className="control-group">
                            <label>Start Date</label>
                            <DatePicker selected={startDate} onChange={date => setStartDate(date)} minDate={minDate} maxDate={endDate} showTimeSelect dateFormat="yyyy-MM-dd HH:mm" />
                        </div>
                        <div className="control-group">
                            <label>End Date</label>
                            <DatePicker selected={endDate} onChange={date => setEndDate(date)} minDate={startDate} maxDate={maxDate} showTimeSelect dateFormat="yyyy-MM-dd HH:mm" />
                        </div>
                        <button className="btn-run" onClick={handleRunBacktest} disabled={isLoading || !isConnected} title={!isConnected ? "Connecting..." : ""}>
                            {isLoading ? 'Running Simulation...' : 'Run Backtest'}
                        </button>
                    </div>

                    {/* --- Dynamic Content Area --- */}
                    {isLoading && <div className="loading-spinner">Simulating strategies... This may take a moment.</div>}

                    {error && <div className="error-message">{error}</div>}

                    {results && (
                        <div className="backtest-results">
                            <h4>Results</h4>
                            <p>Initial Balance: <strong>{formatCurrency(results.initialBalance)}</strong></p>
                            <table className="results-table">
                                <thead>
                                    <tr>
                                        <th>Strategy</th>
                                        <th>Final Portfolio Value</th>
                                        <th>Profit / Loss</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {POLICY_CONFIG.map(policy => {
                                        // Get the result data for the current policy key
                                        const policyResult = results[policy.key];

                                        // A safety check in case the backend didn't return this key
                                        if (!policyResult) return null;

                                        return (
                                            // The 'key' prop is crucial for React's performance
                                            <tr key={policy.key}>
                                                <td>{policy.label}</td>
                                                <td>{formatCurrency(policyResult.finalValue)}</td>
                                                <td className={policyResult.profit >= 0 ? 'profit' : 'loss'}>
                                                    {formatCurrency(policyResult.profit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}