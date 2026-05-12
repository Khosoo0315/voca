import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MicOrb from '../components/MicOrb';
import useVoiceCommand, { STAGES } from '../hooks/useVoiceCommand';

const STAGE_LABEL = {
  [STAGES.idle]: 'Микрофон дээр удаан дарж яриагаа эхлүүл',
  [STAGES.recording]: 'Сонсож байна...',
  [STAGES.transcribing]: 'Бичвэрт хөрвүүлж байна...',
  [STAGES.thinking]: 'Бодож байна...',
  [STAGES.executing]: 'Гүйцэтгэж байна...',
  [STAGES.speaking]: 'Хариу хэлж байна...',
  [STAGES.done]: 'Бэлэн.',
  [STAGES.error]: 'Алдаа гарлаа.',
};

export default function VoiceScreen() {
  const v = useVoiceCommand();
  const label = STAGE_LABEL[v.stage] || '';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Voca AI</Text>
        <Text style={styles.subtitle}>Монгол хэлтэй дуут туслах</Text>
      </View>

      <View style={styles.orbWrap}>
        <MicOrb
          active={v.isRecording}
          busy={v.isBusy}
          disabled={v.isBusy}
          onPressIn={v.startRecording}
          onPressOut={v.stopAndExecute}
        />
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${v.progress}%` }]} />
        </View>
        <Text style={styles.stageLabel}>{label}</Text>
      </View>

      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {!!v.transcript && (
          <View style={styles.bubble}>
            <Text style={styles.bubbleRole}>Та</Text>
            <Text style={styles.bubbleText}>{v.transcript}</Text>
          </View>
        )}
        {!!v.response && (
          <View style={[styles.bubble, styles.bubbleAi]}>
            <Text style={styles.bubbleRole}>Voca</Text>
            <Text style={styles.bubbleText}>{v.response}</Text>
          </View>
        )}
        {!!v.error && (
          <View style={[styles.bubble, styles.bubbleError]}>
            <Text style={styles.bubbleRole}>Алдаа</Text>
            <Text style={styles.bubbleText}>{v.error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: { alignItems: 'center', marginBottom: 12 },
  title: { color: '#f4f6fb', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#8a93a6', fontSize: 14, marginTop: 4 },
  orbWrap: { alignItems: 'center', marginVertical: 24 },
  progressBar: {
    width: '70%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1f2c',
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#7dd3fc' },
  stageLabel: { color: '#c2c8d6', marginTop: 12, fontSize: 14 },
  transcript: { flex: 1, marginTop: 12 },
  transcriptContent: { paddingBottom: 40 },
  bubble: {
    backgroundColor: '#141926',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  bubbleAi: { backgroundColor: '#162033', borderColor: '#1f3050', borderWidth: 1 },
  bubbleError: { backgroundColor: '#2a1417', borderColor: '#5b2026', borderWidth: 1 },
  bubbleRole: { color: '#8a93a6', fontSize: 12, marginBottom: 4 },
  bubbleText: { color: '#eef1f8', fontSize: 16, lineHeight: 22 },
});
