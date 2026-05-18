const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, globalShortcut } = require('electron')
const path = require('path')

const WORK_LIMIT_MS = 60 * 60 * 1000      // 1 hour
const IDLE_THRESHOLD_S = 5 * 60           // 5 minutes idle = pause timer
const SNOOZE_MS = 20 * 60 * 1000          // 20 minutes snooze

let overlayWindow = null
let tray = null
let workTimer = 0
let lastTick = Date.now()
let timerInterval = null
let snoozedUntil = 0
let overlayVisible = false

app.whenReady().then(() => {
  createTray()
  startWorkTimer()

  // 开发者测试快捷键：Cmd+Shift+T 触发弹窗
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (overlayVisible) {
      closeOverlay()
    } else {
      showOverlay()
    }
  })
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
})

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Cat Break')
  updateTrayMenu()
}

function updateTrayMenu() {
  const minutes = Math.floor(workTimer / 60000)
  const menu = Menu.buildFromTemplate([
    { label: `Active: ${minutes} min / 60 min`, enabled: false },
    { type: 'separator' },
    { label: 'Take a break now', click: showOverlay },
    { label: 'Reset timer', click: resetTimer },
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) }
  ])
  tray.setContextMenu(menu)
}

function startWorkTimer() {
  lastTick = Date.now()
  timerInterval = setInterval(() => {
    const idleSeconds = powerMonitor.getSystemIdleTime()
    const now = Date.now()
    const delta = now - lastTick
    lastTick = now

    if (idleSeconds < IDLE_THRESHOLD_S) {
      workTimer += delta
    }

    updateTrayMenu()

    if (workTimer >= WORK_LIMIT_MS && !overlayVisible && Date.now() >= snoozedUntil) {
      showOverlay()
    }
  }, 1000)
}

function resetTimer() {
  workTimer = 0
  overlayVisible = false
  snoozedUntil = 0
}

function showOverlay() {
  if (overlayVisible) return
  overlayVisible = true

  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.bounds

  overlayWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  overlayWindow.loadFile('overlay.html')
  overlayWindow.setIgnoreMouseEvents(false)
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
}

ipcMain.on('quit-app', () => {
  // ✕ 按钮 = 关闭这次提醒，20分钟后再提
  snoozedUntil = Date.now() + SNOOZE_MS
  resetTimer()
  closeOverlay()
})

ipcMain.on('snooze', () => {
  snoozedUntil = Date.now() + SNOOZE_MS
  resetTimer()
  closeOverlay()
})

ipcMain.on('break-done', () => {
  resetTimer()
  closeOverlay()
})

function closeOverlay() {
  if (overlayWindow) {
    overlayWindow.close()
    overlayWindow = null
  }
  overlayVisible = false
}
