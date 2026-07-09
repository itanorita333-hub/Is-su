'use strict'

const fs = require('fs')
const path = require('path')
const { isSuppressed, sanitizeLogText } = require('./logFilter')

function installLogInterceptors(options = {}) {
  if (global.__knightLogInterceptorsInstalled) return global.__knightLogInterceptorsInstalled

  const persistLogs = options.persistLogs !== false
  const captureDashboardLogs = options.captureDashboardLogs !== false
  const maxDashboardLogs = options.maxDashboardLogs || 200
  const maxLogFileLines = options.maxLogFileLines || 500
  const keepLogFileLines = options.keepLogFileLines || 400
  const suppressNoisySessionLogs = process.env.SUPPRESS_NOISY_SESSION_LOGS !== '0'
  const logFile = options.logFile || path.join(__dirname, '..', 'data', 'bot.log')

  const originalLog = console.log
  const originalInfo = console.info
  const originalWarn = console.warn
  const originalError = console.error
  const originalStdoutWrite = process.stdout.write.bind(process.stdout)
  const originalStderrWrite = process.stderr.write.bind(process.stderr)

  if (captureDashboardLogs && !global.dashboardLogs) global.dashboardLogs = []

  function addLog(level, args) {
    const raw = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')
    if (isSuppressed(raw)) return

    const msg = sanitizeLogText(raw)
    const entry = { time: Date.now(), level, msg }

    if (captureDashboardLogs && global.dashboardLogs) {
      global.dashboardLogs.push(entry)
      if (global.dashboardLogs.length > maxDashboardLogs) global.dashboardLogs.shift()
    }

    if (!persistLogs) return

    try {
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
      const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
      if (lines.length > maxLogFileLines) {
        fs.writeFileSync(logFile, lines.slice(-keepLogFileLines).join('\n') + '\n')
      }
    } catch {}
  }

  function shouldPrintToTerminal(args) {
    if (!suppressNoisySessionLogs) return true
    const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')
    return !isSuppressed(message)
  }

  function toChunkText(chunk) {
    return Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '')
  }

  console.log = (...args) => {
    addLog('info', args)
    if (shouldPrintToTerminal(args)) originalLog(...args)
  }

  console.info = (...args) => {
    addLog('info', args)
    if (shouldPrintToTerminal(args)) originalInfo(...args)
  }

  console.warn = (...args) => {
    addLog('warn', args)
    if (shouldPrintToTerminal(args)) originalWarn(...args)
  }

  console.error = (...args) => {
    addLog('error', args)
    if (shouldPrintToTerminal(args)) originalError(...args)
  }

  process.stdout.write = function patchedStdoutWrite(chunk, encoding, callback) {
    const rawText = toChunkText(chunk)
    if (suppressNoisySessionLogs && isSuppressed(rawText)) {
      if (typeof callback === 'function') callback()
      return true
    }

    const text = sanitizeLogText(rawText)
    return originalStdoutWrite(text, encoding, callback)
  }

  process.stderr.write = function patchedStderrWrite(chunk, encoding, callback) {
    const rawText = toChunkText(chunk)
    if (suppressNoisySessionLogs && isSuppressed(rawText)) {
      if (typeof callback === 'function') callback()
      return true
    }

    const text = sanitizeLogText(rawText)
    return originalStderrWrite(text, encoding, callback)
  }

  const installed = {
    addLog,
    shouldPrintToTerminal,
    suppressNoisySessionLogs,
  }

  global.__knightLogInterceptorsInstalled = installed
  return installed
}

module.exports = {
  installLogInterceptors,
}