// ============================================
// PromptVault API - Express Routes
// ============================================

import { Router, Request, Response } from 'express';
import * as db from './database.js';

const router = Router();

// ----- Health Check -----

router.get('/health', (_req: Request, res: Response) => {
    const stats = db.getStats();
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        ...stats,
    });
});

// ----- Prompts Routes -----

// GET /api/prompts - List all prompts
router.get('/prompts', (_req: Request, res: Response) => {
    try {
        const prompts = db.getAllPrompts();
        res.json(prompts);
    } catch (error) {
        console.error('Failed to get prompts:', error);
        res.status(500).json({ error: 'Failed to retrieve prompts' });
    }
});

// GET /api/prompts/:id - Get single prompt
router.get('/prompts/:id', (req: Request, res: Response) => {
    try {
        const prompt = db.getPromptById(req.params.id);
        if (!prompt) {
            res.status(404).json({ error: 'Prompt not found' });
            return;
        }
        res.json(prompt);
    } catch (error) {
        console.error('Failed to get prompt:', error);
        res.status(500).json({ error: 'Failed to retrieve prompt' });
    }
});

// POST /api/prompts - Create new prompt
router.post('/prompts', (req: Request, res: Response) => {
    try {
        const now = Date.now();
        const prompt: db.Prompt = {
            id: req.body.id || now.toString(),
            title: req.body.title || 'New Prompt',
            content: req.body.content || '',
            tags: req.body.tags || [],
            isFavorite: req.body.isFavorite || false,
            isPinned: req.body.isPinned || false,
            folderId: req.body.folderId || null,
            createdAt: req.body.createdAt || now,
            updatedAt: req.body.updatedAt || now,
            versions: req.body.versions || [],
        };

        const created = db.createPrompt(prompt);
        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to create prompt:', error);
        res.status(500).json({ error: 'Failed to create prompt' });
    }
});

// PUT /api/prompts/:id - Update prompt
router.put('/prompts/:id', (req: Request, res: Response) => {
    try {
        const updated = db.updatePrompt(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Prompt not found' });
            return;
        }
        res.json(updated);
    } catch (error) {
        console.error('Failed to update prompt:', error);
        res.status(500).json({ error: 'Failed to update prompt' });
    }
});

// DELETE /api/prompts/:id - Delete prompt
router.delete('/prompts/:id', (req: Request, res: Response) => {
    try {
        const deleted = db.deletePrompt(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: 'Prompt not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('Failed to delete prompt:', error);
        res.status(500).json({ error: 'Failed to delete prompt' });
    }
});

// ----- Folders Routes -----

// GET /api/folders - List all folders
router.get('/folders', (_req: Request, res: Response) => {
    try {
        const folders = db.getAllFolders();
        res.json(folders);
    } catch (error) {
        console.error('Failed to get folders:', error);
        res.status(500).json({ error: 'Failed to retrieve folders' });
    }
});

// GET /api/folders/:id - Get single folder
router.get('/folders/:id', (req: Request, res: Response) => {
    try {
        const folder = db.getFolderById(req.params.id);
        if (!folder) {
            res.status(404).json({ error: 'Folder not found' });
            return;
        }
        res.json(folder);
    } catch (error) {
        console.error('Failed to get folder:', error);
        res.status(500).json({ error: 'Failed to retrieve folder' });
    }
});

// POST /api/folders - Create new folder
router.post('/folders', (req: Request, res: Response) => {
    try {
        const now = Date.now();
        const folder: db.Folder = {
            id: req.body.id || now.toString(),
            name: req.body.name || 'New Folder',
            icon: req.body.icon || '📁',
            color: req.body.color || '#3B82F6',
            createdAt: req.body.createdAt || now,
        };

        const created = db.createFolder(folder);
        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to create folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// PUT /api/folders/:id - Update folder
router.put('/folders/:id', (req: Request, res: Response) => {
    try {
        const updated = db.updateFolder(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Folder not found' });
            return;
        }
        res.json(updated);
    } catch (error) {
        console.error('Failed to update folder:', error);
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/folders/:id', (req: Request, res: Response) => {
    try {
        const deleted = db.deleteFolder(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: 'Folder not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('Failed to delete folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

// ----- Import/Export Routes -----

// POST /api/import - Import data
router.post('/import', (req: Request, res: Response) => {
    try {
        const { prompts, folders } = req.body;

        if (!Array.isArray(prompts)) {
            res.status(400).json({ error: 'Invalid data: prompts must be an array' });
            return;
        }

        db.importData(prompts, folders || []);
        res.json({
            success: true,
            imported: {
                prompts: prompts.length,
                folders: (folders || []).length
            }
        });
    } catch (error) {
        console.error('Failed to import data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// GET /api/export - Export all data
router.get('/export', (_req: Request, res: Response) => {
    try {
        const data = db.exportData();
        res.json({
            version: 2,
            exportedAt: Date.now(),
            ...data,
        });
    } catch (error) {
        console.error('Failed to export data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

export default router;
