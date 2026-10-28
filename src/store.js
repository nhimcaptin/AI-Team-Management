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
    // a discussion with no project keeps its history in the tool's data folder
    if (!task.projectPath) return path.join(this.dataDir, 'tasks', task.id);
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

  remove(task) {
    this.tasks = this.tasks.filter((t) => t.id !== task.id);
    this.#writeIndex();
    fs.rmSync(this.taskDir(task), { recursive: true, force: true });
    // drop <project>/.ai-team too once its last task is gone
    const parent = path.dirname(this.taskDir(task));
    try {
      if (!fs.readdirSync(parent).length) fs.rmdirSync(parent);
    } catch {}
  }

  // Adds tasks whose history is in <project>/.ai-team/ but which this machine's
  // list does not know, e.g. history pulled from git after working on another
  // machine. The project may live at a different path here.
  importFrom(projectPath) {
    let ids = [];
    try {
      ids = fs.readdirSync(path.join(projectPath, '.ai-team'));
    } catch {
      return [];
    }
    const added = [];
    for (const id of ids) {
      if (this.get(id)) continue;
      let task;
      try {
        task = JSON.parse(fs.readFileSync(path.join(projectPath, '.ai-team', id, 'task.json'), 'utf8'));
      } catch {
        continue;
      }
      if (task?.id !== id) continue;
      task.projectPath = projectPath;
      // it was running on the other machine; nothing runs it here
      if (['running', 'waiting', 'queued'].includes(task.status)) task.status = 'interrupted';
      this.tasks.push(task);
      added.push(task);
    }
    if (added.length) this.#writeIndex();
    return added;
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
