// utils/elevenLabsClient.js
// Wrapper for ElevenLabs Speech‑to‑Text and Text‑to‑Speech APIs.
// Reads ELEVENLABS_API_KEY from .env. No keys are exposed to the frontend.

const axios = require('axios');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.warn('[ElevenLabs] ELEVENLABS_API_KEY not set – voice features will be disabled.');
}

const client = axios.create({
  baseURL: 'https://api.elevenlabs.io/v1',
  headers: { 'xi-api-key': apiKey },
  timeout: 15000,
});

/**
 * Speech‑to‑Text – send audio buffer, get transcript.
 * @param {Buffer} audioBuffer - raw audio (e.g., wav) buffer.
 * @returns {Promise<string>} transcript text.
 */
async function speechToText(audioBuffer) {
  if (!apiKey) throw new Error('ElevenLabs API key missing');
  const response = await client.post('/speech-to-text', audioBuffer, {
    headers: { 'Content-Type': 'audio/wav' },
  });
  return response.data.text;
}

/**
 * Text‑to‑Speech – send text, receive MP3 audio buffer.
 * @param {string} text - text to synthesize.
 * @returns {Promise<Buffer>} MP3 audio buffer.
 */
async function textToSpeech(text) {
  if (!apiKey) throw new Error('ElevenLabs API key missing');
  const response = await client.post(
    '/text-to-speech/eleven_multilingual_v2',
    { text },
    { responseType: 'arraybuffer', headers: { 'Content-Type': 'application/json' } }
  );
  return Buffer.from(response.data);
}

module.exports = { speechToText, textToSpeech };
