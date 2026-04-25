# Voca AI patch — voice command 100% execution + larger voice button

## Changed files

Backend:
- `voca-api/api.py`
  - CORS added
  - STT accepts `audio` or `file`
  - short audio returns `text: ""` instead of 502
  - `/api/send-email` Gmail SMTP endpoint added
  - `/api/chat`, `/api/tts`, `/api/briefing` retained

Frontend:
- `vocafront/src/services/openaiService.js`
  - action tools added: `list_tasks`, `get_today_events`, `complete_task`
  - send email uses backend `/api/send-email`
  - better STT/chat error logging
- `vocafront/src/hooks/useVoiceCommand.js`
  - real action execution flow added
  - progress: 15 → 40 → 65 → 100
  - commands now execute calendar/task/reminder/email/list actions
- `vocafront/src/screens/VoiceScreen.js`
  - execution state/progress UI added
  - mic button increased from 88 to 132
- `vocafront/src/components/MicOrb.js`
  - larger hit area and bigger icon effects

## Apply on server

```bash
cd /opt/mlops/services/voca
cp voca-api/api.py voca-api/api.py.bak_$(date +%Y%m%d_%H%M%S)
cp vocafront/src/services/openaiService.js vocafront/src/services/openaiService.js.bak_$(date +%Y%m%d_%H%M%S)
cp vocafront/src/hooks/useVoiceCommand.js vocafront/src/hooks/useVoiceCommand.js.bak_$(date +%Y%m%d_%H%M%S)
cp vocafront/src/screens/VoiceScreen.js vocafront/src/screens/VoiceScreen.js.bak_$(date +%Y%m%d_%H%M%S)
cp vocafront/src/components/MicOrb.js vocafront/src/components/MicOrb.js.bak_$(date +%Y%m%d_%H%M%S)
```

Copy patched files to same paths.

## Gmail env

Add to `/opt/mlops/services/voca/voca-api/.env`:

```env
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_google_app_password
```

Restart backend:

```bash
cd /opt/mlops/services/voca/voca-api
/usr/bin/python3 -m py_compile api.py
systemctl restart mlops-voca-api.service
journalctl -u mlops-voca-api.service -n 100 --no-pager
```

Restart Expo:

```bash
cd /opt/mlops/services/voca/vocafront
node -c src/services/openaiService.js
node -c src/hooks/useVoiceCommand.js
node -c src/screens/VoiceScreen.js
node -c src/components/MicOrb.js
npx expo start --host tunnel -c
```

## Test voice commands

- `Маргааш 15 цагт уулзалт товло`
- `Өнөөдөр ямар уулзалт байна`
- `Надад ямар ажил байна`
- `Тайлан бичих ажил нэм`
- `Тайлан бичих ажлыг дуусга`
- `test@example.com руу Сайн байна уу гэсэн гарчигтай тест мэйл илгээ`
