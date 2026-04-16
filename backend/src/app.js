import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

/**

* CORS Configuration
* Allow dynamic origins + fallback for tools (Postman, etc.)
  */
  const allowedOrigins = [
  'http://192.168.1.210',
  'http://192.168.1.210:80',
  'http://192.168.10.76',
  'http://192.168.10.76:5002',
  'http://192.168.10.76:80',
  'http://192.168.10.76:86',
  'http://localhost:5001',
  'http://localhost:3000',
  'http://127.0.0.1:5001',
  'http://127.0.0.1:3000'
  ];

const corsOptions = {
origin: function (origin, callback) {
// allow requests with no origin (like Postman or server-to-server)
if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
optionsSuccessStatus: 200
};

// 🔐 Security & Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Health Check (VERY IMPORTANT for IIS / debugging)
app.get('/health', (req, res) => {
res.status(200).json({
status: 'OK',
message: 'Server is running'
});
});

// ✅ API Routes
app.use('/api/v1', router);

// ❌ 404 Handler
app.use(notFoundHandler);

// ❌ Global Error Handler
app.use(errorHandler);

export default app;
