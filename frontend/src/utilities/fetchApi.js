import { JS_API_BASE_URL, PY_API_BASE_URL, RECOMMENDATION_API_URL, SEND_TOKEN } from './consts'

export const setupPortfolio = async (userId, setupData) => {
  try {
    const response = await fetch(`${JS_API_BASE_URL}/users/${userId}/setup-portfolio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": SEND_TOKEN()
      },
      body: JSON.stringify(setupData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Portfolio setup failed.');
    }
    return await response.json();
  } catch (error) {
    console.error('Error setting up portfolio:', error);
    throw error;
  }
};

export const executeTrade = async (userId, tradeDetails) => {
  try {
    const response = await fetch(`${JS_API_BASE_URL}/users/${userId}/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": SEND_TOKEN()
      },
      body: JSON.stringify(tradeDetails),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Trade execution failed.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing trade:', error);
    throw error;
  }
};

export const updateUser = async (userId, payload) => {
  return fetch(`${JS_API_BASE_URL}/users/${userId}`,
    {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        "Authorization": SEND_TOKEN()
      },
      body: JSON.stringify(payload)
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched after update user:', dataFetched);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
};

export const fetchUser = async (userId) => {
  return fetch(`${JS_API_BASE_URL}/users/${userId}`,
    {
      method: "GET",
      headers: {
        "Authorization": SEND_TOKEN()
      }
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched user:', dataFetched);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
}

export const fetchStockData = async (startingDate, endDate, stock = 'BTC') => {
  return fetch(`${JS_API_BASE_URL}/prices/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": SEND_TOKEN()
      },
      body: JSON.stringify({
        startDate: startingDate,
        endDate: endDate,
        stock: stock
      })
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched data:', dataFetched.data);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
}

export const fetchDatesRange = async (stock = 'BTC') => {
  return fetch(`${JS_API_BASE_URL}/prices/date-range`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": SEND_TOKEN()
      },
      body: JSON.stringify({
        stock: stock
      })
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched ranges:', dataFetched);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
}

export const authenticateToken = async () => {
  return fetch(`${JS_API_BASE_URL}/tokens/verify`,
    {
      method: "GET",
      headers: {
        "Authorization": SEND_TOKEN()
      }
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      return dataFetched;
    })
    .catch((error) => {
      throw error;
    });
}

export const updateDates = async (stock, sid) => {
  return fetch(`${PY_API_BASE_URL}/update-data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stock: stock,
        sid: sid
      })
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched :', dataFetched);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
}

export const fetchRecommendation = async (stock) => {
  return fetch(`${RECOMMENDATION_API_URL}/recommend/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stock: stock
      })
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((dataFetched) => {
      console.log('Fetched recommendation:', dataFetched);
      return dataFetched;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      throw error;
    });
}

export const getScheduleStatus = async (stock) => {
  const response = await fetch(`${PY_API_BASE_URL}/schedule/${stock}`);
  if (!response.ok) throw new Error('Failed to get schedule status');
  return response.json();
};

export const startServerSchedule = async (stock, interval) => {
  const response = await fetch(`${PY_API_BASE_URL}/schedule/${stock}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval: interval }), // Sending the number of 5-min units
  });
  if (!response.ok) throw new Error('Failed to start schedule');
  return response.json();
};

export const stopServerSchedule = async (stock) => {
  const response = await fetch(`${PY_API_BASE_URL}/schedule/${stock}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to stop schedule');
  return response.json();
};