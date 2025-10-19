import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// API endpoints configuration
const THETANUTS_API_URL = process.env.THETANUTS_API_URL || 'https://round-snowflake-9c31.avutheking.workers.dev/';

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/orders', async (req, res) => {
  try {
    console.log('Fetching data from Thetanuts API...');
    const response = await fetch(THETANUTS_API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.data?.orders?.length || 0} orders`);

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching from API:', error.message);
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
});


// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// All other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: GET /api/orders - Fetch Thetanuts orders`);
  console.log(`📦 Serving static files from /dist`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}\n`);
});
