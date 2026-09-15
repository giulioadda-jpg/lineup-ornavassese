import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits to allow base64 player photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
  const LINEUP_FILE = path.join(DATA_DIR, 'lineup.json');
  const TEAM_FILE = path.join(DATA_DIR, 'team.json');

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get shared players & photos
  app.get('/api/players', (req, res) => {
    if (fs.existsSync(PLAYERS_FILE)) {
      try {
        const content = fs.readFileSync(PLAYERS_FILE, 'utf-8');
        const players = JSON.parse(content);
        return res.json({ players });
      } catch (err) {
        console.error('Error reading players.json:', err);
      }
    }
    return res.json({ players: null });
  });

  // Save players & photos to server so all devices (iPhone, Mac, etc.) share them
  app.post('/api/players', (req, res) => {
    try {
      const { players } = req.body;
      if (!Array.isArray(players)) {
        return res.status(400).json({ error: 'Invalid players array' });
      }
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');
      return res.json({ success: true, count: players.length });
    } catch (err: any) {
      console.error('Error writing players.json:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Lineup persistence
  app.get('/api/lineup', (req, res) => {
    if (fs.existsSync(LINEUP_FILE)) {
      try {
        const content = fs.readFileSync(LINEUP_FILE, 'utf-8');
        return res.json(JSON.parse(content));
      } catch (err) {
        console.error('Error reading lineup.json:', err);
      }
    }
    return res.json({ lineup: null, module: null });
  });

  app.post('/api/lineup', (req, res) => {
    try {
      fs.writeFileSync(LINEUP_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Team config persistence
  app.get('/api/team', (req, res) => {
    if (fs.existsSync(TEAM_FILE)) {
      try {
        const content = fs.readFileSync(TEAM_FILE, 'utf-8');
        return res.json(JSON.parse(content));
      } catch (err) {
        console.error('Error reading team.json:', err);
      }
    }
    return res.json({ team: null });
  });

  app.post('/api/team', (req, res) => {
    try {
      fs.writeFileSync(TEAM_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Save uploaded logo file (e.g. LOGO SQUADRA.png) to public/assets/logo.png
  app.post('/api/team/logo', (req, res) => {
    try {
      const { dataUrl } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Missing dataUrl' });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
      if (!fs.existsSync(publicAssetsDir)) {
        fs.mkdirSync(publicAssetsDir, { recursive: true });
      }

      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        const logoFilePath = path.join(publicAssetsDir, 'logo.png');
        fs.writeFileSync(logoFilePath, buffer);
      }

      // Update team.json
      let currentTeam: any = {};
      if (fs.existsSync(TEAM_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(TEAM_FILE, 'utf-8'));
          if (parsed?.team) currentTeam = parsed.team;
          else currentTeam = parsed;
        } catch (_) {}
      }
      currentTeam.logoUrl = `/assets/logo.png?v=${Date.now()}`;
      fs.writeFileSync(TEAM_FILE, JSON.stringify({ team: currentTeam }, null, 2), 'utf-8');

      return res.json({ success: true, logoUrl: currentTeam.logoUrl });
    } catch (err: any) {
      console.error('Error saving team logo:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware in dev / static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
