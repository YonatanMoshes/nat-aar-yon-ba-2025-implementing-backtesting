// Define application-wide constants here
export const JS_API_BASE_URL = '/api/js';
export const PY_API_BASE_URL = '/api/py/model';
export const RECOMMENDATION_API_URL = '/api/py/recommendation';

// The min amount of intervals different beetween start date to end date.
export const MIN_REQUIRED_INTERVALS = 120; 
export const INTERVAL = "5"; // In minutes
export const DEFAULT_STOCK = "BTCUSDT";

export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Unable to connect to the server. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
};

export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
};

export const PARSE_PRICES = (data) => {
    const processedData = data.map(item => ({
        o: item.open,
        h: item.high,
        l: item.low,
        c: item.close,
        date: item.timestamp
    }))

    return processedData;
};

export const INDICATOR_DEFAULTS = {
    sma: { period: 20 },
    ema: { period: 20 },
    rsi: { period: 14 },
    macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bollinger: { period: 20, multiplier: 2 },
    stochastic: { kPeriod: 14, dPeriod: 3 },
    atr: { period: 14 },
    ichimoku: {},
};

export const SEND_TOKEN = () => {
    return `Bearer ${localStorage.getItem('authToken')}`;
};

export const DEFAULT_COLORS = [
  '#58a6ff', '#f59e42', '#e11d48', '#10b981', '#6366f1',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
];

export const INDICATOR_LABELS = {
  sma: 'SMA',
  ema: 'EMA',
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger',
  stochastic: 'Stochastic',
  atr: 'ATR',
  ichimoku: 'Ichimoku'
};

// Chart configuration
export const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' }
];

export const STOCKS = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'LTC', label: 'Litecoin (LTC)' }
];

// Date configuration
export const MIN_DATE = '2025-05-19T23:55';
export const MAX_DATE = '2025-06-20T23:55';

// Chart performance settings
export const MAX_CANDLES = 500;
export const STEP_PERCENT = 0.001; // 0.1% step for predictions

// UI styling constants
export const UI_COLORS = {
  primary: '#4fc3f7',
  background: '#23272f',
  backgroundDark: '#161b22',
  border: '#404040',
  text: '#fff',
  textSecondary: '#aaa',
  error: '#f87171',
  warning: '#f59e0b'
};

export const POLICY_CONFIG = [
    { key: 'buyAndHold', label: 'Buy & Hold' },
    { key: 'rlPolicy', label: 'RL Agent Policy' },
    { key: 'xgPolicy', label: 'XGBoost Prediction Policy' },
    { key: 'lstmPolicy', label: 'LSTM Prediction Policy' }
];

// ------------ Home Page Data -------------

/** Resolve a file that sits straight inside /public */
export const img = (file) => `${process.env.PUBLIC_URL}/${file}`;

export const slidesData = [
  {
    text:
      "This platform changed the way I invest. It’s user-friendly, reliable, and the support team is top-notch. I couldn’t be happier!",
    img: img("pic-1.png"),
    user: "john deo",
  },
  {
    text:
      "I started with zero experience, and now I feel like a pro. The insights and tools are incredibly helpful for beginners like me!",
    img: img("pic-2.png"),
    user: " Maria Lee ",
  },
  {
    text:
      "Fast transactions, great UI, and real-time updates make this app my go-to for trading. Highly recommended!",
    img: img("pic-3.png"),
    user: " Ahmed Khan",
  },
  {
    text:
      "Customer service is amazing! They helped me understand everything and made me feel confident in my trades.",
    img: img("pic-4.png"),
    user: "Lisa Romero",
  },
];

export const plansData = [
  {
    tier: "basic",
    monthly: "$9.99 / monthly",
    yearly: "$99.99 / yearly",
    features: [
      "trade learning access",
      "graphical chart reports",
      "account management",
      "personal advisors",
      "24/7 technical support",
    ],
    included: [true, true, true, false, false],
  },
  {
    tier: "standard",
    monthly: "$29.99 / monthly",
    yearly: "$199.99 / yearly",
    features: [
      "trade learning access",
      "graphical chart reports",
      "account management",
      "personal advisors",
      "24/7 technical support",
    ],
    included: [true, true, true, true, false],
  },
  {
    tier: "premium",
    monthly: "$49.99 / monthly",
    yearly: "$299.99 / yearly",
    features: [
      "trade learning access",
      "graphical chart reports",
      "account management",
      "personal advisors",
      "24/7 technical support",
    ],
    included: [true, true, true, true, true],
  },
];