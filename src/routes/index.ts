import { Router } from 'express';
import { aiRoutes } from './aiRoutes';
import { authRoutes } from './authRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { expenseRoutes } from './expenseRoutes';
import { incomeRoutes } from './incomeRoutes';
import { userRoutes } from './userRoutes';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/income', incomeRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/ai', aiRoutes);

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
});
