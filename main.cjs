const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Ariso Retail POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove native File/Edit/View/Window menu in production mode
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Bind window-specific keyboard shortcut accelerators
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl + Q to Quit
    if (input.control && input.key.toLowerCase() === 'q') {
      app.quit();
      event.preventDefault();
    }
    // F5 or Ctrl + R to Reload (Development only)
    if ((input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) && isDev) {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
    // F12 to Toggle DevTools (Development only)
    if (input.key === 'F12' && isDev) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Direct TCP Socket raw stream printing for LAN thermal printers
ipcMain.handle('print-lan-raw', async (event, ip, port, base64Payload) => {
  return new Promise((resolve, reject) => {
    try {
      const buffer = Buffer.from(base64Payload, 'base64');
      const client = new net.Socket();
      client.setTimeout(3000); // 3 second connection timeout

      client.connect(port || 9100, ip, () => {
        client.write(buffer, () => {
          client.end();
          resolve({ success: true });
        });
      });

      client.on('error', (err) => {
        client.destroy();
        reject(err);
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`LAN TCP Socket timeout at ${ip}:${port}`));
      });
    } catch (err) {
      reject(err);
    }
  });
});

// IPC Handler: Silent HTML Receipt rendering and printing to Windows queue
ipcMain.handle('print-system-silent', async (event, htmlContent, printerName) => {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print(
          {
            silent: true,
            deviceName: printerName || ''
          },
          (success, failureReason) => {
            printWindow.destroy();
            if (success) {
              resolve(true);
            } else {
              reject(new Error(failureReason || 'Print failed'));
            }
          }
        );
      });
    } catch (err) {
      reject(err);
    }
  });
});

// IPC Handler: Fetch system printers list
ipcMain.handle('get-system-printers', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrinters();
});

// =========================================================================
// INBUILD PRINT GATEWAY DAEMON (Embedded for Windows Application)
// =========================================================================
let gatewayState = {
  isRunning: false,
  serverUrl: 'https://arisoretail.duckdns.org/api',
  token: '',
  deviceToken: '',
  pollTimer: null,
  heartbeatTimer: null,
  isPolling: false
};

function sendSocketPayload(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const isMock = !ip || ip === '127.0.0.1' || ip === 'localhost';
    if (isMock) {
      return resolve({ success: true, mock: true });
    }

    const client = new net.Socket();
    client.setTimeout(2500);

    client.connect(port || 9100, ip, () => {
      client.write(buffer, () => {
        client.end();
        resolve({ success: true });
      });
    });

    client.on('error', (err) => {
      client.destroy();
      reject(err);
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error(`TCP Socket timeout connecting to printer at ${ip}:${port}`));
    });
  });
}

async function processGatewayJob(job) {
  let targetIp = job.ip_address || '127.0.0.1';
  let targetPort = job.port || 9100;
  const jobTitle = `Job #${job.id} (${job.print_type || 'RECEIPT'}) -> ${job.printer_name || targetIp}:${targetPort}`;

  if (!job.payload_base64) {
    await sendGatewayAck(job.id, 'FAILED', 'Missing payload_base64 string in queue.');
    return;
  }

  const tStart = Date.now();
  try {
    const bufferPayload = Buffer.from(job.payload_base64, 'base64');
    await sendSocketPayload(targetIp, targetPort, bufferPayload);
    const duration = Date.now() - tStart;
    await sendGatewayAck(job.id, 'SUCCESS', null, { completed_at: Date.now(), total_duration_ms: duration });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway-job-status', { jobId: job.id, status: 'SUCCESS', title: jobTitle });
    }
  } catch (err) {
    const duration = Date.now() - tStart;
    await sendGatewayAck(job.id, 'FAILED', err.message, { completed_at: Date.now(), total_duration_ms: duration });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway-job-status', { jobId: job.id, status: 'FAILED', title: jobTitle, error: err.message });
    }
  }
}

async function sendGatewayAck(jobId, status, errorMessage, timing = null) {
  try {
    const cleanUrl = (gatewayState.serverUrl || '').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (gatewayState.token) headers['Authorization'] = `Bearer ${gatewayState.token}`;
    if (gatewayState.deviceToken) headers['X-Device-Token'] = gatewayState.deviceToken;

    await fetch(`${cleanUrl}/agent/print-jobs/ack`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        job_id: jobId,
        status,
        error_message: errorMessage || null,
        timing
      })
    });
  } catch (err) {
    console.error('[Inbuild Gateway] Failed to send ACK:', err.message);
  }
}

async function pollGatewayJobs() {
  if (!gatewayState.isRunning || gatewayState.isPolling) return;
  if (!gatewayState.token && !gatewayState.deviceToken) return;

  gatewayState.isPolling = true;
  try {
    const cleanUrl = (gatewayState.serverUrl || '').replace(/\/+$/, '');
    const headers = {};
    if (gatewayState.token) headers['Authorization'] = `Bearer ${gatewayState.token}`;
    if (gatewayState.deviceToken) headers['X-Device-Token'] = gatewayState.deviceToken;

    const res = await fetch(`${cleanUrl}/agent/print-jobs/poll`, { headers });
    if (res.ok) {
      const resData = await res.json();
      const jobs = Array.isArray(resData) ? resData : (resData && Array.isArray(resData.jobs) ? resData.jobs : []);
      if (jobs.length > 0) {
        for (const job of jobs) {
          await processGatewayJob(job);
        }
      }
    }
  } catch (err) {
    // Network or server unreachable (silent catch during offline)
  } finally {
    gatewayState.isPolling = false;
  }
}

async function sendGatewayHeartbeat() {
  if (!gatewayState.isRunning) return;
  if (!gatewayState.token && !gatewayState.deviceToken) return;

  try {
    const cleanUrl = (gatewayState.serverUrl || '').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (gatewayState.token) headers['Authorization'] = `Bearer ${gatewayState.token}`;
    if (gatewayState.deviceToken) headers['X-Device-Token'] = gatewayState.deviceToken;

    await fetch(`${cleanUrl}/agent/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ printer_statuses: [] })
    });
  } catch (err) {
    // Silent heartbeat
  }
}

function startGatewayDaemon(config = {}) {
  gatewayState.serverUrl = config.serverUrl || gatewayState.serverUrl;
  gatewayState.token = config.token || gatewayState.token;
  gatewayState.deviceToken = config.deviceToken || gatewayState.deviceToken;
  gatewayState.isRunning = true;

  if (gatewayState.pollTimer) clearInterval(gatewayState.pollTimer);
  if (gatewayState.heartbeatTimer) clearInterval(gatewayState.heartbeatTimer);

  gatewayState.pollTimer = setInterval(pollGatewayJobs, 1500);
  gatewayState.heartbeatTimer = setInterval(sendGatewayHeartbeat, 10000);

  // Initial immediate poll
  pollGatewayJobs();
  console.log('[Inbuild Print Gateway] Daemon started for server:', gatewayState.serverUrl);
  return { success: true, serverUrl: gatewayState.serverUrl };
}

function stopGatewayDaemon() {
  gatewayState.isRunning = false;
  if (gatewayState.pollTimer) clearInterval(gatewayState.pollTimer);
  if (gatewayState.heartbeatTimer) clearInterval(gatewayState.heartbeatTimer);
  gatewayState.pollTimer = null;
  gatewayState.heartbeatTimer = null;
  console.log('[Inbuild Print Gateway] Daemon stopped.');
  return { success: true };
}

ipcMain.handle('start-print-gateway', (event, config) => startGatewayDaemon(config));
ipcMain.handle('stop-print-gateway', () => stopGatewayDaemon());
ipcMain.handle('get-gateway-status', () => ({ isRunning: gatewayState.isRunning, serverUrl: gatewayState.serverUrl }));
