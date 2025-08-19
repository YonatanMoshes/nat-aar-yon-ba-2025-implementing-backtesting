// Moving Averages
export const calculateSMA = (data, period) => {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
    sma.push(sum / period);
  }
  return sma;
};

export const calculateEMA = (data, period) => {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // Calculate first EMA using SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  ema[period - 1] = sum / period;
  
  // Calculate remaining EMAs
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  // Fill initial values with null
  for (let i = 0; i < period - 1; i++) {
    ema[i] = null;
  }
  
  return ema;
};

// RSI (Relative Strength Index)
export const calculateRSI = (data, period = 14) => {
  const rsi = [];
  
  // Fill initial values with null
  for (let i = 0; i < period; i++) {
    rsi.push(null);
  }
  
  if (data.length <= period) {
    return rsi;
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI for the first valid point
  if (avgLoss === 0) {
    rsi[period] = 100; // All gains, no losses
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));
  }
  
  // Calculate remaining RSI values
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    let gain = 0;
    let loss = 0;
    
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    
    if (avgLoss === 0) {
      rsi[i] = 100; // All gains, no losses
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return rsi;
};

// MACD (Moving Average Convergence Divergence)
export const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Calculate MACD line
  const macdLine = fastEMA.map((fast, i) => {
    if (fast === null || slowEMA[i] === null) return null;
    return fast - slowEMA[i];
  });
  
  // Calculate Signal line (EMA of MACD) - filter out null values
  const macdDataForSignal = macdLine
    .map((value, i) => ({ close: value }))
    .filter((item, i) => macdLine[i] !== null);
  
  const signalLine = calculateEMA(macdDataForSignal, signalPeriod);
  
  // Map signal line back to original indices, filling nulls where MACD is null
  const mappedSignalLine = [];
  let signalIndex = 0;
  
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      mappedSignalLine.push(null);
    } else {
      mappedSignalLine.push(signalLine[signalIndex]);
      signalIndex++;
    }
  }
  
  // Calculate Histogram
  const histogram = macdLine.map((macd, i) => {
    if (macd === null || mappedSignalLine[i] === null) return null;
    return macd - mappedSignalLine[i];
  });
  
  return {
    macdLine,
    signalLine: mappedSignalLine,
    histogram
  };
};

// Bollinger Bands
export const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
  const sma = calculateSMA(data, period);
  const bands = {
    upper: [],
    middle: sma,
    lower: []
  };
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      bands.upper.push(null);
      bands.lower.push(null);
      continue;
    }
    
    // Calculate standard deviation
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const squaredDiffs = slice.map(d => Math.pow(d.close - mean, 2));
    const standardDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
    
    bands.upper.push(mean + (multiplier * standardDeviation));
    bands.lower.push(mean - (multiplier * standardDeviation));
  }
  
  return bands;
};

// Stochastic Oscillator
export const calculateStochastic = (data, kPeriod = 14, dPeriod = 3) => {
  const stochastic = {
    k: [],
    d: []
  };
  
  // Calculate %K
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      stochastic.k.push(null);
      continue;
    }
    
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[i].close;
    
    // Handle division by zero when all prices are identical
    if (highestHigh === lowestLow) {
      stochastic.k.push(50); // Neutral value when range is zero
    } else {
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      stochastic.k.push(k);
    }
  }
  
  // Calculate %D (SMA of %K) - filter out null values
  const kDataForD = stochastic.k
    .map((k, i) => ({ close: k }))
    .filter((item, i) => stochastic.k[i] !== null);
  
  const dValues = calculateSMA(kDataForD, dPeriod);
  
  // Map D values back to original indices, filling nulls where K is null
  const mappedDValues = [];
  let dIndex = 0;
  
  for (let i = 0; i < stochastic.k.length; i++) {
    if (stochastic.k[i] === null) {
      mappedDValues.push(null);
    } else {
      mappedDValues.push(dValues[dIndex]);
      dIndex++;
    }
  }
  
  stochastic.d = mappedDValues;
  
  return stochastic;
};

// Volume Profile
export const calculateVolumeProfile = (data, numBins = 10) => {
  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Handle edge case where all prices are identical
  if (priceRange === 0) {
    const bins = Array(numBins).fill(0);
    const binPrices = Array(numBins).fill(minPrice);
    
    // All volume goes to the first bin
    bins[0] = data.reduce((sum, candle) => sum + (candle.volume || 0), 0);
    
    return {
      bins,
      prices: binPrices
    };
  }
  
  const binSize = priceRange / numBins;
  
  const bins = Array(numBins).fill(0);
  const binPrices = Array(numBins).fill(0);
  
  // Initialize bin prices
  for (let i = 0; i < numBins; i++) {
    binPrices[i] = minPrice + (i * binSize);
  }
  
  // Calculate volume for each bin
  data.forEach(candle => {
    const binIndex = Math.min(
      Math.floor((candle.close - minPrice) / binSize),
      numBins - 1
    );
    bins[binIndex] += candle.volume || 0;
  });
  
  return {
    bins,
    prices: binPrices
  };
};

// ATR (Average True Range)
export const calculateATR = (data, period = 14) => {
  const atr = [];
  
  // Fill initial values with null
  for (let i = 0; i < period; i++) {
    atr.push(null);
  }
  
  if (data.length <= period) {
    return atr;
  }
  
  const trueRanges = [];
  
  // Calculate True Range
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calculate initial ATR using first 'period' true ranges
  let sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
  atr[period] = sum / period;
  
  // Calculate remaining ATR values
  for (let i = period + 1; i < data.length; i++) {
    const trueRangeIndex = i - 1; // trueRanges array is offset by 1
    atr[i] = ((atr[i - 1] * (period - 1)) + trueRanges[trueRangeIndex]) / period;
  }
  
  return atr;
};

// Ichimoku Cloud
export const calculateIchimoku = (data, conversionPeriod = 9, basePeriod = 26, spanPeriod = 52, displacement = 26) => {
  const ichimoku = {
    conversion: [],
    base: [],
    spanA: [],
    spanB: [],
    lagging: []
  };
  
  // Calculate Conversion Line (Tenkan-sen)
  for (let i = 0; i < data.length; i++) {
    if (i < conversionPeriod - 1) {
      ichimoku.conversion.push(null);
      continue;
    }
    
    const slice = data.slice(i - conversionPeriod + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    ichimoku.conversion.push((high + low) / 2);
  }
  
  // Calculate Base Line (Kijun-sen)
  for (let i = 0; i < data.length; i++) {
    if (i < basePeriod - 1) {
      ichimoku.base.push(null);
      continue;
    }
    
    const slice = data.slice(i - basePeriod + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    ichimoku.base.push((high + low) / 2);
  }
  
  // Calculate Leading Span A (Senkou Span A)
  for (let i = 0; i < data.length; i++) {
    if (i < basePeriod - 1) {
      ichimoku.spanA.push(null);
      continue;
    }
    
    const conversion = ichimoku.conversion[i];
    const base = ichimoku.base[i];
    ichimoku.spanA.push((conversion + base) / 2);
  }
  
  // Calculate Leading Span B (Senkou Span B)
  for (let i = 0; i < data.length; i++) {
    if (i < spanPeriod - 1) {
      ichimoku.spanB.push(null);
      continue;
    }
    
    const slice = data.slice(i - spanPeriod + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    ichimoku.spanB.push((high + low) / 2);
  }
  
  // Calculate Lagging Span (Chikou Span)
  for (let i = 0; i < data.length; i++) {
    if (i >= data.length - displacement) {
      // Cannot plot future prices beyond available data
      ichimoku.lagging.push(null);
    } else {
      // Shift current closing price forward by displacement periods
      ichimoku.lagging.push(data[i + displacement].close);
    }
  }
  
  return ichimoku;
};
