const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routers
const ipfsRouter = require('./ipfs');
const blockchainRouter = require('./routes/blockchain');
const authRouter = require('./routes/auth');

// Health check
app.get('/', (req, res) => {
  res.send('Backend Blockcam is running!');
});

// Mount routers
app.use('/blockchain', blockchainRouter);
app.use('/auth', authRouter);
app.use('/hls', express.static(path.join(__dirname, 'hls_output')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend Blockcam listening on port ${PORT}`);
}); 