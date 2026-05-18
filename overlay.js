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
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Canvas-based black background removal
const video  = document.getElementById('cat-video')
const canvas = document.getElementById('cat-canvas')
const ctx    = canvas.getContext('2d', { willReadFrequently: true })

video.addEventListener('loadedmetadata', () => {
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
})

function removeBlack() {
  if (video.paused || video.ended) return
  ctx.drawImage(video, 0, 0)
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = frame.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2]
    // 如果像素接近黑色，设为透明
    if (r < 40 && g < 40 && b < 40) d[i+3] = 0
  }
  ctx.putImageData(frame, 0, 0)
  requestAnimationFrame(removeBlack)
}
video.addEventListener('play', removeBlack)

const backdrop  = document.getElementById('backdrop')
const catWrap   = document.getElementById('cat-wrap')
const card      = document.getElementById('card')
const messageEl = document.getElementById('message')
const countdownEl = document.getElementById('countdown')
const snoozeBtn = document.getElementById('snooze-btn')
const quitBtn   = document.getElementById('quit-btn')

messageEl.textContent = messages[Math.floor(Math.random() * messages.length)]

// Animate in — cat appears immediately
requestAnimationFrame(() => {
  backdrop.classList.add('visible')
  catWrap.classList.add('show')
  card.classList.add('visible')
})

// Countdown
let remaining = BREAK_DURATION_S
const interval = setInterval(() => {
  remaining--
  countdownEl.textContent = formatTime(remaining)
  if (remaining <= 0) {
    clearInterval(interval)
    animateOut(() => ipcRenderer.send('break-done'))
  }
}, 1000)

snoozeBtn.addEventListener('click', () => {
  clearInterval(interval)
  animateOut(() => ipcRenderer.send('snooze'))
})

quitBtn.addEventListener('click', () => ipcRenderer.send('quit-app'))
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ipcRenderer.send('quit-app')
})

function animateOut(callback) {
  card.style.opacity = '0'
  card.style.transition = 'opacity 0.6s ease'
  // 记录当前位置让猫咪从当前位置飞出
  const currentLeft = catWrap.getBoundingClientRect().left
  catWrap.style.setProperty('--cat-pos', currentLeft + 'px')
  catWrap.classList.remove('show')
  catWrap.classList.add('hide')
  backdrop.style.opacity = '0'
  backdrop.style.transition = 'opacity 1.2s ease 0.4s'
  setTimeout(callback, 2000)
}
