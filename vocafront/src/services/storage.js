import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TASKS = 'voca:tasks';
const KEY_EVENTS = 'voca:events';
const KEY_REMINDERS = 'voca:reminders';

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listTasks({ includeDone = false } = {}) {
  const all = await readJson(KEY_TASKS, []);
  return includeDone ? all : all.filter((t) => !t.done);
}

export async function addTask({ title, dueDate = null }) {
  const all = await readJson(KEY_TASKS, []);
  const task = {
    id: newId(),
    title: String(title || '').trim(),
    dueDate,
    done: false,
    createdAt: new Date().toISOString(),
  };
  if (!task.title) throw new Error('Task title is required');
  all.unshift(task);
  await writeJson(KEY_TASKS, all);
  return task;
}

export async function completeTask({ title, id }) {
  const all = await readJson(KEY_TASKS, []);
  const needle = String(title || '').toLowerCase().trim();
  let hit = null;
  const updated = all.map((t) => {
    if (hit) return t;
    const match = id ? t.id === id : t.title.toLowerCase().includes(needle);
    if (match) {
      hit = { ...t, done: true, completedAt: new Date().toISOString() };
      return hit;
    }
    return t;
  });
  if (!hit) return null;
  await writeJson(KEY_TASKS, updated);
  return hit;
}

export async function listEvents({ date } = {}) {
  const all = await readJson(KEY_EVENTS, []);
  if (!date) return all;
  return all.filter((e) => (e.date || '').startsWith(date));
}

export async function getTodayEvents() {
  return listEvents({ date: todayKey() });
}

export async function addEvent({ title, date, startTime, endTime = null, location = null }) {
  const all = await readJson(KEY_EVENTS, []);
  const event = {
    id: newId(),
    title: String(title || '').trim() || 'Уулзалт',
    date: date || todayKey(),
    startTime: startTime || '09:00',
    endTime,
    location,
    createdAt: new Date().toISOString(),
  };
  all.push(event);
  all.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  await writeJson(KEY_EVENTS, all);
  return event;
}

export async function addReminder({ title, when }) {
  const all = await readJson(KEY_REMINDERS, []);
  const reminder = {
    id: newId(),
    title: String(title || '').trim() || 'Сануулга',
    when: when || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  all.push(reminder);
  await writeJson(KEY_REMINDERS, all);
  return reminder;
}

export async function listReminders() {
  return readJson(KEY_REMINDERS, []);
}
