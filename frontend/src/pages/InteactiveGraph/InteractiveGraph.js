import React, { useState, useRef, useEffect, useMemo, use } from 'react';
import { io } from 'socket.io-client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './InteractiveGraph.css';
import { fetchStockData, fetchDatesRange, fetchUser, getScheduleStatus, startServerSchedule, stopServerSchedule } from '../../utilities/fetchApi';
import {
  MIN_DATE,
  MAX_DATE,
  MAX_CANDLES,
  INDICATOR_LABELS
} from '../../utilities/consts';
import { stringToDate, dateToString, addPredictions } from '../../utilities/helpers';
import { useSockets } from '../../utilities/SocketContext';
import IndicatorMenu from '../../components/InteractiveGraphComponents/IndicatorMenu/IndicatorMenu';
import ChartCanvas from '../../components/ChartCanvas';
import SettingsButton from '../../components/InteractiveGraphComponents/SettingsComponents/SettingsButton';
import SettingsMenu from '../../components/InteractiveGraphComponents/SettingsComponents/SettingsMenu';
import IndicatorLegend from '../../components/InteractiveGraphComponents/IndicatorLegend/IndicatorLegend';
import PredictionsButton from '../../components/InteractiveGraphComponents/PredictionsComponents/PredictionsButton';
import PredictionsMetrics from '../../components/InteractiveGraphComponents/PredictionsComponents/PredictionsMetrics';
import UpdateModal from '../../components/InteractiveGraphComponents/UpdataModal/UpdateModal';

// Helper to convert 'YYYY-MM-DDTHH:mm' to 'YYYY-MM-DD HH:mm:ss'
function toBackendDateFormat(dt) {
  if (!dt) return '';
  return dt.replace('T', ' ') + ':00';
}

let socket;

export default function InteractiveGraph() {
  const [activeIndicators, setActiveIndicators] = useState({
    sma: [], ema: [], rsi: [], macd: [], bollinger: [], stochastic: [], atr: [], ichimoku: []
  });
  const [showPredictions, setShowPredictions] = useState(false);
  const [startDate, setStartDate] = useState(stringToDate(MIN_DATE));
  const [endDate, setEndDate] = useState(stringToDate(MAX_DATE));
  const [minDate, setMinDate] = useState(stringToDate(MIN_DATE));
  const [maxDate, setMaxDate] = useState(stringToDate(MAX_DATE));
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [openPanel, setOpenPanel] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('candlestick');
  const [showMetrics, setShowMetrics] = useState(false);
  const [selectedStock, setSelectedStock] = useState('BTC');
  const [riskLevel, setRiskLevel] = useState(5);

  const [stockUpdateStatus, setStockUpdateStatus] = useState({});
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState({ is_active: false, interval: 0 });
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  const { sockets, connectionStatus } = useSockets();
  
  const socket = sockets.model;
  const { isConnected } = connectionStatus.model || { isConnected: false };
  const sid = socket ? socket.id : null;

  const menuRef = useRef();
  const panelRef = useRef();

  useEffect(() => {
    // Check if the user is an admin
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetchUser(userId)
        .then(data => {
          setIsAdmin(data.isAdmin || false);
        })
        .catch(err => {
          console.error('Failed to fetch user data:', err);
          setIsAdmin(false);
        });
    } else {
      setIsAdmin(false);
    }
  }, []);

  // This useEffect hook sets up and tears down the WebSocket connection.
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleUpdateRequestAccepted = (data) => {
      const stockSymbol = data.stock;
      console.log('Server accepted update request:', data.message);
      setStockUpdateStatus(prev => ({
        ...prev,
        [stockSymbol]: { isUpdating: true, message: 'Request sent. Waiting for completion...', error: null }
      }));
    };
    const handleUpdatePending = (data) => {
      const stockSymbol = data.stock;
      console.log('Server reports update already pending:', data.message);
      setStockUpdateStatus(prev => ({
        ...prev,
        [stockSymbol]: { isUpdating: true, message: 'An update is already in progress. Waiting for completion...', error: null }
      }));
    };
    const handleUpdateRequestError = (data) => {
      console.error('Server reported an error with the request:', data.message);
      setError(`Request failed: ${data.message}`);
      setStockUpdateStatus(prev => ({
        ...prev,
        [selectedStock]: { isUpdating: false, message: null, error: `Request failed: ${data.message}` }
      }));
    };
    const handleDataUpdateComplete = (data) => {
      const stockSymbol = data.stock;
      console.log('Received data_update_complete event:', data);

      fetchDatesRange(stockSymbol)
        .then(dataFetched => {
          if (stockSymbol === selectedStock) {
            setMinDate(stringToDate(dataFetched.start));
            setMaxDate(stringToDate(dataFetched.end));
          }
          setStockUpdateStatus(prev => ({
            ...prev,
            [stockSymbol]: { isUpdating: false, message: `Success! Data for ${stockSymbol} is up to date.`, error: null }
          }));
        })
        .catch(err => {
          console.error("Failed to fetch new date range:", err);
          setError('Data updated, but failed to fetch new date range.');
          setStockUpdateStatus(prev => ({
            ...prev,
            [selectedStock]: { isUpdating: false, message: null, error: `Request failed: ${data.message}` }
          }));
        });
    };
    const handleDataUpdateFailed = (data) => {
      const stockSymbol = data.stock;
      console.error(`Received data_update_failed for ${stockSymbol}:`, data);
      setError(`Update failed: ${data.message || 'Unknown error'}`);
      setStockUpdateStatus(prev => ({
        ...prev,
        [stockSymbol]: { isUpdating: false, message: null, error: `Update failed for ${stockSymbol}: ${data.message || 'Unknown error'}` }
      }));
    };

    socket.on('update_request_accepted', handleUpdateRequestAccepted);
    socket.on('update_request_pending', handleUpdatePending);
    socket.on('update_request_error', handleUpdateRequestError);
    socket.on('data_update_complete', handleDataUpdateComplete);
    socket.on('data_update_failed', handleDataUpdateFailed);

    // Clean up connections on component unmount
    return () => {
      socket.off('update_request_accepted', handleUpdateRequestAccepted);
      socket.off('update_request_pending', handleUpdatePending);
      socket.off('update_request_error', handleUpdateRequestError);
      socket.off('data_update_complete', handleDataUpdateComplete);
      socket.off('data_update_failed', handleDataUpdateFailed);
    };
  }, [socket, selectedStock]);

  // --- useEffect to fetch schedule status on load ---
  useEffect(() => {
    setIsScheduleLoading(true);
    getScheduleStatus(selectedStock)
      .then(data => {
        console.log('Fetched schedule status:', data);
        setScheduleStatus(data);
      })
      .catch(err => console.error("Could not fetch schedule status", err))
      .finally(() => setIsScheduleLoading(false));
  }, [selectedStock]);

  // Fetch stock data when dates change
  useEffect(() => {
    setLoading(true);
    setError(null);
    const startStringForAPI = dateToString(startDate);
    const endStringForAPI = dateToString(endDate);

    fetchStockData(toBackendDateFormat(startStringForAPI), toBackendDateFormat(endStringForAPI), selectedStock)
      .then(dataFetched => {
        setStockData(dataFetched.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch stock data');
        setLoading(false);
      });
  }, [startDate, endDate, selectedStock]);

  // Change dates range when stock changes
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

  // Close menu/panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        (showSettingsMenu && menuRef.current && !menuRef.current.contains(e.target)) ||
        (openPanel && panelRef.current && !panelRef.current.contains(e.target))
      ) {
        setShowSettingsMenu(false);
        setOpenPanel(null);
      }
    }
    if (showSettingsMenu || openPanel) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsMenu, openPanel]);

  const processedDataFull = useMemo(() => {
    let processed = stockData.map((d, index) => {
      let oneHourLaterPrice = null;
      if (index < stockData.length - 12 && d.close !== null && stockData[index + 12].close !== null) {
        oneHourLaterPrice = stockData[index + 12].close;
      }
      return { ...d, oneHourLaterPrice };
    });
    return addPredictions(processed, riskLevel);
  }, [stockData, riskLevel]);

  const downsampled = processedDataFull.length > MAX_CANDLES;

  const filteredData = useMemo(() => {
    if (processedDataFull.length > MAX_CANDLES) {
      const step = Math.floor(processedDataFull.length / MAX_CANDLES);
      const filtered = processedDataFull.filter((_, i) => i % step === 0);
      if (filtered.length > 0 && filtered[filtered.length - 1] !== processedDataFull[processedDataFull.length - 1]) {
        filtered.push(processedDataFull[processedDataFull.length - 1]);
      }
      return filtered;
    }
    return processedDataFull;
  }, [processedDataFull]);

  const handleIndicatorColorChange = (type, idx, color) => {
    setActiveIndicators(prev => ({ ...prev, [type]: prev[type].map((cfg, i) => i === idx ? { ...cfg, color } : cfg) }));
  };

  const handleIndicatorRemove = (type, idx) => {
    setActiveIndicators(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  };

  // --- MODIFIED & NEW HANDLERS FOR DATA UPDATES ---
  const currentStockStatus = useMemo(() => {
    return stockUpdateStatus[selectedStock] || { isUpdating: false, message: null, error: null };
  }, [stockUpdateStatus, selectedStock]);

  const handleUpdateData = () => {
    if (!sid) {
      setError("Not connected to server. Please wait and try again.");
      return;
    }

    setStockUpdateStatus(prev => ({
      ...prev,
      [selectedStock]: { isUpdating: true, message: 'Sending update request...', error: null }
    }));
    setError(null);

    // Instead of fetch, we now emit a socket event.
    // We no longer need to pass the sid, as the server knows it.
    socket.emit('start_update_process', {
      stock: selectedStock
    });
  };

  const handleOneTimeUpdate = () => {
    handleUpdateData();
    setIsUpdateModalOpen(false);
  };

  const handleStartScheduledUpdates = (intervals) => {
    startServerSchedule(selectedStock, intervals)
      .then(() => {
        // Update UI state immediately for responsiveness
        setScheduleStatus({ is_active: true, interval: intervals });
        setIsUpdateModalOpen(false);

        // Use the new state object to show a temporary message
        const message = `Server schedule set for every ${intervals * 5} minutes.`;
        setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { ...prev[selectedStock], isUpdating: false, message: message } }));

        // Clear the message after 5 seconds
        setTimeout(() => {
          setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { ...prev[selectedStock], message: null } }));
        }, 5000);
      })
      .catch(err => {
        setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { isUpdating: false, error: `Failed to set schedule: ${err.message}` } }));
        setError(`Failed to set schedule: ${err.message}`);
      });
  };

  const handleStopScheduledUpdates = () => {
    stopServerSchedule(selectedStock)
      .then(() => {
        // Update UI state immediately
        setScheduleStatus({ is_active: false, interval: 0 });
        setIsUpdateModalOpen(false);

        // Use the new state object to show a temporary message
        const message = "Server schedule stopped.";
        setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { ...prev[selectedStock], isUpdating: false, message: message } }));

        // Clear the message after 5 seconds
        setTimeout(() => {
          setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { ...prev[selectedStock], message: null } }));
        }, 5000);
      })
      .catch(err => {
        setError(`Failed to stop schedule: ${err.message}`);
        setStockUpdateStatus(prev => ({ ...prev, [selectedStock]: { isUpdating: false, error: `Failed to stop schedule: ${err.message}` } }));
      });
  };

  return (
    <div className="chart-app">
      {isAdmin && (
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          onUpdateNow={handleOneTimeUpdate}
          onStartScheduled={handleStartScheduledUpdates}
          onStopScheduled={handleStopScheduledUpdates}
          isScheduled={scheduleStatus}
          isUpdatingData={currentStockStatus.isUpdating}
        />
      )}
      <div className="container">
        <div className="top-menu" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', position: 'relative' }}>
          {/* --- MODIFIED: ADMIN-ONLY UPDATE BUTTON --- */}
          {isAdmin && (
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              disabled={!sid || isScheduleLoading || currentStockStatus.isUpdating}
              title={!sid ? "Connecting..." : isScheduleLoading ? "Loading schedule..." : currentStockStatus.isUpdating ? `Update for ${selectedStock} in progress...` : "Update Data"}
              style={{
                padding: '8px 16px',
                background: '#4fc3f7',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: (!sid || isScheduleLoading) ? 'not-allowed' : 'pointer',
                opacity: (!sid || isScheduleLoading) ? 0.6 : 1,
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
            >
              {isScheduleLoading ? 'Loading...' : currentStockStatus.isUpdating ? 'Updating...' : 'Update Data'}
            </button>
          )}

          <div className="right-menu-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <PredictionsButton onClick={() => setShowMetrics(!showMetrics)} is_active={showMetrics} />
            <div ref={menuRef} style={{ position: 'relative' }}>
              <SettingsButton onClick={() => setShowSettingsMenu(v => !v)} />
              {showSettingsMenu && (
                <SettingsMenu
                  openPanel={openPanel}
                  setOpenPanel={panel => { setShowSettingsMenu(false); setOpenPanel(panel); }}
                  onClose={() => setShowSettingsMenu(false)}
                  chartType={chartType} setChartType={setChartType}
                  selectedStock={selectedStock} setSelectedStock={setSelectedStock}
                  riskLevel={riskLevel} setRiskLevel={setRiskLevel}
                />
              )}
            </div>
          </div>
        </div>

        {currentStockStatus.message && (
          <div style={{ textAlign: 'center', color: '#4fc3f7', margin: '8px 0' }}>
            {currentStockStatus.message}
          </div>
        )}
        {currentStockStatus.error && (
          <div style={{ textAlign: 'center', color: '#f87171', margin: '8px 0' }}>
            {currentStockStatus.error}
          </div>
        )}

        <PredictionsMetrics data={processedDataFull} showMetrics={showMetrics} threshold_num={riskLevel} onClose={() => setShowMetrics(false)} />
        <IndicatorLegend activeIndicators={activeIndicators} onColorChange={handleIndicatorColorChange} onRemove={handleIndicatorRemove} />

        {openPanel === 'indicators' && (
          <div ref={panelRef} className="settings-panel" style={{ margin: '0 auto 24px auto', background: '#23272f', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 600 }}>
            <IndicatorMenu activeIndicators={activeIndicators} setActiveIndicators={setActiveIndicators} showPredictions={showPredictions} setShowPredictions={setShowPredictions} />
          </div>
        )}
        {openPanel === 'dates' && (
          <div ref={panelRef} className="settings-panel" style={{ margin: '0 auto 24px auto', background: '#23272f', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 600 }}>
            <div className="date-range-controls" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 0 }}>
              <label>Start Date: <DatePicker selected={startDate} onChange={date => setStartDate(date)} minDate={minDate} maxDate={endDate} showTimeSelect timeIntervals={5} dateFormat="yyyy-MM-dd HH:mm" className="date-picker-input" /></label>
              <label>End Date: <DatePicker selected={endDate} onChange={date => setEndDate(date)} minDate={startDate} maxDate={maxDate} showTimeSelect timeIntervals={5} dateFormat="yyyy-MM-dd HH:mm" className="date-picker-input" /></label>
            </div>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', color: '#4fc3f7', margin: '16px 0' }}>Loading...</div>}
        {error && <div style={{ textAlign: 'center', color: 'red', margin: '16px 0' }}>{error}</div>}
        {downsampled && (<div style={{ textAlign: 'center', color: '#f59e0b', margin: '8px 0' }}>Too many candles selected. Displaying a downsampled chart for performance.</div>)}

        <div className="main-wrapper">
          <div className="chart-container">
            <ChartCanvas sampleData={filteredData} fullData={processedDataFull} activeIndicators={activeIndicators} showPredictions={showPredictions} chartType={chartType} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
              {Object.entries(activeIndicators).flatMap(([key, arr]) =>
                arr.map((cfg, idx) => (
                  <span key={key + idx} style={{ background: '#23272f', color: '#4fc3f7', borderRadius: 16, padding: '4px 12px', display: 'flex', alignItems: 'center', fontSize: 14 }}>
                    {INDICATOR_LABELS[key]}{cfg.period ? `(${cfg.period})` : ''}
                    <button style={{ marginLeft: 8, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}
                      onClick={() => { setActiveIndicators(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) })); }} title="Remove indicator"
                    >×</button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}