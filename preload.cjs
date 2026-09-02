const { contextBridge, ipcRenderer } = require('electron');

// Secure IPC bridge between React and native Electron window
contextBridge.exposeInMainWorld('electron', {
  printLanRaw: (ip, port, base64Payload) => ipcRenderer.invoke('print-lan-raw', ip, port, base64Payload),
  printSystemSilent: (htmlContent, printerName) => ipcRenderer.invoke('print-system-silent', htmlContent, printerName),
  getPrinters: () => ipcRenderer.invoke('get-system-printers'),
  startGateway: (config) => ipcRenderer.invoke('start-print-gateway', config),
  stopGateway: () => ipcRenderer.invoke('stop-print-gateway'),
  getGatewayStatus: () => ipcRenderer.invoke('get-gateway-status'),
  onGatewayJobStatus: (callback) => {
    ipcRenderer.removeAllListeners('gateway-job-status');
    ipcRenderer.on('gateway-job-status', (event, data) => callback(data));
  },
  isDesktop: true
});
