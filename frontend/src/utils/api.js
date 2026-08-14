/**
 * API Client helper for PII Redactor Backend with auto-retry resilience
 */

async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) {
        throw new Error('Connection interrupted. Please check your network.');
      }
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

export async function uploadAndAnalyze(file, simulateTraffic = false) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/analyze?simulate_traffic=${simulateTraffic}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to submit document for analysis.');
  }

  return await response.json(); // { job_id, status }
}

export async function checkJobStatus(jobId) {
  if (!jobId) return { status: 'processing', progress: 'Processing document...' };

  try {
    const response = await fetchWithRetry(`/api/job/${jobId}`, {}, 3, 500);
    if (!response.ok) {
      return { status: 'processing', progress: 'Processing document...' };
    }
    return await response.json();
  } catch (err) {
    return { status: 'processing', progress: 'Processing document...' };
  }
}

export async function submitRedaction(fileId, replacements, ignoredTypes = []) {
  const response = await fetchWithRetry('/api/redact-custom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
      replacements: replacements,
      ignored_types: ignoredTypes,
    }),
  }, 3, 1000);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Redaction job submission failed. Please try again.');
  }

  return await response.json(); // { job_id, status }
}

export async function downloadRedactedFile(jobId, filename, fileId) {
  let response = null;
  if (jobId) {
    try {
      response = await fetchWithRetry(`/api/download/${jobId}`, {}, 2, 500);
    } catch (e) {
      // Fallback
    }
  }

  if ((!response || !response.ok) && fileId) {
    response = await fetchWithRetry(`/api/download-file/${fileId}`, {}, 2, 500);
  }

  if (!response || !response.ok) {
    throw new Error('Failed to download redacted document.');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `redacted_${filename}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
