import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  transcribeAudio,
  classifyCommand,
  synthesizeSpeech,
  sendEmail,
} from '../services/openaiService';
import {
  addTask,
  addEvent,
  addReminder,
  listTasks,
  getTodayEvents,
  completeTask,
} from '../services/storage';

const STAGES = {
  idle: 'idle',
  recording: 'recording',
  transcribing: 'transcribing',
  thinking: 'thinking',
  executing: 'executing',
  speaking: 'speaking',
  done: 'done',
  error: 'error',
};

const STAGE_PROGRESS = {
  idle: 0,
  recording: 5,
  transcribing: 15,
  thinking: 40,
  executing: 65,
  speaking: 90,
  done: 100,
  error: 100,
};

function describeList(items, kind) {
  if (!items.length) {
    return kind === 'tasks'
      ? 'Одоогоор хийх ажил алга.'
      : 'Өнөөдөр төлөвлөсөн уулзалт алга.';
  }
  if (kind === 'tasks') {
    return `Та ${items.length} ажилтай: ${items.map((t) => t.title).join(', ')}.`;
  }
  return `Өнөөдөр ${items.length} уулзалттай: ${items
    .map((e) => `${e.startTime} ${e.title}`)
    .join(', ')}.`;
}

async function executeAction(action, params) {
  switch (action) {
    case 'create_event': {
      const ev = await addEvent(params);
      return `${ev.date}-ны ${ev.startTime} цагт "${ev.title}" уулзалт нэмлээ.`;
    }
    case 'get_today_events': {
      const events = await getTodayEvents();
      return describeList(events, 'events');
    }
    case 'add_task': {
      const t = await addTask(params);
      return `"${t.title}" ажлыг жагсаалтад нэмлээ.`;
    }
    case 'list_tasks': {
      const tasks = await listTasks();
      return describeList(tasks, 'tasks');
    }
    case 'complete_task': {
      const done = await completeTask(params);
      if (!done) return `"${params.title}" нэртэй ажил олдсонгүй.`;
      return `"${done.title}" ажлыг дууссан гэж тэмдэглэлээ.`;
    }
    case 'add_reminder': {
      const r = await addReminder(params);
      return `"${r.title}" сануулгыг хадгаллаа.`;
    }
    case 'send_email': {
      await sendEmail(params);
      return `${params.to} хаягт "${params.subject}" гарчигтай имэйл илгээлээ.`;
    }
    case 'general_response':
      return params?.message || 'Зөвшөөрөгдсөн.';
    default:
      return `Ойлгосонгүй (${action}).`;
  }
}

async function playWavBlob(blob, soundRef) {
  const reader = new FileReader();
  const dataUriP = new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
  });
  reader.readAsDataURL(blob);
  const dataUri = await dataUriP;
  const base64 = String(dataUri).split(',')[1] || '';
  const filePath = `${FileSystem.cacheDirectory}voca-tts-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (soundRef.current) {
    try {
      await soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: filePath },
    { shouldPlay: true },
  );
  soundRef.current = sound;
  await new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) resolve();
    });
  });
}

export default function useVoiceCommand() {
  const [stage, setStage] = useState(STAGES.idle);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);

  const recordingRef = useRef(null);
  const soundRef = useRef(null);

  const setStageAndProgress = useCallback((s) => {
    setStage(s);
    setProgress(STAGE_PROGRESS[s] ?? 0);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setResponse('');
    setError(null);
    setStageAndProgress(STAGES.idle);
  }, [setStageAndProgress]);

  const startRecording = useCallback(async () => {
    try {
      reset();
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) throw new Error('Микрофон ашиглах эрх олгогдоогүй.');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setStageAndProgress(STAGES.recording);
    } catch (e) {
      setError(e.message || String(e));
      setStageAndProgress(STAGES.error);
    }
  }, [reset, setStageAndProgress]);

  const stopAndExecute = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Дуу бичлэг файл олдсонгүй.');

      setStageAndProgress(STAGES.transcribing);
      const stt = await transcribeAudio(uri);
      const userText = stt.text;
      setTranscript(userText);
      if (stt.warning) setError(stt.warning);
      if (!userText) {
        setResponse(stt.warning || 'Юу хэлснийг ялгаж чадсангүй.');
        setStageAndProgress(STAGES.done);
        return;
      }

      setStageAndProgress(STAGES.thinking);
      const { action, params } = await classifyCommand(userText);

      setStageAndProgress(STAGES.executing);
      const resultText = await executeAction(action, params);
      setResponse(resultText);

      setStageAndProgress(STAGES.speaking);
      try {
        const blob = await synthesizeSpeech(resultText);
        await playWavBlob(blob, soundRef);
      } catch (ttsErr) {
        // Speech synthesis failure shouldn't fail the whole command.
        setError(`TTS алдаа: ${ttsErr.message || ttsErr}`);
      }

      setStageAndProgress(STAGES.done);
    } catch (e) {
      setError(e.message || String(e));
      setStageAndProgress(STAGES.error);
    }
  }, [setStageAndProgress]);

  const cancel = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
    }
    reset();
  }, [reset]);

  useEffect(
    () => () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    },
    [],
  );

  return {
    stage,
    progress,
    transcript,
    response,
    error,
    isRecording: stage === STAGES.recording,
    isBusy: ![STAGES.idle, STAGES.done, STAGES.error].includes(stage)
      && stage !== STAGES.recording,
    startRecording,
    stopAndExecute,
    cancel,
    reset,
  };
}

export { STAGES };
