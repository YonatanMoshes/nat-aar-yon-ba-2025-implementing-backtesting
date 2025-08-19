const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

// Routes
const tokens = require('./routes/token');
const users = require('./routes/user');
const prices = require('./routes/prices'); 

// MongoDB connection with better error handling
mongoose.connect(process.env.CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('MongoDB connected successfully');
  console.log('Connection string:', process.env.CONNECTION_STRING);
});

const app = express();
const server = http.createServer(app);

app.use(cors({ 
    exposedHeaders: ["Location"] // Allow frontend to access the Location header
}));

app.use(bodyParser.urlencoded({extended : true}));
const jsonParser = express.json({ limit: '50mb' });
app.use('/api/js/tokens', jsonParser, tokens);
app.use('/api/js/users', jsonParser, users);
app.use('/api/js/prices', jsonParser, prices); 

const pythonApiUrl = process.env.PYTHON_API_URL; 
const recoApiUrl = process.env.RECO_API_URL; 

if (pythonApiUrl) {
  const pythonProxy = createProxyMiddleware({
    target: pythonApiUrl,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    logLevel: 'debug', 
    pathRewrite: {
      '^/api/py/model': '',
    },
    // Optional: Add logging to see what the proxy is doing
    logLevel: 'debug' 
  });
  
  app.use('/api/py/model', pythonProxy);
}

if (recoApiUrl) {
  console.log(`Proxying recommendations to: ${recoApiUrl}`);
  const recommendationProxy = createProxyMiddleware({
    target: recoApiUrl,
    changeOrigin: true,
    ws: true, 
    logLevel: 'debug',
    pathRewrite: {
      // Remove the prefix before forwarding
      '^/api/py/recommendation': '',
    },
  });

  // Mount this proxy on its own specific path
  app.use('/api/py/recommendation', recommendationProxy);
}

// This tells Express that the 'public' folder contains static assets.
app.use(express.static(path.join(__dirname, '..', 'public')));

// This sends the index.html file for any request that doesn't match an API route.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server and listen for connections
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});