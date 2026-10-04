import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/infrastructure/http/authRoutes';
import { userRoutes } from './modules/users/infrastructure/http/userRoutes';
import { auditRoutes } from './modules/audit/infrastructure/http/auditRoutes';
import { catalogRoutes } from './modules/catalog/infrastructure/http/catalogRoutes';
import { inventoryRoutes } from './modules/inventory/infrastructure/http/inventoryRoutes';
import { approvalRoutes } from './modules/approvals/infrastructure/http/approvalRoutes';
import { workRoutes } from './modules/works/infrastructure/http/workRoutes';
import { exportRoutes } from './modules/exports/infrastructure/http/exportRoutes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', approvalRoutes);
app.use('/api/works', workRoutes);
app.use('/api/exports', exportRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'Healthy' });
});

// Error handling
app.use(errorHandler);

export default app;
