import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

// Proxy endpoint
app.get('/api/orders', async (req, res) => {
  try {
    console.log('Fetching data from Thetanuts API...');
    const response = await fetch('https://round-snowflake-9c31.devops-118.workers.dev/');

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

app.listen(PORT, () => {
  console.log(`\n🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying requests to Thetanuts API\n`);
});
