import { getPool } from './db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  
  const env = {
    host: !!process.env.DB_HOST,
    user: !!process.env.DB_USER,
    pass: !!process.env.DB_PASSWORD,
    name: !!process.env.DB_NAME,
    port: process.env.DB_PORT || '3306',
    ssl_configured: process.env.DB_SSL === 'true'
  };

  try {
    const pool = getPool();
    const [rows]: any = await pool.execute('SELECT 1 as connected');
    
    return res.status(200).json({ 
      status: 'online', 
      database: 'connected',
      ssl_mode: env.ssl_configured ? 'Secure' : 'Plaintext (Forced)',
      env 
    });
  } catch (error: any) {
    console.error('[Status Check Error]:', error.message);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      hint: 'Check your EC2 Security Group for Inbound Port 3306 and ensure MySQL bind-address is 0.0.0.0',
      env 
    });
  }
}