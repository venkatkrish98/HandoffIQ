// Offline narration with Piper (MIT) and the en_US libritts_r voice (CC BY 4.0). Usage: node tts.mjs [speaker]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const speaker = process.argv[2] || '40';
const scenes = JSON.parse(fs.readFileSync('scenes.json', 'utf8'));
const dur = {};
for (const [id, text] of Object.entries(scenes)) {
  const out = `out/audio/${id}.wav`;
  execFileSync('.piper/piper/piper.exe', ['--model', '.piper/voice.onnx', '--speaker', speaker, '--length_scale', '1.05', '--output_file', out], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
  dur[id] = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
}
fs.writeFileSync('out/audio/durations.json', JSON.stringify(dur, null, 2));
console.log(dur, 'TOTAL', Object.values(dur).reduce((a, b) => a + b, 0).toFixed(1));
