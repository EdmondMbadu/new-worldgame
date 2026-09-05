import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
const run = promisify(execFile);

export function frameScore(pixels: Uint8Array): number {
  if (!pixels.length) return 0;
  let visible = 0; let edges = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > 20 && pixels[i] < 245) visible++;
    if (i % 96) edges += Math.abs(pixels[i] - pixels[i - 1]);
  }
  return visible / pixels.length * (1 + edges / pixels.length);
}

export interface ExtractedVideoFrame { bytes: Buffer; seconds: number; duration: number; }
/** Decode only a local, downloaded object. No remote protocols or shell commands. */
export async function extractSavedVideoFrame(input: string, directory: string): Promise<ExtractedVideoFrame> {
  const ffmpeg = process.env.NWG_FFMPEG_PATH || 'ffmpeg';
  const inputOptions = ['-hide_banner', '-nostdin', '-threads', '1', '-protocol_whitelist', 'file,pipe'];
  const info = await run(ffmpeg, [...inputOptions, '-i', input, '-t', '0', '-f', 'null', '-'], {
    timeout: 5000, maxBuffer: 1024 * 1024, killSignal: 'SIGKILL',
  });
  const match = String(info.stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error('Video duration could not be read');
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid video duration');
  // Briefings commonly introduce the presenter before switching to B-roll.
  // Prefer an early usable frame; detail alone otherwise favors scenery.
  const points = [...new Set([2, 5, duration * .12, duration * .35, duration * .65]
    .map(seconds => Math.max(0, Math.min(duration - .05, seconds))))];
  let best: { path: string; seconds: number; score: number } | undefined;
  for (let i = 0; i < points.length; i++) {
    const output = join(directory, `frame-${i}.jpg`);
    const frame = await run(ffmpeg, [
      ...inputOptions, '-ss', String(points[i]), '-i', input,
      '-map', '0:v:0', '-frames:v', '1', '-vf', 'format=yuvj444p,scale=1200:675:force_original_aspect_ratio=decrease,pad=1200:675:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-q:v', '4', '-threads', '1', '-y', output,
      '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=96:54,format=gray', '-threads', '1', '-f', 'rawvideo', 'pipe:1',
    ], { timeout: 7000, maxBuffer: 1024 * 1024, encoding: 'buffer', killSignal: 'SIGKILL' });
    const score = frameScore(frame.stdout);
    if (!best || score > best.score) best = { path: output, seconds: points[i], score };
    if (score >= .15) break;
  }
  if (!best || best.score < .15) throw new Error('No clear video frame found');
  const bytes = await readFile(best.path);
  if (bytes.length > 1024 * 1024) throw new Error('Generated thumbnail exceeds size limit');
  return { bytes, seconds: best.seconds, duration };
}
