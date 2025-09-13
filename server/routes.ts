import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStreamSchema, updateStreamSchema, insertStudioSchema, updateStudioSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, requireAuth, requireAdmin, csrfProtection } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes first
  setupAuth(app);
  // Stream endpoints
  app.get('/api/streams', async (req, res) => {
    try {
      const allStreams = await storage.getAllStreams();
      
      // Group streams by category for easier frontend consumption
      const groupedStreams = {
        featured: allStreams.filter(s => s.category === 'featured'),
        overTheAir: allStreams.filter(s => s.category === 'overTheAir'),
        liveFeeds: allStreams.filter(s => s.category === 'liveFeeds'),
        studios: allStreams.filter(s => s.category === 'studios')
      };
      
      res.json(groupedStreams);
    } catch (error) {
      console.error('Error fetching streams:', error);
      res.status(500).json({ error: 'Failed to fetch streams' });
    }
  });

  app.get('/api/streams/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const streams = await storage.getStreamsByCategory(category);
      res.json(streams);
    } catch (error) {
      console.error(`Error fetching streams for category ${req.params.category}:`, error);
      res.status(500).json({ error: 'Failed to fetch streams for category' });
    }
  });

  app.get('/api/streams/studio/:studioId', async (req, res) => {
    try {
      const { studioId } = req.params;
      const streams = await storage.getStreamsByStudio(studioId);
      res.json(streams);
    } catch (error) {
      console.error(`Error fetching streams for studio ${req.params.studioId}:`, error);
      res.status(500).json({ error: 'Failed to fetch studio streams' });
    }
  });

  app.post('/api/streams', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertStreamSchema.parse(req.body);
      const stream = await storage.createStream(validatedData);
      res.status(201).json(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid stream data', details: error.errors });
      } else {
        console.error('Error creating stream:', error);
        res.status(500).json({ error: 'Failed to create stream' });
      }
    }
  });

  app.put('/api/streams/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStreamSchema.parse(req.body);
      const stream = await storage.updateStream(id, validatedData);
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }
      
      res.json(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid stream data', details: error.errors });
      } else {
        console.error('Error updating stream:', error);
        res.status(500).json({ error: 'Failed to update stream' });
      }
    }
  });

  app.delete('/api/streams/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStream(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Stream not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting stream:', error);
      res.status(500).json({ error: 'Failed to delete stream' });
    }
  });

  // Studio endpoints
  app.get('/api/studios', async (req, res) => {
    try {
      const studios = await storage.getAllStudios();
      res.json(studios);
    } catch (error) {
      console.error('Error fetching studios:', error);
      res.status(500).json({ error: 'Failed to fetch studios' });
    }
  });

  app.get('/api/studios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const studio = await storage.getStudio(id);
      
      if (!studio) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.json(studio);
    } catch (error) {
      console.error('Error fetching studio:', error);
      res.status(500).json({ error: 'Failed to fetch studio' });
    }
  });

  app.post('/api/studios', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertStudioSchema.parse(req.body);
      const studio = await storage.createStudio(validatedData);
      res.status(201).json(studio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid studio data', details: error.errors });
      } else {
        console.error('Error creating studio:', error);
        res.status(500).json({ error: 'Failed to create studio' });
      }
    }
  });

  app.put('/api/studios/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStudioSchema.parse(req.body);
      const studio = await storage.updateStudio(id, validatedData);
      
      if (!studio) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.json(studio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid studio data', details: error.errors });
      } else {
        console.error('Error updating studio:', error);
        res.status(500).json({ error: 'Failed to update studio' });
      }
    }
  });

  app.delete('/api/studios/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStudio(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting studio:', error);
      res.status(500).json({ error: 'Failed to delete studio' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
