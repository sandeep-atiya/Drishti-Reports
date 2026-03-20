import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
