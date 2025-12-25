import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { validateDIV } from './div/validator';
import { applyDIV, rollbackDIV } from './div/applier';
import { DIVPacket } from './div/validator'; // Re-export type
import { handleMCPRequest } from './mcp/protocol';

// Redirect console.log to stderr to keep stdout clean for potential stdio transport
const originalLog = console.log;
console.log = console.error;

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.MCP_PORT || 3001;
const DATA_DIR = path.join(process.cwd(), 'mcp-data');
const ROOT_DIR = process.cwd();

// Ensure data dirs
fs.mkdirSync(path.join(DATA_DIR, 'runs'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'queue'), { recursive: true });

// --- STORE HELPERS ---
function saveDIV(div: DIVPacket) {
    const p = path.join(DATA_DIR, 'queue', `${div.id}.json`);
    fs.writeFileSync(p, JSON.stringify(div, null, 2));
}

function loadDIV(id: string): DIVPacket | null {
    const p = path.join(DATA_DIR, 'queue', `${id}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listDIVs(): DIVPacket[] {
    const dir = path.join(DATA_DIR, 'queue');
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        .sort((a, b) => new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime());
}

// --- ROUTES ---

app.get('/mcp/status', (req, res) => {
  res.json({ status: 'running', port, pid: process.pid, cwd: ROOT_DIR });
});

// MCP Protocol Endpoint
app.post('/mcp', async (req, res) => {
    const response = await handleMCPRequest(req.body);
    res.json(response);
});

// DIV Queue (REST - maintained for UI)
app.get('/mcp/div', (req, res) => {
    res.json(listDIVs());
});

app.post('/mcp/div', (req, res) => {
    const div = req.body as DIVPacket;
    // Basic ID generation if missing
    if (!div.id) div.id = `div_${Date.now()}`;
    div.review = { status: 'draft', comments: [] };
    div.erstelltAm = new Date().toISOString();

    saveDIV(div);
    res.json({ ok: true, id: div.id });
});

app.get('/mcp/div/:id', (req, res) => {
    const div = loadDIV(req.params.id);
    if (!div) return res.status(404).json({ error: 'Not found' });
    res.json(div);
});

app.post('/mcp/div/:id/validate', (req, res) => {
    const div = loadDIV(req.params.id);
    if (!div) return res.status(404).json({ error: 'Not found' });

    const result = validateDIV(div);
    res.json(result);
});

app.post('/mcp/div/:id/apply', async (req, res) => {
    const div = loadDIV(req.params.id);
    if (!div) return res.status(404).json({ error: 'Not found' });

    const valid = validateDIV(div);
    if (!valid.valid) return res.status(400).json(valid);

    try {
        await applyDIV(div, ROOT_DIR);
        div.review.status = 'applied';
        saveDIV(div);
        res.json({ ok: true });
    } catch (e: any) {
        console.error("Apply failed", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/mcp/div/:id/rollback', async (req, res) => {
    const div = loadDIV(req.params.id);
    if (!div) return res.status(404).json({ error: 'Not found' });

    try {
        await rollbackDIV(div, ROOT_DIR);
        div.review.status = 'rolled_back';
        saveDIV(div);
        res.json({ ok: true });
    } catch (e: any) {
        console.error("Rollback failed", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
  console.log(`MCP Server running on port ${port}`);
});
