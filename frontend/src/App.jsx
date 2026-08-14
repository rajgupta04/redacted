import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';
import LoadingQueue from './components/LoadingQueue';
import Dashboard from './components/Dashboard';
import ResetModal from './components/ResetModal';
import AlertBanner from './components/AlertBanner';

import { uploadAndAnalyze, checkJobStatus, submitRedaction, downloadRedactedFile } from './utils/api';

export default function App() {
  const [simulateTraffic, setSimulateTraffic] = useState(false);
  const [stage, setStage] = useState('upload'); // 'upload' | 'loading' | 'dashboard'

  // Job Polling State
  const [currentJobId, setCurrentJobId] = useState('');
  const [jobStatus, setJobStatus] = useState({
    status: 'queued',
    position: 1,
    progress: '',
    estSeconds: 5,
  });

  // Document & Entities State
  const [currentFileId, setCurrentFileId] = useState('');
  const [filename, setFilename] = useState('');
  const [entities, setEntities] = useState([]);
  const [replacements, setReplacements] = useState({});
  const [ignoredTypes, setIgnoredTypes] = useState([]);

  // Redaction Submit State
  const [isRedacting, setIsRedacting] = useState(false);
  const [redactionProgress, setRedactionProgress] = useState('');

  // UI Modals & Alerts
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success'|'error', message }

  // Check sessionStorage on page load to restore active session across refreshes
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('redactSession');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.currentFileId && data.rawEntities) {
          setCurrentFileId(data.currentFileId);
          setFilename(data.originalFileName || 'Uploaded_Document.docx');
          setEntities(data.rawEntities);

          // Initialize replacement map
          const initialMap = {};
          data.rawEntities.forEach((ent, idx) => {
            initialMap[idx] = ent.suggested;
          });
          setReplacements(initialMap);
          setStage('dashboard');
        }
      }
    } catch (e) {
      sessionStorage.removeItem('redactSession');
    }
  }, []);

  // Handle File Select
  const handleFileSelect = async (file) => {
    setAlert(null);
    setStage('loading');
    setFilename(file.name);
    setJobStatus({
      status: 'queued',
      position: 1,
      progress: 'Submitting file to server...',
      estSeconds: 30,
    });

    try {
      const res = await uploadAndAnalyze(file, simulateTraffic);
      setCurrentJobId(res.job_id);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
      setStage('upload');
    }
  };

  // Poll Job Status when in loading stage
  useEffect(() => {
    if (stage !== 'loading' || !currentJobId) return;

    let countdownTimer = null;

    const poll = async () => {
      try {
        const data = await checkJobStatus(currentJobId);

        if (data.status === 'queued') {
          setJobStatus((prev) => ({
            status: 'queued',
            position: data.position,
            progress: 'The server is processing queue tasks...',
            estSeconds: Math.max(0, prev.estSeconds - 1),
          }));
        } else if (data.status === 'processing') {
          setJobStatus((prev) => ({
            status: 'processing',
            position: 1,
            progress: data.progress || 'Running AI Entity Detection...',
            estSeconds: Math.max(0, prev.estSeconds - 1),
          }));
        } else if (data.status === 'completed') {
          const result = data.result;
          setCurrentFileId(result.file_id);
          setFilename(result.filename);
          setEntities(result.entities);

          // Initialize replacement map
          const initialMap = {};
          result.entities.forEach((ent, idx) => {
            initialMap[idx] = ent.suggested;
          });
          setReplacements(initialMap);

          // Save to sessionStorage for page refresh persistence
          sessionStorage.setItem(
            'redactSession',
            JSON.stringify({
              currentFileId: result.file_id,
              originalFileName: result.filename,
              rawEntities: result.entities,
            })
          );

          setStage('dashboard');
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Document analysis failed.');
        }

        // Schedule next poll in 1s
        countdownTimer = setTimeout(poll, 1000);
      } catch (err) {
        setAlert({ type: 'error', message: err.message });
        setStage('upload');
      }
    };

    poll();

    return () => {
      if (countdownTimer) clearTimeout(countdownTimer);
    };
  }, [stage, currentJobId]);

  // Handle Input Edits
  const handleReplacementChange = (index, value) => {
    setReplacements((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  // Submit Custom Redaction & Download
  const handleSubmitRedaction = async () => {
    setAlert(null);
    setIsRedacting(true);
    setRedactionProgress('Submitting redaction job...');

    try {
      // Build replacement payload
      const payloadReplacements = entities
        .map((ent, idx) => {
          if (ignoredTypes.includes(ent.type)) return null;
          const userVal = replacements[idx];
          return {
            original: ent.original,
            type: ent.type,
            replacement: userVal !== undefined && userVal.trim() !== '' ? userVal.trim() : `[${ent.type}_REDACTED]`,
          };
        })
        .filter(Boolean);

      const res = await submitRedaction(currentFileId, payloadReplacements, ignoredTypes);
      const redactJobId = res.job_id;

      // Poll redaction job completion
      setRedactionProgress('Processing redaction in background...');

      await new Promise((resolve, reject) => {
        const pollRedact = async () => {
          try {
            const data = await checkJobStatus(redactJobId);
            if (data.status === 'completed') {
              resolve(data);
            } else if (data.status === 'failed') {
              reject(new Error(data.error || 'Redaction job failed on server.'));
            } else {
              setRedactionProgress(data.progress || 'Redacting text & XML runs...');
              setTimeout(pollRedact, 1000);
            }
          } catch (e) {
            reject(e);
          }
        };
        pollRedact();
      });

      // Trigger client download
      setRedactionProgress('Downloading redacted file...');
      await downloadRedactedFile(redactJobId, filename);

      setAlert({
        type: 'success',
        message: 'Success! Your redacted document has been downloaded.',
      });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setIsRedacting(false);
      setRedactionProgress('');
    }
  };

  // Handle Reset / Start Over
  const handleConfirmReset = () => {
    sessionStorage.removeItem('redactSession');
    setCurrentFileId('');
    setFilename('');
    setEntities([]);
    setReplacements({});
    setIgnoredTypes([]);
    setIsResetModalOpen(false);
    setAlert(null);
    setStage('upload');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <Navbar simulateTraffic={simulateTraffic} setSimulateTraffic={setSimulateTraffic} />

      {/* Floating Alert Notifications */}
      <AlertBanner alert={alert} onClose={() => setAlert(null)} />

      {/* Stage Router */}
      <main>
        {stage === 'upload' && <UploadZone onFileSelect={handleFileSelect} />}

        {stage === 'loading' && <LoadingQueue jobStatus={jobStatus} />}

        {stage === 'dashboard' && (
          <Dashboard
            filename={filename}
            entities={entities}
            replacements={replacements}
            onReplacementChange={handleReplacementChange}
            ignoredTypes={ignoredTypes}
            onIgnoredTypesChange={setIgnoredTypes}
            onOpenResetModal={() => setIsResetModalOpen(true)}
            onSubmitRedaction={handleSubmitRedaction}
            isRedacting={isRedacting}
            redactionProgress={redactionProgress}
          />
        )}
      </main>

      {/* Reset Confirmation Overlay Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />

      {/* Student Notice Footer */}
      <footer style={{ textStyle: 'center', textAlign: 'center', marginTop: '3rem', paddingBottom: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
        <p>Submitted by <strong>Raj Gupta</strong> &bull; <a href="mailto:rajgupta8340@gmail.com" style={{ color: '#e63946', textDecoration: 'none' }}>rajgupta8340@gmail.com</a></p>
        <p style={{
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: '#ff4d5e',
          background: 'rgba(230, 57, 70, 0.1)',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          display: 'inline-block',
          border: '1px solid rgba(230, 57, 70, 0.2)'
        }}>
          ⚠️ <b>Notice:</b> Taking this project without consent is strictly prohibited. This is an official student assignment project.
        </p>
      </footer>
    </div>
  );
}
