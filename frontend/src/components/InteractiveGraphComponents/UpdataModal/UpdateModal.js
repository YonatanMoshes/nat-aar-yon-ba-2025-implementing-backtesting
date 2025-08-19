import React, { useState } from 'react';
import './UpdateModal.css';

export default function UpdateModal({
  isOpen,
  onClose,
  onUpdateNow,
  onStartScheduled,
  onStopScheduled,
  isScheduled, // This will now be an object like { is_active, interval }
  isUpdatingData,
}) {
  // Default to 6 * 5 = 30 minutes
  const [intervals, setIntervals] = useState(isScheduled?.interval || 6);

  if (!isOpen) return null;

  const handleStart = () => {
    if (intervals > 0) {
      onStartScheduled(intervals);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <h2>Update Data Options</h2>

        <div className="modal-section">
          <h3>One-Time Update</h3>
          <p>Trigger a single data update immediately to catch up to the current time.</p>
          <button onClick={onUpdateNow} disabled={isUpdatingData} className="modal-action-btn">
            {isUpdatingData ? 'Updating...' : 'Update Now'}
          </button>
        </div>

        <div className="modal-section">
          <h3>Scheduled Updates (Server-Side)</h3>
          <p>Set a persistent schedule on the server that runs even if this browser is closed.</p>
          {!isScheduled.is_active ? (
            <div className="schedule-controls">
              <label>
                Update every
                <input
                  type="number"
                  value={intervals}
                  onChange={(e) => setIntervals(Number(e.target.value))}
                  min="1"
                  className="schedule-input"
                />
                 x 5 minutes
              </label>
              <button onClick={handleStart} disabled={isUpdatingData} className="modal-action-btn start">
                Start Schedule
              </button>
            </div>
          ) : (
            <div className="schedule-status">
              <p>
                A server-side update is scheduled to run every <strong>{isScheduled.interval * 5} minutes</strong>.
              </p>
              <button onClick={onStopScheduled} className="modal-action-btn stop">
                Stop Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}