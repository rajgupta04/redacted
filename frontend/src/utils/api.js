/**
 * API Client helper for PII Redactor Backend
 */

export async function uploadAndAnalyze(file, simulateTraffic = false) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/analyze?simulate_traffic=${simulateTraffic}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit document for analysis.');
  }

  return await response.json(); // { job_id, status }
}

export async function checkJobStatus(jobId) {
  const response = await fetch(`/api/job/${jobId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch job queue status.');
  }
  return await response.json();
}

export async function submitRedaction(fileId, replacements, ignoredTypes = []) {
  const response = await fetch('/api/redact-custom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
      replacements: replacements,
      ignored_types: ignoredTypes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit redaction job.');
  }

  return await response.json(); // { job_id, status }
}

export async function downloadRedactedFile(jobId, filename, fileId) {
  let response = null;
  if (jobId) {
    response = await fetch(`/api/download/${jobId}`);
  }

  if ((!response || !response.ok) && fileId) {
    response = await fetch(`/api/download-file/${fileId}`);
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
