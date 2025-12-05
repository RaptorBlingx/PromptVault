// ============================================
// PromptVault API - Server Entry Point
// ============================================

import express from 'express';
import cors from 'cors';
import apiRoutes from './api.js';
import { closeDatabase } from './database.js';

const app = express();
const PORT = process.env.PORT || 2529;

// ----- Middleware -----

// CORS configuration - allow requests from any origin (for Electron app and different hosts)
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ----- Routes -----

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        name: 'PromptVault API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            prompts: '/api/prompts',
            folders: '/api/folders',
            import: '/api/import',
            export: '/api/export',
        },
    });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ----- Server Startup -----

const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║           PromptVault API Server                  ║
╠═══════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                  ║
║  📍 API: http://localhost:${PORT}/api               ║
║  💾 Database: SQLite (WAL mode)                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

// ----- Graceful Shutdown -----

function shutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        closeDatabase();
        console.log('Database connection closed.');
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
