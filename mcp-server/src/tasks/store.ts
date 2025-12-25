import fs from 'fs';
import path from 'path';

export interface Task {
    id: string;
    title: string;
    status: 'backlog' | 'in_progress' | 'done';
    assignee?: string;
    created: number;
    updated: number;
}

const DATA_DIR = path.join(process.cwd(), 'mcp-data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Ensure dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load(): Task[] {
    if (!fs.existsSync(TASKS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function save(tasks: Task[]) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

export function listTasks(): Task[] {
    return load().sort((a, b) => b.updated - a.updated);
}

export function getTask(id: string): Task | undefined {
    return load().find(t => t.id === id);
}

export function createTask(title: string, status: Task['status'] = 'backlog'): Task {
    const tasks = load();
    const task: Task = {
        id: `task_${Date.now()}`,
        title,
        status,
        created: Date.now(),
        updated: Date.now()
    };
    tasks.push(task);
    save(tasks);
    return task;
}

export function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created'>>): Task | null {
    const tasks = load();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    tasks[idx] = { ...tasks[idx], ...updates, updated: Date.now() };
    save(tasks);
    return tasks[idx];
}

export function deleteTask(id: string): boolean {
    const tasks = load();
    const newTasks = tasks.filter(t => t.id !== id);
    if (tasks.length === newTasks.length) return false;
    save(newTasks);
    return true;
}
