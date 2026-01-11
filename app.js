// ============================================
// Hand & Face Particle Tracking
// Using MediaPipe for real-time tracking
// ============================================

// DOM Elements
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");
const loading = document.getElementById("loading");

// ============================================
// Settings & Configuration
// ============================================
const settings = {
  particleSize: 3,
  trailLength: 15,
  density: 2,
  glowIntensity: 20,
  colorTheme: "gold",
  showWebcam: true,
  webcamOpacity: 0.6,
};

// Color themes
const colorThemes = {
  gold: ["#ffd700", "#ff8c00", "#ffaa00", "#ffcc00"],
  cyan: ["#00ffff", "#0080ff", "#00aaff", "#00ddff"],
  magenta: ["#ff00ff", "#ff0080", "#ff00aa", "#ff44ff"],
  green: ["#00ff88", "#00ff00", "#44ff44", "#00ffaa"],
  rainbow: [
    "#ff0000",
    "#ff8800",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#0088ff",
    "#ff00ff",
  ],
};

// Face landmark indices for key points
const FACE_KEY_INDICES = [
  // Face contour
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
  // Lips outer
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
  // Lips inner
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
  // Left eye
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  // Right eye
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
  398,
  // Left eyebrow
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
  // Right eyebrow
  300, 293, 334, 296, 336, 285, 295, 282, 283, 276,
  // Nose
  1, 2, 98, 327, 168, 6, 197, 195, 5, 4, 19, 94, 141, 370,
];

// ============================================
// Particle Class
// ============================================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.trail = [];
    this.vx = 0;
    this.vy = 0;
  }

  update(targetX, targetY) {
    // More responsive movement - less smoothing for snappier tracking
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    this.vx += dx * 0.35; // Increased from 0.18
    this.vy += dy * 0.35;

    this.vx *= 0.7; // Less damping
    this.vy *= 0.7;

    this.x += this.vx;
    this.y += this.vy;

    // Update trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > settings.trailLength) {
      this.trail.pop();
    }
  }

  draw(ctx) {
    const size = settings.particleSize;
    const glow = settings.glowIntensity;

    // Draw trail with gradient opacity
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const progress = i / this.trail.length;
      const alpha = (1 - progress) * 0.7;
      const trailSize = size * (1 - progress * 0.6);

      ctx.beginPath();
      ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(this.color, alpha);
      ctx.fill();
    }

    // Draw main particle with glow effect
    ctx.shadowBlur = glow;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

// ============================================
// Particle Manager
// ============================================
class ParticleManager {
  constructor() {
    this.handParticles = [];
    this.faceParticles = [];
  }

  getColor(index) {
    const colors = colorThemes[settings.colorTheme];
    return colors[index % colors.length];
  }

  updateHands(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.handParticles = [];
      return;
    }

    const allPoints = [];

    landmarks.forEach((hand, handIndex) => {
      hand.forEach((point, idx) => {
        // Base point
        allPoints.push({
          x: point.x * canvas.width,
          y: point.y * canvas.height,
          idx: handIndex * 21 + idx,
        });

        // Additional density particles
        for (let d = 1; d < settings.density; d++) {
          allPoints.push({
            x: point.x * canvas.width + (Math.random() - 0.5) * 12 * d,
            y: point.y * canvas.height + (Math.random() - 0.5) * 12 * d,
            idx: handIndex * 21 + idx + d * 100,
          });
        }
      });
    });

    this.syncParticles(this.handParticles, allPoints, "hand");
  }

  updateFace(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.faceParticles = [];
      return;
    }

    const allPoints = [];

    landmarks.forEach((face, faceIndex) => {
      FACE_KEY_INDICES.forEach((idx, i) => {
        if (face[idx]) {
          // Base point
          allPoints.push({
            x: face[idx].x * canvas.width,
            y: face[idx].y * canvas.height,
            idx: faceIndex * 500 + i,
          });

          // Additional density particles (less than hands)
          const faceDensity = Math.ceil(settings.density / 2);
          for (let d = 1; d < faceDensity; d++) {
            allPoints.push({
              x: face[idx].x * canvas.width + (Math.random() - 0.5) * 8 * d,
              y: face[idx].y * canvas.height + (Math.random() - 0.5) * 8 * d,
              idx: faceIndex * 500 + i + d * 200,
            });
          }
        }
      });
    });

    this.syncParticles(this.faceParticles, allPoints, "face");
  }

  syncParticles(particleArray, points, type) {
    // Create new particles if needed
    while (particleArray.length < points.length) {
      const idx = particleArray.length;
      const point = points[idx];
      const colorOffset = type === "face" ? 50 : 0;
      particleArray.push(
        new Particle(
          point?.x || canvas.width / 2,
          point?.y || canvas.height / 2,
          this.getColor(idx + colorOffset),
        ),
      );
    }

    // Update existing particles
    points.forEach((point, i) => {
      if (particleArray[i]) {
        particleArray[i].update(point.x, point.y);
      }
    });

    // Remove excess particles
    particleArray.length = points.length;
  }

  updateColors() {
    this.handParticles.forEach((p, i) => {
      p.color = this.getColor(i);
    });
    this.faceParticles.forEach((p, i) => {
      p.color = this.getColor(i + 50);
    });
  }

  draw(ctx) {
    // Draw face particles first (behind hands)
    this.faceParticles.forEach((p) => p.draw(ctx));
    // Draw hand particles on top
    this.handParticles.forEach((p) => p.draw(ctx));
  }

  getStats() {
    return {
      hands: this.handParticles.length,
      face: this.faceParticles.length,
      total: this.handParticles.length + this.faceParticles.length,
    };
  }
}

// ============================================
// MediaPipe Setup
// ============================================
let hands, faceMesh;
let handResults = null;
let faceResults = null;
const particleManager = new ParticleManager();

async function initMediaPipe() {
  loading.style.display = "block";
  status.textContent = "Loading Hand Tracking Model...";

  try {
    // Initialize Hands
    hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1, // Full model for better accuracy
      minDetectionConfidence: 0.4, // Lower = easier to detect initially
      minTrackingConfidence: 0.4, // Lower = keeps tracking even with partial occlusion
    });

    hands.onResults((results) => {
      handResults = results.multiHandLandmarks;
    });

    await hands.initialize();
    status.textContent = "Loading Face Tracking Model...";

    // Initialize Face Mesh
    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // More accurate lips & eyes
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });

    faceMesh.onResults((results) => {
      faceResults = results.multiFaceLandmarks;
    });

    await faceMesh.initialize();

    loading.style.display = "none";
    status.textContent = "Models loaded! Click Start Camera";
    startBtn.disabled = false;
  } catch (error) {
    console.error("MediaPipe initialization error:", error);
    status.textContent = "Error loading models. Please refresh.";
    loading.style.display = "none";
  }
}

// ============================================
// Camera & Rendering
// ============================================
async function startCamera() {
  try {
    status.textContent = "Requesting camera access...";

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 }, // Higher resolution
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }, // Smooth frame rate
        facingMode: "user",
      },
    });

    video.srcObject = stream;
    await video.play();

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    startBtn.textContent = "✓ Camera Active";
    startBtn.disabled = true;
    status.textContent = "Tracking active - show your hands and face!";

    // Start the render loop
    requestAnimationFrame(processFrame);
  } catch (err) {
    console.error("Camera error:", err);
    if (err.name === "NotAllowedError") {
      status.textContent =
        "Camera access denied. Please allow camera access and refresh.";
    } else {
      status.textContent = "Camera error: " + err.message;
    }
  }
}

async function processFrame() {
  if (video.readyState >= 2) {
    // Send frame to MediaPipe models
    try {
      await Promise.all([
        hands.send({ image: video }),
        faceMesh.send({ image: video }),
      ]);
    } catch (e) {
      console.error("Processing error:", e);
    }

    // Update particle positions
    particleManager.updateHands(handResults);
    particleManager.updateFace(faceResults);

    // Clear canvas with fade effect for trails
    ctx.fillStyle = "rgba(10, 10, 15, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all particles
    particleManager.draw(ctx);

    // Update status with tracking info
    const handCount = handResults ? handResults.length : 0;
    const faceCount = faceResults ? faceResults.length : 0;
    const stats = particleManager.getStats();
    status.textContent = `🖐️ ${handCount} hand(s) | 👤 ${faceCount} face(s) | ✨ ${stats.total} particles`;
  }

  requestAnimationFrame(processFrame);
}

// ============================================
// UI Controls
// ============================================
function setupControls() {
  // Webcam visibility toggle
  document.getElementById("showWebcam").addEventListener("change", (e) => {
    settings.showWebcam = e.target.checked;
    video.style.display = settings.showWebcam ? "block" : "none";
  });

  // Webcam opacity
  document.getElementById("webcamOpacity").addEventListener("input", (e) => {
    settings.webcamOpacity = parseInt(e.target.value) / 100;
    video.style.opacity = settings.webcamOpacity;
    document.getElementById("opacityVal").textContent = e.target.value;
  });

  // Particle size
  document.getElementById("particleSize").addEventListener("input", (e) => {
    settings.particleSize = parseFloat(e.target.value);
    document.getElementById("sizeVal").textContent = e.target.value;
  });

  // Trail length
  document.getElementById("trailLength").addEventListener("input", (e) => {
    settings.trailLength = parseInt(e.target.value);
    document.getElementById("trailVal").textContent = e.target.value;
  });

  // Particle density
  document.getElementById("density").addEventListener("input", (e) => {
    settings.density = parseInt(e.target.value);
    document.getElementById("densityVal").textContent = e.target.value;
  });

  // Glow intensity
  document.getElementById("glowIntensity").addEventListener("input", (e) => {
    settings.glowIntensity = parseInt(e.target.value);
    document.getElementById("glowVal").textContent = e.target.value;
  });

  // Color theme buttons
  document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".color-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      settings.colorTheme = btn.dataset.color;
      particleManager.updateColors();
    });
  });

  // Start button
  startBtn.addEventListener("click", startCamera);
}

// ============================================
// Initialize Application
// ============================================
function init() {
  startBtn.disabled = true;
  setupControls();
  initMediaPipe();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
