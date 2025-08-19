import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './InvestingPage.css';
import { fetchStockData, fetchDatesRange, fetchRecommendation, fetchUser, setupPortfolio, executeTrade } from '../../utilities/fetchApi';
import { stringToDate, dateToString } from '../../utilities/helpers';
import { STOCKS } from '../../utilities/consts';
import { useSockets } from '../../utilities/SocketContext';
import ChartCanvas from '../../components/ChartCanvas';
import RecommendationModal from '../../components/InvestingPageComponents/RecommendationModal/RecommendationModal';
import InitialInvestmentModal from '../../components/InvestingPageComponents/InitialInvestmentModal/InitialInvestmentModal';
import UserInfoPanel from '../../components/InvestingPageComponents/UserInfoPanel/UserInfoPanel';
import ManualTradePanel from '../../components/InvestingPageComponents/ManualTradePanel/ManualTradePanel';
import BacktestModal from '../../components/InvestingPageComponents/BacktestModal/BacktestModal';

const formatDisplayDate = (date) => {
  if (!date) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InvestingPage() {
  const { sockets, connectionStatus } = useSockets();

  const socket = sockets.recommendation;
  const { isConnected } = connectionStatus.recommendation || { isConnected: false };

  // --- Set the initial stock dynamically from the first item in the STOCKS array ---
  const [selectedStock, setSelectedStock] = useState(STOCKS[0].value);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState(null);

  const [userData, setUserData] = useState(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User not logged in.');
      setLoading(false);
      return;
    }
    fetchUser(userId)
      .then(data => {
        setUserData(data);
        // The rest of the loading will be handled by the other useEffects
      })
      .catch(err => {
        setError('Could not load user data.');
        setLoading(false);
      });
  }, []);

  // This useEffect fetches the date range and calculates the 5-hour window
  useEffect(() => {
    setLoading(true);
    setError(null);
    setStockData([]);

    fetchDatesRange(selectedStock)
      .then(dateData => {
        const latestEndDate = stringToDate(dateData.end);
        const calculatedStartDate = new Date(latestEndDate);
        calculatedStartDate.setHours(calculatedStartDate.getHours() - 5);

        setEndDate(latestEndDate);
        setStartDate(calculatedStartDate);
      })
      .catch(err => {
        setError('Failed to fetch the available date range.');
        setLoading(false);
      });
  }, [selectedStock]);


  // This useEffect fetches the stock data
  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    console.log('Fetching stock data for:', selectedStock, 'from', dateToString(startDate), 'to', dateToString(endDate));

    fetchStockData(dateToString(startDate), dateToString(endDate), selectedStock)
      .then(dataFetched => {
        setStockData(dataFetched.data || []);
      })
      .catch(err => {
        setError('Failed to fetch stock data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [startDate, endDate, selectedStock]);

  const currentPrice = useMemo(() => {
    if (stockData && stockData.length > 0) {
      // The last data point has the most recent price
      return stockData[stockData.length - 1].close;
    }
    return 0; // Return 0 if no data is available
  }, [stockData]);

  const handleGetRecommendation = () => {
    // Check if we are connected before trying to emit
    if (!isConnected) {
      console.error("Cannot get recommendation, socket is not connected.");
      setRecommendationError("Not connected to the server. Please try again in a moment.");
      setIsModalOpen(true); // Open the modal to show the error
      return;
    }

    // Reset state and open the modal in a loading state
    setRecommendation(null);
    setRecommendationError(null);
    setRecommendationLoading(true);
    setIsModalOpen(true);

    console.log(`InvestingPages emitting 'request_recommendation' for ${selectedStock}`);
    const shares_held = userData.stockInvested[selectedStock] || 0;

    socket.emit('request_recommendation', { stock: selectedStock, initial_balance: userData.liquidBalance, initial_shares_held: shares_held });
  };

  useEffect(() => {
    // Don't attach listeners until the socket from the context is available and connected
    if (!socket || !isConnected) {
      return;
    }

    // Listener for when the recommendation is ready
    const handleRecommendationResult = (response) => {
      console.log('InvestingPage received recommendation_result:', response);
      if (response.status === 'success') {
        setRecommendation(response.data);
        setRecommendationError(null);
      } else {
        setRecommendation(null);
        setRecommendationError(response.message || 'An unknown error occurred.');
      }
      setRecommendationLoading(false);
    };

    // Listener for the initial acknowledgement (optional but good UX)
    const handleRecommendationPending = (response) => {
      console.log('InvestingPage received recommendation_pending:', response.message);
      // You could show a small toast notification here
    };

    // Attach the listeners
    socket.on('recommendation_result', handleRecommendationResult);
    socket.on('recommendation_pending', handleRecommendationPending);

    // Cleanup function to remove ONLY this page's listeners on unmount
    // It does NOT disconnect the socket.
    return () => {
      socket.off('recommendation_result', handleRecommendationResult);
      socket.off('recommendation_pending', handleRecommendationPending);
    };
  }, [socket, isConnected]);

  const handleManualTrade = async (tradeDetails) => {
    try {
      const userId = localStorage.getItem('userId');
      const updatedUserData = await executeTrade(userId, tradeDetails);
      setUserData(updatedUserData);
      alert(`Successfully executed ${tradeDetails.action} of ${tradeDetails.pct.toFixed(2)}% for ${tradeDetails.stockSymbol}!`);
    } catch (err) {
      alert(`Trade failed: ${err.message}`);
    }
  };

  const handleAcceptRecommendation = async () => {
    if (!recommendation) return;

    const tradeDetails = {
      stockSymbol: recommendation.stock_symbol,
      action: recommendation.action,
      pct: recommendation.pct
    };

    await handleManualTrade(tradeDetails);
    setIsModalOpen(false);
  };

  const handleSaveInitialInvestment = async (investmentData) => {
    setIsSavingSetup(true);
    const userId = localStorage.getItem('userId');
    try {
      // Create the payload for the update
      const payload = {
        liquidBalance: investmentData.startingCash,
        stockInvested: investmentData.stockInvested
      };

      // Call the API to update the user
      const updatedUserData = await setupPortfolio(userId, payload);
      // Update the local state to re-render the page
      setUserData(updatedUserData);
    } catch (err) {
      // You could show an error on the modal itself
      console.error("Failed to save initial investment", err);
    } finally {
      setIsSavingSetup(false);
    }
  };

  // --- Conditional Rendering Logic ---
  if (!userData && loading) {
    return <div className="loading-fullscreen">Loading Your Portfolio...</div>;
  }

  if (userData && !userData.hasInvested) {
    return (
      <InitialInvestmentModal
        onSave={handleSaveInitialInvestment}
        isSaving={isSavingSetup}
      />
    );
  }

  return (
    <div className="investing-app">
      <div className="container">
        <div className="top-menu">
          <Link to="/" className="btn-home" title="Back to Home">
            <i className="fas fa-home"></i>
          </Link>

          <div className="title-and-selector">
            <h2>Investing Page</h2>
            <select value={selectedStock} onChange={e => setSelectedStock(e.target.value)}>
              {STOCKS.map(stock => (
                <option key={stock.value} value={stock.value}>
                  {stock.label}
                </option>
              ))}
            </select>
          </div>

          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={() => setIsBacktestModalOpen(true)}
            >
              Performance Test
            </button>

            <button
              className="btn btn-recommend"
              onClick={handleGetRecommendation}
              disabled={recommendationLoading || !isConnected}
              title={!isConnected ? "Connecting to server..." : ""}
            >
              {recommendationLoading ? 'Analyzing...' : 'Get Recommendation'}
            </button>
          </div>
        </div>
        <UserInfoPanel userData={userData} selectedStock={selectedStock} />

        {/* Only render if we have user data */}
        {userData && (
          <ManualTradePanel
            userData={userData}
            selectedStock={selectedStock}
            onTrade={handleManualTrade}
            currentPrice={currentPrice}
          />
        )}

        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}

        {/* Main Chart */}
        <div className="main-wrapper">
          <div className="chart-container">
            {loading && <div className="loading">Loading Chart...</div>}
            {error && <div className="error">{error}</div>}

            {/* Show the chart only when not loading and there's no error */}
            {!loading && !error && (
              <>
                {startDate && endDate && (
                  <div className="chart-date-display">
                    Displaying data from <strong>{formatDisplayDate(startDate)}</strong> to <strong>{formatDisplayDate(endDate)}</strong>
                    <br />
                    This is the latest 5 hours of data for {selectedStock} in our database!
                  </div>
                )}
                <ChartCanvas
                  // Pass 'stockData' to both props that ChartCanvas expects.
                  sampleData={stockData}
                  fullData={stockData}
                  showPredictions={true}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation Modal */}
      <RecommendationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={handleAcceptRecommendation}
        recommendation={recommendation}
        isLoading={recommendationLoading}
        error={recommendationError}
      />

      {/* Backtest Modal */}
      <BacktestModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        selectedStock={selectedStock}
      />
    </div>
  );
}