import { Router, Request, Response } from 'express';
import { getDatabaseClient } from '@null/database';
import { getSocketManager } from '../sockets/socket.manager';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor(process.uptime());
  let dbStatus = 'disconnected';
  let dbEngine = 'unknown';

  try {
    const db = getDatabaseClient();
    const result = await db.query('SELECT 1 AS check_val;');
    if (result.rows.length > 0 && result.rows[0].check_val === 1) {
      dbStatus = 'connected';
      dbEngine = db.isPGlite ? 'PostgreSQL (Persistent Embedded PGlite)' : 'PostgreSQL (Remote Pool)';
    }
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  const socketMgr = getSocketManager();
  const onlineUsers = socketMgr.getOnlineCount();

  res.status(200).json({
    status: 'ok',
    app: 'NULL Communications Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    database: {
      status: dbStatus,
      engine: dbEngine,
    },
    sockets: {
      activeUsers: onlineUsers,
    },
  });
});

export default router;
