"""Prepare the supplied avatar clip for the alternative landing page.

Usage: python scripts/prepare-landing-avatar.py --source /absolute/path/video.mp4
Requires imageio-ffmpeg and Pillow in the active Python environment.
The source remains untouched; timing, framing, and spoken audio are preserved.
"""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import imageio_ffmpeg
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    root = Path(__file__).resolve().parents[1]
    output = root / 'src/assets/videos/landing-alternative/start-here-avatar.mp4'
    poster = root / 'src/assets/img/landing-alternative/start-here-avatar.jpg'
    small_poster = poster.with_name('start-here-avatar-small.jpg')
    if source == output:
        raise ValueError('Source and destination must be different files.')
    output.parent.mkdir(parents=True, exist_ok=True)
    poster.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([
        ffmpeg, '-nostdin', '-v', 'error', '-y', '-i', str(source),
        '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264',
        '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-profile:v', 'high', '-c:a', 'copy', '-movflags', '+faststart',
        str(output),
    ], check=True)
    subprocess.run([
        ffmpeg, '-nostdin', '-v', 'error', '-y', '-ss', '1', '-i', str(output),
        '-frames:v', '1', '-q:v', '2', str(poster),
    ], check=True)
    with Image.open(poster) as image:
        image.thumbnail((640, 640))
        image.save(small_poster, quality=86)
    provenance = {
        'source_filename': source.name,
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'web_video': str(output.relative_to(root)),
        'poster_source_time_seconds': 1,
        'treatment': 'Full original framing and timing; AAC audio copied unchanged. H.264 yuv420p, CRF 20, faststart for browser compatibility.',
    }
    (root / 'docs/design/landing-avatar-media.json').write_text(
        json.dumps(provenance, indent=2) + '\n'
    )
    print(f'Prepared {output.relative_to(root)} ({output.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
