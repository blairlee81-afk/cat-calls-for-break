const { ipcRenderer } = require('electron')

const BREAK_DURATION_S = 3 * 60

const messages = [
  "Step away from the screen. I didn't ask.",
  "Your inbox can wait. Your eyeballs cannot.",
  "Burning out is so last season.",
  "I work 2 hours a day and I look like THIS.",
  "Close the laptop. Do it. I dare you.",
  "Rest now or your future self will be furious.",
  "Nobody ever regretted taking a break. Ever.",
  "You're not a machine. Even machines need rebooting.",
  "The grind will still be there. Your sanity might not.",
  "I'm on my third champagne and feeling great. Take notes.",
  "Legendary people rest. Coincidence? No.",
  "Get up. Stretch. Hydrate. You're welcome."
]

function formatTime(s) {
  const m   = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Elements
const backdrop    = document.getElementById('backdrop')
const catWrap     = document.getElementById('cat-wrap')
const card        = document.getElementById('card')
const messageEl   = document.getElementById('message')
const countdownEl = document.getElementById('countdown')
const snoozeBtn   = document.getElementById('snooze-btn')
const quitBtn     = document.getElementById('quit-btn')

// Canvas-based black background removal
const video  = document.getElementById('cat-video')
const canvas = document.getElementById('cat-canvas')
const ctx    = canvas.getContext('2d', { willReadFrequently: true })

video.addEventListener('loadedmetadata', () => {
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
})

let rafId = null
function removeBlack() {
  if (video.paused || video.ended) return
  ctx.drawImage(video, 0, 0)
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = frame.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < 40 && d[i+1] < 40 && d[i+2] < 40) d[i+3] = 0
  }
  ctx.putImageData(frame, 0, 0)
  rafId = requestAnimationFrame(removeBlack)
}
video.addEventListener('play', () => { rafId = requestAnimationFrame(removeBlack) })

// Set random message
messageEl.textContent = messages[Math.floor(Math.random() * messages.length)]

// Animate in immediately
requestAnimationFrame(() => {
  backdrop.classList.add('visible')
  catWrap.classList.add('show')
  card.classList.add('visible')
})

// Countdown
let remaining = BREAK_DURATION_S
countdownEl.textContent = formatTime(remaining)

const interval = setInterval(() => {
  remaining--
  if (remaining <= 0) {
    clearInterval(interval)
    countdownEl.textContent = '0:00'
    animateOut(() => ipcRenderer.send('break-done'))
  } else {
    countdownEl.textContent = formatTime(remaining)
  }
}, 1000)

// Snooze button
snoozeBtn.addEventListener('click', () => {
  clearInterval(interval)
  animateOut(() => ipcRenderer.send('snooze'))
})

// ✕ button — just dismiss, no snooze
quitBtn.addEventListener('click', () => {
  clearInterval(interval)
  animateOut(() => ipcRenderer.send('dismiss'))
})

// Escape = snooze
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    clearInterval(interval)
    animateOut(() => ipcRenderer.send('snooze'))
  }
})

function animateOut(callback) {
  if (rafId) cancelAnimationFrame(rafId)
  card.style.opacity  = '0'
  card.style.transition = 'opacity 0.6s ease'
  catWrap.classList.remove('show')
  catWrap.classList.add('hide')
  backdrop.style.opacity   = '0'
  backdrop.style.transition = 'opacity 1.2s ease 0.4s'
  setTimeout(callback, 2000)
}
