# DeepFilter Example

Minimal Create React App project that wires the [`deepfilternet3-noise-filter`](https://www.npmjs.com/package/deepfilternet3-noise-filter) package into a simple UI. The page asks for microphone access, routes the stream through DeepFilterNet3 for noise suppression, and plays the processed audio back so you can preview the effect in real time.

---

## Features

- Start/stop buttons to control microphone capture.
- Slider to change the suppression level (0‑100).
- Toggle to enable/disable noise reduction.
- Status banner that reflects every stage of the setup (requesting mic, loading processor, running, errors, etc.).
- Automatic cleanup of the audio graph when you stop or unmount the app.

Everything lives in `src/App.js`; the heavy lifting is done by the published `deepfilternet3-noise-filter` package.

---

## Getting Started

```bash
npm install
npm start
```

Open http://localhost:3000, allow microphone access, and press **Start**. Use headphones to avoid feedback.

| Command | Description |
| --- | --- |
| `npm start` | Run the CRA dev server |
| `npm run build` | Create a production bundle |
| `npm test` | Launch the CRA test runner |

---

## Configuration Notes

- The CDN for the DeepFilterNet assets is configured inside `src/App.js` (see the `assetConfig.cdnUrl` field). Point it to your own mirror if needed.
- If your browser blocks autoplay, click the Audio element’s play button after starting the pipeline.
- When you tweak the suppression slider or toggle the checkbox, the app forwards the change to the current processor instance without restarting the stream.

---

## License

MIT © 2025 Nguyen Phu Vinh. DeepFilterNet binaries/models you fetch remain under their original license.
