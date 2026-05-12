# Vocafront — Voca AI mobile

Expo / React Native клиент. Монгол хэлээр дуу дамжуулан tasks, events,
reminders, email командуудыг гүйцэтгэдэг.

## Тохиргоо

1. `app.json` дээр `extra.API_BASE`-ийг backend хаягаар (жишээ нь
   `https://voca.example.com`) солих, эсвэл хөгжүүлэлтэд `http://<LAN-IP>:8000`.
2. Backend дээр `OPENAI_API_KEY`, `CHIMEGE_STT_TOKEN`, `CHIMEGE_TTS_TOKEN`,
   `GMAIL_USER`, `GMAIL_APP_PASSWORD` тохируулах.

## Хөгжүүлэлт

```bash
cd vocafront
npm install
npm run start:tunnel     # утсаараа Expo Go ашиглан холбогдоход амар
```

Эсвэл:

```bash
npm run android
npm run ios
npm run web
```

## Архитектур

```
App.js
└── src/
    ├── config.js                 API_BASE
    ├── components/MicOrb.js      том микрофон товч (132 px)
    ├── hooks/useVoiceCommand.js  record → STT → chat → execute → TTS
    ├── screens/VoiceScreen.js    үндсэн дэлгэц
    └── services/
        ├── openaiService.js      STT/TTS/chat backend wrapper + tool definitions
        └── storage.js            AsyncStorage tasks/events/reminders
```

## Жишээ командууд

- `Маргааш 15 цагт уулзалт товло`
- `Өнөөдөр ямар уулзалт байна`
- `Надад ямар ажил байна`
- `Тайлан бичих ажил нэм`
- `Тайлан бичих ажлыг дуусга`
- `test@example.com руу Сайн байна уу гэсэн гарчигтай тест мэйл илгээ`
