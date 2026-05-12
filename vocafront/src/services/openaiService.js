import { API_BASE } from '../config';

const TIMEOUT_MS = 60000;

async function postJson(path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${path}: ${text.slice(0, 300)}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(t);
  }
}

const VOCA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Хэрэглэгчийн календар дээр уулзалт/үйл явдал нэмэх',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Уулзалтын гарчиг' },
          date: { type: 'string', description: 'YYYY-MM-DD форматтай огноо' },
          startTime: { type: 'string', description: 'HH:MM эхлэх цаг' },
          endTime: { type: 'string', description: 'HH:MM дуусах цаг (заавал биш)' },
          location: { type: 'string', description: 'Газар (заавал биш)' },
        },
        required: ['title', 'date', 'startTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_events',
      description: 'Өнөөдрийн уулзалт, үйл явдлуудыг буцаах',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Шинэ хийх ажил нэмэх',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD (заавал биш)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'Хийгдээгүй ажлуудын жагсаалт буцаах',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Гарчигаар нь ажлыг дуусгасан гэж тэмдэглэх',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_reminder',
      description: 'Сануулга нэмэх',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          when: { type: 'string', description: 'ISO datetime' },
        },
        required: ['title', 'when'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Имэйл илгээх',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'general_response',
      description: 'Нөгөө tools-ийн алинд ч таарахгүй үед хариу хэлэх',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
    },
  },
];

const SYSTEM_PROMPT = `Та Voca AI бөгөөд Монгол хэлээр ажилладаг хувийн туслах.
- Хэрэглэгчийн өгүүлбэрийг шинжилж зөвхөн нэг функцийг дуудна.
- Огноо хэлэгдээгүй бол өнөөдрийг сонго (YYYY-MM-DD).
- Цаг хэлэгдээгүй ч уулзалт үүсгэх бол 09:00-г default болгох.
- "өнөөдөр", "маргааш" гэсэн үгсийг локал огноо руу хөрвүүлнэ.
- Юу нэмэх, юу засах, юу дуусгахыг ойлгомжтой танина.`;

export async function transcribeAudio(audioUri) {
  const form = new FormData();
  form.append('audio', {
    uri: audioUri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/stt`, {
      method: 'POST',
      body: form,
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`STT HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    const data = JSON.parse(text);
    return { text: (data.text || '').trim(), warning: data.warning || null };
  } finally {
    clearTimeout(t);
  }
}

export async function classifyCommand(userText) {
  const data = await postJson('/api/chat', {
    text: userText,
    system_prompt: SYSTEM_PROMPT,
    tools: VOCA_TOOLS,
  });
  return {
    action: data.action || 'general_response',
    params: data.params || {},
    rawMessage: data.rawMessage || null,
  };
}

export async function chatFreeform(userText, systemPrompt = '') {
  const data = await postJson('/api/chat', {
    text: userText,
    system_prompt: systemPrompt,
  });
  return data;
}

export async function synthesizeSpeech(text, { voice = 'FEMALE3v2', speed = 1.0 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed, normalize: true }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TTS HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }
    const blob = await res.blob();
    return blob;
  } finally {
    clearTimeout(t);
  }
}

export async function sendEmail({ to, subject, body, cc, bcc }) {
  return postJson('/api/send-email', { to, subject, body, cc, bcc });
}

export async function getBriefing({ period, tasks = [], events = [], userName = 'Хэрэглэгч' }) {
  return postJson('/api/briefing', {
    period,
    tasks,
    events,
    user_name: userName,
  });
}

export { VOCA_TOOLS, SYSTEM_PROMPT };
