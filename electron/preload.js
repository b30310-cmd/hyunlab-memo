const { contextBridge, ipcRenderer } = require('electron')

// This shape is dictated by the existing web app bundle (app/assets/*.js),
// which already feature-detects `window.electronAPI` and calls these exact
// methods — see openPopup/notify/setAutoStart/onQuickCapture/onBoundsChanged/
// setAlwaysOnTop/setOpacity/closeWindow/openMain in the built renderer code.
// Do not rename these without also changing (and rebuilding) the web app.
contextBridge.exposeInMainWorld('electronAPI', {
  openPopup: (memoId, popupState) => ipcRenderer.send('popup:open', memoId, popupState),
  notify: (title, body) => ipcRenderer.send('notify', title, body),
  setAutoStart: (enabled) => ipcRenderer.send('auto-start:set', enabled),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window:set-always-on-top', flag),
  setOpacity: (value) => ipcRenderer.send('window:set-opacity', value),
  closeWindow: () => ipcRenderer.send('window:close'),
  openMain: () => ipcRenderer.send('window:open-main'),

  onQuickCapture: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('quick-capture', listener)
    return () => ipcRenderer.removeListener('quick-capture', listener)
  },

  onBoundsChanged: (callback) => {
    const listener = (_event, bounds) => callback(bounds)
    ipcRenderer.on('popup:bounds-changed', listener)
    return () => ipcRenderer.removeListener('popup:bounds-changed', listener)
  },
})
