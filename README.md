# ✨ Hand & Face Particle Tracking

Real-time particle effects yang ngikutin tangan dan muka pakai MediaPipe.

## 🚀 Quick Start

1. Download `index.html` dan `app.js`
2. Taruh di folder yang sama
3. Buka `index.html` di browser
4. Klik **Start Camera** → izinkan akses kamera
5. Tunjukin tangan & muka ke kamera!

## 🎮 Controls

| Setting          | Fungsi                              |
| ---------------- | ----------------------------------- |
| Show Webcam      | Toggle tampilan kamera              |
| Webcam Opacity   | Transparansi kamera (0-100%)        |
| Particle Size    | Ukuran particle                     |
| Trail Length     | Panjang ekor particle               |
| Particle Density | Kepadatan particle                  |
| Glow Intensity   | Intensitas glow effect              |
| Color Theme      | Gold, Cyan, Magenta, Green, Rainbow |

## 💡 Tips Tracking Akurat

- Pencahayaan cukup (hindari backlight)
- Background kontras dengan kulit
- Jarak tangan ~30-80cm dari kamera
- Hindari gerakan terlalu cepat

## 🛠️ Tech Stack

- **MediaPipe Hands** — 21 landmark per tangan
- **MediaPipe Face Mesh** — 468 landmark wajah
- **Canvas 2D** — Rendering particle & trails

## 📝 License

MIT
