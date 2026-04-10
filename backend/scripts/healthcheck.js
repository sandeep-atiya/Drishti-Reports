import dotenv from 'dotenv';

dotenv.config();

const port = Number.parseInt(process.env.PORT || '5000', 10);
const url = `http://127.0.0.1:${port}/api/v1/health`;

try {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  console.log(`[test:health] ${url} -> ${response.status} ${body.message}`);
} catch (error) {
  console.error(`[test:health] Failed to reach ${url}: ${error.message}`);
  console.error('[test:health] Start the backend server first with npm run dev or npm start.');
  process.exit(1);
}
