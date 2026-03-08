// routes/voice.js
// VoiceAgent routes – handle Speech‑to‑Text and Text‑to‑Speech via ElevenLabs.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../middleware/multerConfig');
const { speechToText, textToSpeech } = require('../utils/elevenLabsClient');

/**
 * POST /api/voice/stt
 * Accepts multipart/form-data with field "audio" (wav file).
 * Returns { transcript: string }
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file required' });
  }
  try {
    const transcript = await speechToText(req.file.buffer);
    res.json({ transcript });
  } catch (err) {
    console.error('[Voice STT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/voice/tts
 * Body: { text: string }
 * Returns audio/mp3 stream.
 */
router.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }
  try {
    const audioBuffer = await textToSpeech(text);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    console.error('[Voice TTS]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
