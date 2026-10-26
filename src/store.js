import fs from 'node:fs';
import path from 'node:path';

// Task index lives in the tool's data/ folder; each task's chat history lives
// in <project>/.ai-team/<taskId>/ so it stays on the same drive as the project.
export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.indexFile = path.join(dataDir, 'tasks.json');
    fs.mkdirSync(dataDir, { recursive: true });
    this.tasks = this.#loadIndex();
  }

  #loadIndex() {
    try {
      return JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
    } catch {
      return [];
    }
  }

  #writeIndex() {
    const tmp = this.indexFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.tasks, null, 2));
    fs.renameSync(tmp, this.indexFile);
  }

  list() {
    return [...this.tasks].sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id) {
    return this.tasks.find((t) => t.id === id);
  }

  taskDir(task) {
    return path.join(task.projectPath, '.ai-team', task.id);
  }

  add(task) {
    this.tasks.push(task);
    this.saveTask(task);
  }

  saveTask(task) {
    const i = this.tasks.findIndex((t) => t.id === task.id);
    if (i >= 0) this.tasks[i] = task;
    this.#writeIndex();
    const dir = this.taskDir(task);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'task.json'), JSON.stringify(task, null, 2));
  }

  appendEvent(task, evt) {
    const dir = this.taskDir(task);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(evt) + '\n');
  }

  readEvents(task, after = 0) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(this.taskDir(task), 'events.jsonl'), 'utf8');
    } catch {
      return [];
    }
    const events = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        if (evt.seq > after) events.push(evt);
      } catch {
        // a half-written last line after a crash; skip it
      }
    }
    return events;
  }

  lastSeq(task) {
    const events = this.readEvents(task);
    return events.length ? events[events.length - 1].seq : 0;
  }
}
