/**
 * Ariso Retail - Local Print Agent Client Service
 * Communicates with http://127.0.0.1:9101 for direct, zero-dialog Windows Spooler RAW TSPL printing.
 * Works seamlessly in both localhost development and HTTPS production environments.
 */

const AGENT_HOST = '127.0.0.1';
const AGENT_PORT = 9101;
export const DEFAULT_AGENT_URL = `http://${AGENT_HOST}:${AGENT_PORT}`;
const TOKEN_STORAGE_KEY = 'ariso_local_print_agent_token';

/**
 * Get stored pairing token
 */
export function getStoredAgentToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch (_) {
    return '';
  }
}

/**
 * Store pairing token
 */
export function setStoredAgentToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (_) {}
}

/**
 * Check health & connection to local print agent
 * Auto-bootstraps pairing token if available
 */
export async function checkAgentHealth(timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${DEFAULT_AGENT_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        if (data.pairingToken) {
          setStoredAgentToken(data.pairingToken);
        }
        return {
          connected: true,
          agent: data.agent || 'Ariso Local Print Agent',
          version: data.version || '1.0.0',
          defaultPrinter: data.defaultPrinter || 'TSC TE244',
          token: data.pairingToken || getStoredAgentToken()
        };
      }
    }
    return { connected: false, error: `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timer);
    return {
      connected: false,
      error: err.name === 'AbortError' ? 'Agent connection timed out' : (err.message || 'Agent unreachable')
    };
  }
}

/**
 * Discover installed Windows printers from local print agent
 */
export async function getAgentPrinters(timeoutMs = 3500) {
  let token = getStoredAgentToken();
  if (!token) {
    const health = await checkAgentHealth(1000);
    if (health.connected && health.token) {
      token = health.token;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Accept': 'application/json' };
    if (token) {
      headers['X-Ariso-Print-Token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${DEFAULT_AGENT_URL}/printers`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.ok && Array.isArray(data.printers)) {
        return {
          ok: true,
          printers: data.printers,
          defaultPrinter: data.defaultPrinter || null,
          count: data.count || data.printers.length
        };
      }
    } else if (res.status === 401) {
      return { ok: false, unauthorized: true, error: 'Agent unauthorized. Invalid pairing token.' };
    }
    return { ok: false, error: `Failed to fetch printers (HTTP ${res.status})` };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Printer query timed out' : err.message
    };
  }
}

/**
 * Print RAW TSPL payload directly to the selected Windows printer via Local Print Agent
 * Zero Chrome print preview dialog. Immediate spooling.
 */
export async function printViaAgent(printerName, tsplData, options = {}) {
  let token = getStoredAgentToken();
  if (!token) {
    const health = await checkAgentHealth(1000);
    if (health.connected && health.token) {
      token = health.token;
    }
  }

  const payload = {
    printerName: (printerName || '').trim(),
    jobType: options.jobType || 'tspl',
    data: tsplData,
    copies: options.copies || 1,
    docTitle: options.docTitle || 'Ariso Product Label',
    isBase64: options.isBase64 || false
  };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['X-Ariso-Print-Token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${DEFAULT_AGENT_URL}/print`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      return {
        success: true,
        printer: data.printer || printerName,
        bytesWritten: data.bytesWritten || 0,
        durationMs: data.durationMs || 0
      };
    } else {
      return {
        success: false,
        error: data.error || `Spooler error (HTTP ${res.status})`,
        printer: printerName
      };
    }
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError'
      ? 'Print request timed out. Please check if the local print agent is running.'
      : (err.message || 'Failed to dispatch print job to agent.');
    return {
      success: false,
      error: msg,
      agentOffline: true,
      printer: printerName
    };
  }
}

/**
 * Quick Test Print via Local Print Agent
 */
export async function testAgentPrint(printerName = 'TSC TE244') {
  let token = getStoredAgentToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-Ariso-Print-Token'] = token;

    const res = await fetch(`${DEFAULT_AGENT_URL}/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ printerName }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, message: data.message || data.error };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message };
  }
}
