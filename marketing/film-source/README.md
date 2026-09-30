# SD Wise film source

Frame-accurate marketing film (83 s, 1080p30). `index.html` exposes `render(t)`; `capture.js` screenshots each frame with Playwright and pipes them to ffmpeg; `music.py` synthesizes the original soundtrack (numpy + scipy).

```bash
NODE_PATH=$(npm root -g) node capture.js video 0 83 silent.mp4   # frames -> silent.mp4
python3 music.py                                                  # -> music.wav
ffmpeg -i silent.mp4 -i music.wav -c:v copy -c:a aac -b:a 256k -shortest ../sd-wise-film-julien.mp4
```

Preview a single moment: open `index.html?t=42`.
