#!/usr/bin/env bash
# Builds TikTok cuts of the site's Reels: original video + 2.5s TikTok end card
# (TikTok handle instead of the Instagram one), normalized to 30fps with an audio track.
# Usage: bash build.sh   (run from spasd-site/tiktok/render)
set -euo pipefail
SRC=../../public/videos
OUT=../out
mkdir -p "$OUT"
for name in reel-launch reel-myth reel-tutorial reel-newsletter reel-caregiver-survey; do
  in="$SRC/$name.mp4"
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$in" | grep -q .; then
    amap="[0:a]aresample=44100,aformat=channel_layouts=stereo[a0]"
  else
    amap="anullsrc=r=44100:cl=stereo,atrim=0:$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")[a0]"
  fi
  ffmpeg -v error -y -i "$in" -loop 1 -t 2.5 -i endcard.png -f lavfi -t 2.5 -i anullsrc=r=44100:cl=stereo \
    -filter_complex "[0:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1[v0];\
[1:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.3[v1];\
$amap;[2:a]anull[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 128k \
    -movflags +faststart "$OUT/tiktok-$name.mp4"
  echo "built $OUT/tiktok-$name.mp4"
done
