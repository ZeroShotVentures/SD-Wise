# SD Wise launch video

`../sd-wise-launch.mp4` is a 72 s, 1920×1080, 60 fps marketing film. It follows one story through the product: Listen, Connect, Reason, Respect, Route, Learn. The story uses the fixture data in `src/lib/graph/fixtures.ts` (Kras renewal, v3 launch, the indexation blocker).

- `index.html` holds the whole film as one timeline. Open `index.html#12.5` in a browser to see any second.
- `render.js <fps> <out.mp4> [from] [to]` screenshots every frame with Playwright and pipes them into ffmpeg.
- `music.py` synthesises the 120 BPM soundtrack (`music.wav`). Swap it for a licensed track if you like; the scene cuts land on the beat grid (see `T` at the top of the script in `index.html`).

Mux: `ffmpeg -i video.mp4 -i music.wav -c:v copy -c:a aac -shortest sd-wise-launch.mp4`
