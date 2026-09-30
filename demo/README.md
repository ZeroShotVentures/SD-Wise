# SD Wise demo video

`sd-wise-demo.mp4` is a 30-second marketing demo (1920x1080, no audio). It mixes animated title cards with real footage of the app running on the mock graph in `src/lib/graph/fixtures.ts`.

Storyline: Victor asks "What's the 2027 indexation, and is it blocking v3?". He gets the part he's allowed to see, and SD Wise points him to An, who owns the private fact. An gets the question with a drafted answer and sends it, and the answer lands in Victor's graph as a new node.

## Regenerate

With the app running on `localhost:3000` (fresh `pnpm dev`, because the graph store lives in memory) and a Victor account (`victor@sdworx.test` / `demo-password-123`):

```bash
cd demo
npm i --no-save playwright   # uses the preinstalled Chromium
node record.mjs              # title cards + app scenes -> segs/
pip install imageio-ffmpeg   # ffmpeg with libx264
python3 build.py             # -> sd-wise-demo.mp4
```

`record.mjs` signs up An if needed, injects a fake cursor and captions, and records each scene with the Chrome DevTools screencast. `build.py` speeds up and trims each scene, then crossfades them together.

Inter is bundled under the SIL Open Font License.
