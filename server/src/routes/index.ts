import { Router } from 'express';
import taskRoutes from './tasks';
import rewardRoutes from './rewards';
import appealRoutes from './appeals';
import pointsRoutes from './points';

const router = Router();

router.use('/tasks', taskRoutes);
router.use('/rewards', rewardRoutes);
router.use('/appeals', appealRoutes);
router.use('/points', pointsRoutes);

export default router;