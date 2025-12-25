import fs from 'fs';
import path from 'path';
import { DIVPacket } from './validator';
import * as Diff from 'diff';

export async function applyDIV(div: DIVPacket, rootDir: string): Promise<void> {
    // 1. Backup changed files
    const backupDir = path.join(process.cwd(), 'mcp-data', 'backups', div.id);
    fs.mkdirSync(backupDir, { recursive: true });

    for (const change of div.changes) {
        const targetPath = path.join(rootDir, change.path);

        if (change.op === 'modify' || change.op === 'delete') {
            if (fs.existsSync(targetPath)) {
                const backupPath = path.join(backupDir, change.path);
                fs.mkdirSync(path.dirname(backupPath), { recursive: true });
                fs.copyFileSync(targetPath, backupPath);
            }
        }

        if (change.op === 'create') {
            if (fs.existsSync(targetPath)) throw new Error(`File ${change.path} already exists`);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, change.content || '');
        } else if (change.op === 'delete') {
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        } else if (change.op === 'modify') {
            if (!fs.existsSync(targetPath)) throw new Error(`File ${change.path} not found`);
            const original = fs.readFileSync(targetPath, 'utf8');

            if (change.content !== undefined) {
                fs.writeFileSync(targetPath, change.content);
            } else if (change.patch) {
                const patched = Diff.applyPatch(original, change.patch);
                if (patched === false) {
                    throw new Error(`Failed to apply patch to ${change.path}`);
                }
                fs.writeFileSync(targetPath, patched);
            }
        }
    }
}

export async function rollbackDIV(div: DIVPacket, rootDir: string): Promise<void> {
    const backupDir = path.join(process.cwd(), 'mcp-data', 'backups', div.id);
    if (!fs.existsSync(backupDir)) throw new Error("No backup found for this DIV");

    // Restore backups
    // We iterate changes in reverse order? Not strictly necessary if we just restore files.
    // But for created files, we must delete them (they won't be in backup).

    for (const change of div.changes) {
        const targetPath = path.join(rootDir, change.path);

        if (change.op === 'create') {
            // Created file -> Delete it
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        } else {
            // Modify/Delete -> Restore from backup
            const backupPath = path.join(backupDir, change.path);
            if (fs.existsSync(backupPath)) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.copyFileSync(backupPath, targetPath);
            }
        }
    }
}
