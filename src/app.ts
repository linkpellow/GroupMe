import express from 'express';
import cors from 'cors';
import webhookRoutes from './routes/webhook.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/webhook', webhookRoutes);

export default app;