const mongoose = require('mongoose');
const { getOHLCModel } = require('../models/ohlc');
const { getBinaryModel } = require('../models/binary');
const { getPCTModel } = require('../models/pct');

// Utility to format date as string (to match Python's behavior)
function toDateStr(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function fetchPrices(startDate, endDate, stock) {
  try {
    // Create a query object for the timestamp field.
    const timestampQuery = {};
    if (startDate) {
      timestampQuery.$gte = startDate;
    }
    if (endDate) {
      timestampQuery.$lte = endDate;
    }

    // Build the final query. If timestampQuery is empty, the final query will be {},
    // which fetches all documents.
    const query = {};
    if (Object.keys(timestampQuery).length > 0) {
      query.timestamp = timestampQuery;
    }

    // Get collection names for the specific stock
    const ohlcCollection = `ohlc_${stock}`;
    const binaryCollection = `binary_${stock}`;
    const pctCollection = `pct_${stock}`;

    // Create models with dynamic collection names
    const OHLC = getOHLCModel(ohlcCollection);
    const Binary = getBinaryModel(binaryCollection);
    const PCT = getPCTModel(pctCollection);

    // First, let's check if we can connect to MongoDB and see what collections exist
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not established');
    }
    
    const collections = await db.listCollections().toArray();

    // Check if our collections exist
    const ohlcExists = collections.some(c => c.name === ohlcCollection);
    const binaryExists = collections.some(c => c.name === binaryCollection);
    const pctExists = collections.some(c => c.name === pctCollection);
    console.log(`Collections found: OHLC: ${ohlcExists}, Binary: ${binaryExists}, PCT: ${pctExists}`);
    // Fetch data from all three collections with error handling
    let ohlcData = [];
    let binaryData = [];
    let pctData = [];

    try {
      if (ohlcExists) {
        ohlcData = await OHLC.find(query)
        .select('timestamp open high low close volume').lean();
      }
    } catch (e) {
      console.error('Error fetching OHLC data:', e);
    }

    try {
      if (binaryExists) {
        binaryData = await Binary.find(query)
        .select('timestamp prediction_threshold_0 prediction_threshold_1 prediction_threshold_2 prediction_threshold_3 prediction_threshold_4 prediction_threshold_5 prediction_threshold_6 prediction_threshold_7 prediction_threshold_8').lean();
      }
    } catch (e) {
      console.error('Error fetching binary data:', e);
    }

    try {
      if (pctExists) {
        pctData = await PCT.find(query)
        .select('timestamp prediction').lean();
      }
    } catch (e) {
      console.error('Error fetching PCT data:', e);
    }

    // Create a map of timestamps to merge data
    const dataMap = new Map();

    // Add OHLC data
    ohlcData.forEach(doc => {
      const timestamp = doc.timestamp; // Already a string
      dataMap.set(timestamp, {
        timestamp,
        open: doc.open,
        high: doc.high,
        low: doc.low,
        close: doc.close,
        volume: doc.volume
      });
    });

    // Add binary predictions
    binaryData.forEach(doc => {
      const timestamp = doc.timestamp; // Already a string
      const existing = dataMap.get(timestamp) || { timestamp };
      
      dataMap.set(timestamp, {
        ...existing,
        binary_predictions: {
          threshold_0: doc.prediction_threshold_0,
          threshold_1: doc.prediction_threshold_1,
          threshold_2: doc.prediction_threshold_2,
          threshold_3: doc.prediction_threshold_3,
          threshold_4: doc.prediction_threshold_4,
          threshold_5: doc.prediction_threshold_5,
          threshold_6: doc.prediction_threshold_6,
          threshold_7: doc.prediction_threshold_7,
          threshold_8: doc.prediction_threshold_8
        }
      });
    });

    // Add percentage predictions
    pctData.forEach(doc => {
      const timestamp = doc.timestamp; // Already a string
      const existing = dataMap.get(timestamp) || { timestamp };
      
      dataMap.set(timestamp, {
        ...existing,
        pct_prediction: doc.prediction
      });
    });

    // Convert map to array and sort by timestamp
    const records = Array.from(dataMap.values()).sort((a, b) => 
      a.timestamp.localeCompare(b.timestamp)
    );

    if (!records.length) {
      return { data: [] };
    }

    return { data: records };
  } catch (e) {
    console.error('Error in fetchPrices:', e);
    // Re-throw for controller/router to handle HTTP responses
    throw e;
  }
}

// Helper function to get min/max date from a single collection
const getMinMax = async (model) => {
  try {
    const result = await model.aggregate([
      { $group: { _id: null, minDate: { $min: "$timestamp" }, maxDate: { $max: "$timestamp" } } }
    ]).exec(); // Use exec() for promises with aggregate
    return result.length > 0 ? result[0] : null;
  } catch (e) {
    console.error(`Error aggregating dates for model ${model.modelName}:`, e);
    return null;
  }
};

// Helper function to format the date string correctly for the <input>
const formatDateForInput = (dateObject) => {
  const pad = (num) => num.toString().padStart(2, '0');
  const year = dateObject.getFullYear();
  const month = pad(dateObject.getMonth() + 1);
  const day = pad(dateObject.getDate());
  const hours = pad(dateObject.getHours());
  const minutes = pad(dateObject.getMinutes());
  const seconds = pad(dateObject.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

async function fetchMinMaxDates(stock) {
  // Get collection names for the specific stock
  const ohlcCollection = `ohlc_${stock}`;
  const binaryCollection = `binary_${stock}`;
  const pctCollection = `pct_${stock}`;

  // Create models with dynamic collection names
  const OHLC = getOHLCModel(ohlcCollection);
  const Binary = getBinaryModel(binaryCollection);
  const PCT = getPCTModel(pctCollection);

  // First, let's check if we can connect to MongoDB and see what collections exist
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection not established'); // Return here some defualt values instead of throwing error
  }
  
  const collections = await db.listCollections().toArray();

  try {
    // 1. Fetch the date ranges from all three collections concurrently
    const [ohlcRange, binaryRange, pctRange] = await Promise.all([
      getMinMax(OHLC),
      getMinMax(Binary),
      getMinMax(PCT)
    ]);

    // Filter out any collections that had no data or failed
    const validRanges = [ohlcRange, binaryRange, pctRange].filter(r => r !== null);

    if (validRanges.length < 3) {
      // If we don't have data from all three sources, we can't create a valid intersection.
      console.warn(`Could not get a valid date range from all 3 collections for stock: ${stock}.`);
      return {
        // Return a default or empty state
        start: null,
        end: null
      };
    }

    // 2. Calculate the intersection of the date ranges
    // The start of our valid range is the LATEST of all the minimum dates.
    const startTimestamp = Math.max(...validRanges.map(r => new Date(r.minDate).getTime()));
  
    // The end of our valid range is the EARLIEST of all the maximum dates.
    // We get the millisecond timestamp for each maxDate and find the min.
    const endTimestamp = Math.min(...validRanges.map(r => new Date(r.maxDate).getTime()));

    // Now, convert the final millisecond timestamps back into Date objects.
    const start = new Date(startTimestamp);
    const end = new Date(endTimestamp);


    if (start >= end) {
      console.warn(`No overlapping date range found for stock: ${stock}.`);
      return { start: null, end: null };
    }

    // 5. Return the final, intersected date range, formatted correctly.
    return {
      start: formatDateForInput(start),
      end: formatDateForInput(end)
    };
  } catch (error) {
      console.error(`An unexpected error occurred while fetching data for ${stock}:`, error);
      // Return a default or empty state in case of a critical failure
      return { start: null, end: null };
  }
}

const getLatestPrice = async (stockSymbol) => {
    try {
        // 1. Get the latest timestamp from your existing, robust function.
        const dateRange = await fetchMinMaxDates(stockSymbol);

        if (!dateRange || !dateRange.end) {
            throw { statusCode: 404, message: `Could not determine the latest price for ${stockSymbol}.` };
        }
        
        const latestTimestamp = dateRange.end;

        // 2. Fetch the data for ONLY that single, latest timestamp.
        // We pass the same value for both start and end to get one record.
        const latestPriceData = await fetchPrices(latestTimestamp, latestTimestamp, stockSymbol);
        
        // 3. Validate the result and extract the price.
        if (!latestPriceData || !latestPriceData.data || latestPriceData.data.length === 0) {
            throw { statusCode: 404, message: `No price data found at the latest timestamp for ${stockSymbol}` };
        }

        const closePrice = latestPriceData.data[0].close;

        if (closePrice == null) { // Check for null or undefined
            throw { statusCode: 500, message: `The latest record for ${stockSymbol} is missing a close price.` };
        }

        return closePrice;

    } catch (error) {
        console.error(`Error in getLatestPrice for ${stockSymbol}:`, error);
        // Re-throw the error so the executeTrade function can handle it
        throw error;
    }
}

module.exports = { fetchPrices, fetchMinMaxDates, getLatestPrice };