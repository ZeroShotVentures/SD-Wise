# SD Wise launch video

`../sd-wise-launch.mp4` is a 47 s, 1920×1080, 60 fps marketing film. It has no product demo, only the vision.

- `index.html` holds the whole film as one timeline. Open `index.html#12.5` in a browser to see any second.
- `render.js <fps> <out.mp4> [from] [to]` screenshots every frame with Playwright and pipes them into ffmpeg.
- `music.py` synthesises the 120 BPM soundtrack (`music.wav`). Swap it for a licensed track if you like; the scene cuts land on the beat grid (10.0, 12.5, 24.5, 31, 38, 40.5, 42.5 s).

Mux: `ffmpeg -i video.mp4 -i music.wav -c:v copy -c:a aac -shortest sd-wise-launch.mp4`
