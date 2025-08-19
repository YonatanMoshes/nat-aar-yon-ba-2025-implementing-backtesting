import React from 'react';

export default function PredictionsButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? '#238636' : '#21262d',
        border: '1px solid #30363d',
        borderRadius: '6px',
        padding: '8px 16px',
        color: '#f0f6fc',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        marginRight: '12px'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = isActive ? '#2ea043' : '#30363d';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = isActive ? '#238636' : '#21262d';
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
      Predictions
    </button>
  );
} 