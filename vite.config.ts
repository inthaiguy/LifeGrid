import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Dev only: keeps a copy of each onboarding session (grid + answer log) on this
// machine in data/private/, so a run can be reviewed afterwards. Not in git.
const saveSessions = (): Plugin => ({
  name: 'save-sessions',
  configureServer(server) {
    server.middlewares.use('/__save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        try {
          const state = JSON.parse(body);
          const id = String(state.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
          if (!id) throw new Error('no id');
          const dir = path.resolve(__dirname, 'data/private');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `session-${id}.json`), JSON.stringify(state, null, 1));
          res.statusCode = 204;
        } catch { res.statusCode = 400; }
        res.end();
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), saveSessions()],
  server: { host: true, port: 5173, strictPort: true, allowedHosts: true },
});
