#!/usr/bin/env bash
# Makes the web versions of the logo animation from the ProRes master.
#   ./scripts/make-intro.sh path/to/Naav_logo_animaiton_2_V2.mov
# Writes to assets/video/: intro-portrait.{mp4,webm} and intro-poster.jpg.
# One portrait video serves every screen: the page fades its edges into the background, so laptops
# need no separate landscape version.
# No audio (browsers only autoplay muted video). Aims for under 1 MB each.
set -euo pipefail
TAGS="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"

SRC="${1:?usage: make-intro.sh <master.mov>}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/video"
mkdir -p "$OUT"

# Portrait 1080x1920 for phones
ffmpeg -y -i "$SRC" -an -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  $TAGS -c:v libx264 -preset slow -crf 22 -profile:v high -movflags +faststart "$OUT/intro-portrait.mp4"
ffmpeg -y -i "$SRC" -an -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  $TAGS -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -deadline good "$OUT/intro-portrait.webm"

# Poster: the last frame, shown while the video loads
ffmpeg -y -sseof -0.1 -i "$SRC" -frames:v 1 -update 1 -vf "scale=1080:1920" -q:v 3 "$OUT/intro-poster.jpg"

ls -lh "$OUT"
echo "Over 1 MB? Raise -crf by 2 and run again."
