#!/usr/bin/env bash
# Makes the web versions of the logo animation from the ProRes master.
#   ./scripts/make-intro.sh path/to/Naav_logo_animaiton_2_V2.mov
# Writes to assets/video/: intro-portrait.{mp4,webm}, intro-landscape.{mp4,webm}, intro-poster.jpg
# No audio (browsers only autoplay muted video). Aims for under 1 MB each.
# Then add data-video="assets/video/intro" to the #intro element in index.html.
set -euo pipefail

SRC="${1:?usage: make-intro.sh <master.mov>}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/video"
BG="0xECEAE6"   # the video's own background, same as the page
mkdir -p "$OUT"

# Portrait 1080x1920 for phones
ffmpeg -y -i "$SRC" -an -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 28 -profile:v high -movflags +faststart "$OUT/intro-portrait.mp4"
ffmpeg -y -i "$SRC" -an -vf "scale=1080:1920:flags=lanczos" \
  -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good "$OUT/intro-portrait.webm"

# Landscape 1920x1080 for laptops: the animation centred on a bone frame, so the logo isn't tiny
LAND="scale=-2:1080:flags=lanczos,pad=1920:1080:(ow-iw)/2:0:color=$BG"
ffmpeg -y -i "$SRC" -an -vf "$LAND,format=yuv420p" \
  -c:v libx264 -preset slow -crf 28 -profile:v high -movflags +faststart "$OUT/intro-landscape.mp4"
ffmpeg -y -i "$SRC" -an -vf "$LAND" \
  -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good "$OUT/intro-landscape.webm"

# Poster: the last frame, shown while the video loads
ffmpeg -y -sseof -0.1 -i "$SRC" -frames:v 1 -vf "scale=1080:1920" -q:v 3 "$OUT/intro-poster.jpg"

ls -lh "$OUT"
echo "Over 1 MB? Raise -crf by 2 and run again."
