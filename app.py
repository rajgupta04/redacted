"""
PII Redactor Web API & Interactive GUI
=======================================
A production FastAPI web server serving a rich, high-end interactive UI
to upload any docx file, analyze detected PII, modify faked replacements
manually, and download the redacted Word document.

Usage:
    pip install fastapi uvicorn python-multipart python-docx spacy faker
    python app.py
"""

import os
import shutil
import tempfile
import uuid
import time
import threading
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

# Import the redaction engine from our script
from pii_redactor import PIIRedactionEngine, PIIDetectionPipeline

app = FastAPI(
    title="PII Redaction Service API",
    description="Enterprise API and GUI to detect, customize, and redact PII in docx documents.",
    version="1.0.0"
)

# Initialize the detection pipeline and engine once at startup
print("Initializing PII Redaction Engine & spaCy...")
engine = PIIRedactionEngine()
pipeline = PIIDetectionPipeline()
print("Engine ready!")

# Temporary file storage directory
TEMP_DIR = Path(tempfile.gettempdir()) / "pii_redactor_cache"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

class ReplacementItem(BaseModel):
    original: str
    type: str
    replacement: str

class RedactRequest(BaseModel):
    file_id: str
    replacements: List[ReplacementItem]
    ignored_types: List[str] = []

def clean_file(path: str):
    """Cleanup target file."""
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            print(f"Error cleaning up file {path}: {e}")

def extract_pii_counts(doc_path: str) -> Dict[tuple, int]:
    """Helper to read docx and count PII entities using our pipeline."""
    from docx import Document
    doc = Document(doc_path)
    entity_counts = {}

    def process_text(text: str):
        if not text.strip():
            return
        ents = pipeline.detect_all(text)
        for ent in ents:
            key = (ent.original_text, ent.entity_type)
            entity_counts[key] = entity_counts.get(key, 0) + 1

    # Paragraphs
    for p in doc.paragraphs:
        process_text(p.text)

    # Tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    process_text(p.text)

    # Headers & Footers
    for section in doc.sections:
        for hf in [section.header, section.footer]:
            if hf is not None:
                for p in hf.paragraphs:
                    process_text(p.text)

    return entity_counts


class JobStatus:
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Global in-memory job database and queue
jobs_db = {}
jobs_queue = []
active_job = None
queue_lock = threading.Lock()


def worker_loop():
    global active_job
    while True:
        job_id = None
        with queue_lock:
            if jobs_queue:
                job_id = jobs_queue.pop(0)
                active_job = job_id

        if job_id:
            job = jobs_db[job_id]
            job["status"] = JobStatus.PROCESSING

            # Handle simulated delay jobs
            if job.get("type") == "simulated":
                job["progress"] = "Analyzing document structure (Queue Simulation)..."
                for i in range(3):
                    time.sleep(1)
                job["status"] = JobStatus.COMPLETED
                with queue_lock:
                    if active_job == job_id:
                        active_job = None
                continue

            # Handle actual file analysis job
            try:
                job["progress"] = "Analyzing document structure & XML styles..."
                pii_counts = extract_pii_counts(job["temp_input_path"])

                # Format output suggestions (process PERSON first to seed linked emails)
                sorted_pii_items = sorted(pii_counts.items(), key=lambda x: 0 if x[0][1] == "PERSON" else 1)
                response_entities = []
                for (orig, t), count in sorted_pii_items:
                    suggested = engine.anonymizer.get_replacement(orig, t)
                    response_entities.append({
                        "original": orig,
                        "type": t,
                        "count": count,
                        "suggested": suggested
                    })
                response_entities.sort(key=lambda x: (x["type"], -x["count"]))

                job["result"] = {
                    "file_id": job["temp_file_id"],
                    "filename": job["filename"],
                    "entities": response_entities
                }
                job["status"] = JobStatus.COMPLETED
                job["progress"] = "Analysis completed!"
            except Exception as e:
                job["status"] = JobStatus.FAILED
                job["error"] = str(e)
                if "temp_input_path" in job and os.path.exists(job["temp_input_path"]):
                    clean_file(job["temp_input_path"])
            finally:
                with queue_lock:
                    if active_job == job_id:
                        active_job = None
        else:
            time.sleep(0.5)


# Start the worker thread
worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/analyze", summary="Analyze a DOCX file and return unique PII entities")
async def analyze_docx(
    file: UploadFile = File(..., description="The Word document to analyze"),
    simulate_traffic: bool = False
):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx documents are supported.")

    file_id = str(uuid.uuid4())
    temp_input_path = TEMP_DIR / f"input_{file_id}.docx"

    try:
        # Save file to cache
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create user job
        user_job_id = str(uuid.uuid4())
        jobs_db[user_job_id] = {
            "status": JobStatus.QUEUED,
            "filename": file.filename,
            "progress": "Waiting in queue...",
            "temp_file_id": file_id,
            "temp_input_path": str(temp_input_path),
            "type": "actual"
        }

        # If simulate_traffic is true, add 2 fake jobs ahead of the user
        with queue_lock:
            if simulate_traffic:
                for i in range(2):
                    fake_id = f"simulated_{uuid.uuid4()}"
                    jobs_db[fake_id] = {
                        "status": JobStatus.QUEUED,
                        "filename": f"document_batch_{i+1}.docx",
                        "progress": "Waiting in queue...",
                        "type": "simulated"
                    }
                    jobs_queue.append(fake_id)
            
            jobs_queue.append(user_job_id)

        return {
            "job_id": user_job_id,
            "status": JobStatus.QUEUED
        }

    except Exception as e:
        if os.path.exists(str(temp_input_path)):
            clean_file(str(temp_input_path))
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")


@app.get("/api/job/{job_id}", summary="Get queue status or results of an analysis job")
async def get_job_status(job_id: str):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs_db[job_id]

    # Calculate queue position
    position = 0
    with queue_lock:
        if job_id in jobs_queue:
            position = jobs_queue.index(job_id) + 1
            if active_job:
                position += 1
        elif active_job == job_id:
            position = 1

    return {
        "job_id": job_id,
        "status": job["status"],
        "position": position,
        "progress": job.get("progress"),
        "result": job.get("result"),
        "error": job.get("error")
    }


@app.post("/api/redact-custom", summary="Redact docx using custom user-defined replacement values")
def redact_custom(
    payload: RedactRequest,
    background_tasks: BackgroundTasks
):
    file_id = payload.file_id
    temp_input_path = TEMP_DIR / f"input_{file_id}.docx"
    temp_output_path = TEMP_DIR / f"redacted_{file_id}.docx"

    if not temp_input_path.exists():
        raise HTTPException(status_code=404, detail="File session expired or not found. Please upload again.")

    try:
        # Create a fresh local anonymizer cache for this run to keep it session-clean
        engine.anonymizer.cache = {}
        for item in payload.replacements:
            key = (item.original.lower().strip(), item.type)
            engine.anonymizer.cache[key] = item.replacement

        # Execute redaction using custom cache, passing ignored types to skip them
        engine.redact_document(str(temp_input_path), str(temp_output_path), ignored_types=set(payload.ignored_types))

        # Register cleanup tasks
        background_tasks.add_task(clean_file, str(temp_input_path))
        background_tasks.add_task(clean_file, str(temp_output_path))
        
        # Cleanup mapping file generated by redactor
        mapping_file = temp_output_path.with_suffix(".mapping.json")
        background_tasks.add_task(clean_file, str(mapping_file))

        # Stream file response
        return FileResponse(
            path=str(temp_output_path),
            filename=f"redacted_{file_id}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    except Exception as e:
        clean_file(str(temp_input_path))
        clean_file(str(temp_output_path))
        raise HTTPException(status_code=500, detail=f"Redaction failed: {str(e)}")


@app.get("/health", summary="Check API service health status")
async def health_check():
    return {"status": "healthy", "model": "spacy-en_core_web_sm"}


# ---------------------------------------------------------------------------
# HTML GUI Serve
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def serve_gui():
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PII Redactor — Enterprise Dashboard</title>
    <!-- Outfit Font -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #0b0f19;
            --bg-surface: #151d30;
            --bg-surface-elevated: #1e2942;
            --primary: #8b5cf6;
            --primary-hover: #7c3aed;
            --accent-emerald: #10b981;
            --accent-orange: #f59e0b;
            --accent-blue: #3b82f6;
            --accent-pink: #ec4899;
            --text-base: #f1f5f9;
            --text-muted: #94a3b8;
            --border-base: rgba(255, 255, 255, 0.06);
            --border-glow: rgba(139, 92, 246, 0.3);
            --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-base);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        /* Ambient background glow */
        .ambient-glow {
            position: absolute;
            top: -200px;
            left: 50%;
            transform: translateX(-50%);
            width: 800px;
            height: 500px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(11, 15, 25, 0) 70%);
            pointer-events: none;
            z-index: 0;
        }

        header {
            position: relative;
            z-index: 10;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            padding: 2.5rem 1.5rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-group {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo-icon {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
            font-weight: 800;
            font-size: 1.25rem;
            color: white;
        }

        .logo-text h1 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            background: linear-gradient(to right, #ffffff, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .logo-text p {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .badge-pro {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--accent-emerald);
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        main {
            position: relative;
            z-index: 10;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            padding: 0 1.5rem 3rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* Hero Upload Box */
        .upload-section {
            background: var(--bg-surface);
            border: 1px solid var(--border-base);
            border-radius: 20px;
            padding: 4rem 2rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transition: var(--transition-smooth);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .upload-section.dragover {
            border-color: var(--primary);
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
            background: var(--bg-surface-elevated);
        }

        .upload-icon {
            width: 72px;
            height: 72px;
            background: rgba(139, 92, 246, 0.08);
            border: 1px solid rgba(139, 92, 246, 0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            transition: var(--transition-smooth);
            color: var(--primary);
        }

        .upload-section:hover .upload-icon {
            transform: translateY(-5px) scale(1.05);
            background: rgba(139, 92, 246, 0.15);
            border-color: var(--primary);
        }

        .upload-section h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .upload-section p {
            color: var(--text-muted);
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
        }

        .btn-upload {
            background: var(--primary);
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            border: none;
            cursor: pointer;
            transition: var(--transition-smooth);
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .btn-upload:hover {
            background: var(--primary-hover);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
            transform: translateY(-1px);
        }

        #fileInput {
            display: none;
        }

        /* Loading / Analyzing Stage */
        .loading-section {
            display: none;
            background: var(--bg-surface);
            border: 1px solid var(--border-base);
            border-radius: 20px;
            padding: 4rem 2rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(139, 92, 246, 0.1);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s infinite linear;
            margin: 0 auto 1.5rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Interactive Dashboard */
        .dashboard-section {
            display: none;
            animation: fadeIn 0.4s ease-out;
            flex-direction: column;
            gap: 1.5rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Dashboard Header Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .stat-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-base);
            border-radius: 16px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .stat-card .label {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
        }

        .stat-card .value {
            font-size: 1.75rem;
            font-weight: 700;
        }

        /* Data Panel */
        .panel {
            background: var(--bg-surface);
            border: 1px solid var(--border-base);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .panel-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-base);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .panel-title h3 {
            font-size: 1.2rem;
            font-weight: 600;
        }

        .panel-title p {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        /* Search & Filters */
        .controls-row {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-box {
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border-base);
            padding: 0.6rem 1rem;
            border-radius: 10px;
            color: white;
            font-size: 0.9rem;
            min-width: 250px;
            outline: none;
            transition: var(--transition-smooth);
        }

        .search-box:focus {
            border-color: var(--primary);
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
        }

        .filter-select {
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border-base);
            padding: 0.6rem 1rem;
            border-radius: 10px;
            color: white;
            font-size: 0.9rem;
            outline: none;
            cursor: pointer;
        }

        /* Table Structure */
        .table-container {
            max-height: 550px;
            overflow-y: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background: rgba(11, 15, 25, 0.4);
            padding: 1rem 1.5rem;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            position: sticky;
            top: 0;
            z-index: 5;
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border-base);
        }

        td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-base);
            font-size: 0.95rem;
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.01);
        }

        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.2rem 0.6rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }

        .badge-PERSON { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
        .badge-EMAIL { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
        .badge-PHONE { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: var(--accent-orange); }
        .badge-ORG { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: var(--primary); }
        .badge-ADDRESS { background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); color: var(--accent-pink); }
        .badge-CIN { background: #1f2937; border: 1px solid #374151; color: #d1d5db; }
        .badge-URL { background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2); color: #06b6d4; }

        .occurrence-badge {
            background: var(--bg-surface-elevated);
            color: var(--text-base);
            padding: 0.15rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        /* Replacement Inputs */
        .replacement-input {
            width: 100%;
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border-base);
            padding: 0.55rem 0.85rem;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            outline: none;
            transition: var(--transition-smooth);
        }

        .replacement-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
            background: #253352;
        }

        /* Footer Controls */
        .panel-footer {
            padding: 1.5rem;
            background: rgba(11, 15, 25, 0.3);
            border-top: 1px solid var(--border-base);
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            align-items: center;
        }

        .btn-cancel {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border-base);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition-smooth);
        }

        .btn-cancel:hover {
            color: white;
            background: rgba(255, 255, 255, 0.05);
        }

        .btn-redact {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
            transition: var(--transition-smooth);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-redact:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 25px rgba(139, 92, 246, 0.5);
        }

        /* Original Text Highlight */
        .original-text-wrapper {
            font-weight: 600;
            color: #f1f5f9;
            max-width: 320px;
            word-break: break-all;
        }

        /* Alerts */
        .alert {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 1rem;
            border-radius: 12px;
            font-size: 0.9rem;
            display: none;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
        }

        .alert-close {
            cursor: pointer;
            font-weight: bold;
            opacity: 0.8;
        }

        .alert-close:hover { opacity: 1; }
    </style>
</head>
<body>
    <div class="ambient-glow"></div>

    <header>
        <div class="logo-group">
            <div class="logo-icon">PR</div>
            <div class="logo-text">
                <h1>PII Redactor</h1>
                <p>Enterprise Format-Preserving Redaction</p>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1.5rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.85rem; cursor: pointer; user-select: none;">
                <input type="checkbox" id="simulateTraffic" style="accent-color: #8b5cf6; cursor: pointer;">
                Simulate Server Queue Load
            </label>
            <span class="badge-pro">Active Engine</span>
        </div>
    </header>

    <main>
        <!-- Alert Box -->
        <div class="alert" id="errorAlert">
            <span id="errorText">Error text goes here</span>
            <span class="alert-close" onclick="closeAlert()">×</span>
        </div>

        <!-- Stage 1: Upload -->
        <section class="upload-section" id="uploadStage" onclick="triggerFileSelect(event)">
            <div class="upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <h2>Upload document to Redact</h2>
            <p>Drag and drop your Microsoft Word (.docx) file here, or click to browse</p>
            <button class="btn-upload">Choose File</button>
            <input type="file" id="fileInput" accept=".docx" onchange="handleFileSelect(event)">
        </section>

        <!-- Stage 2: Loading -->
        <section class="loading-section" id="loadingStage">
            <div class="spinner"></div>
            <h2 id="loadingTitle">Analyzing Document...</h2>
            <div id="queueStatus" style="display: none; margin: 1.25rem 0; padding: 0.75rem 1.5rem; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-weight: 500; font-size: 0.95rem; color: #a78bfa; text-align: center;">
                Queue Position: <span id="queuePosition">-</span> &nbsp;|&nbsp; Estimated wait: <span id="queueWait">-</span>s
            </div>
            <p id="loadingDesc">Parsing text paragraphs, tables, headers, and running spaCy models to map PII entities.</p>
        </section>

        <!-- Stage 3: Dashboard -->
        <section class="dashboard-section" id="dashboardStage">
            <!-- Stats -->
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="label">Total Detected PII</span>
                    <span class="value" id="statTotal">0</span>
                </div>
                <div class="stat-card">
                    <span class="label">People Names</span>
                    <span class="value" id="statPerson">0</span>
                </div>
                <div class="stat-card">
                    <span class="label">Organizations</span>
                    <span class="value" id="statOrg">0</span>
                </div>
                <div class="stat-card">
                    <span class="label">Structured PII</span>
                    <span class="value" id="statStructured">0</span>
                </div>
            </div>

            <!-- Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <h3 id="docTitle">Document Name.docx</h3>
                        <p>Configure fake replacements. Change suggested faked values manually by editing the inputs.</p>
                        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px;">
                            <span style="font-size: 0.85rem; font-weight: 600; color: #a78bfa; margin-right: 1rem;">Preserve Categories (Skip Redaction):</span>
                            <label style="margin-right: 1rem; font-size: 0.85rem; cursor: pointer;"><input type="checkbox" class="ignore-cb" value="PERSON" onchange="filterTable()"> PERSON</label>
                            <label style="margin-right: 1rem; font-size: 0.85rem; cursor: pointer;"><input type="checkbox" class="ignore-cb" value="ORG" onchange="filterTable()"> ORG</label>
                            <label style="margin-right: 1rem; font-size: 0.85rem; cursor: pointer;"><input type="checkbox" class="ignore-cb" value="EMAIL" onchange="filterTable()"> EMAIL</label>
                            <label style="margin-right: 1rem; font-size: 0.85rem; cursor: pointer;"><input type="checkbox" class="ignore-cb" value="PHONE" onchange="filterTable()"> PHONE</label>
                        </div>
                    </div>
                    <div class="controls-row">
                        <input type="text" class="search-box" id="searchBox" placeholder="Search original text..." oninput="filterTable()">
                        <select class="filter-select" id="typeFilter" onchange="filterTable()">
                            <option value="ALL">All Categories</option>
                            <option value="PERSON">Names (PERSON)</option>
                            <option value="ORG">Companies (ORG)</option>
                            <option value="EMAIL">Emails (EMAIL)</option>
                            <option value="PHONE">Phones (PHONE)</option>
                            <option value="ADDRESS">Addresses (ADDRESS)</option>
                            <option value="CIN">CINs (CIN)</option>
                            <option value="URL">URLs (URL)</option>
                        </select>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">Category</th>
                                <th style="width: 35%">Original Text</th>
                                <th style="width: 10%">Occurrences</th>
                                <th style="width: 40%">Fake Replacement (Editable)</th>
                            </tr>
                        </thead>
                        <tbody id="entitiesTableBody">
                            <!-- Rows injected dynamically -->
                        </tbody>
                    </table>
                </div>

                <div class="panel-footer">
                    <button class="btn-cancel" onclick="resetApp()">Cancel</button>
                    <button class="btn-redact" onclick="submitRedaction()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Redact & Download Document
                    </button>
                </div>
            </div>
        </section>

        <div style="text-align: center; margin-top: 2rem; padding-bottom: 2rem; color: var(--text-muted); font-size: 0.95rem;">
            <p>Submitted by <strong>Raj Gupta</strong> &bull; <a href="mailto:rajgupta8340@gmail.com" style="color: var(--primary); text-decoration: none;">rajgupta8340@gmail.com</a></p>
            <p style="margin-top: 0.75rem; font-size: 0.8rem; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 0.5rem 1rem; border-radius: 6px; display: inline-block; border: 1px solid rgba(239, 68, 68, 0.2);">⚠️ <b>Notice:</b> Taking this project without consent is strictly prohibited. This is an official student assignment project.</p>
        </div>
    </main>

    <script>
        let currentFileId = "";
        let originalFileName = "";
        let rawEntities = [];

        // Drag and Drop listeners
        const dropZone = document.getElementById('uploadStage');
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            }, false);
        });
        dropZone.addEventListener('drop', e => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if(files.length > 0 && files[0].name.endsWith('.docx')) {
                uploadFile(files[0]);
            } else {
                showError("Unsupported file. Please upload a Word Document (.docx).");
            }
        });

        function triggerFileSelect(e) {
            if (e && e.target && e.target.id === 'fileInput') return;
            document.getElementById('fileInput').click();
        }

        function handleFileSelect(e) {
            const files = e.target.files;
            if(files.length > 0) {
                uploadFile(files[0]);
            }
        }

        function closeAlert() {
            document.getElementById('errorAlert').style.display = 'none';
        }

        function showError(msg) {
            const alert = document.getElementById('errorAlert');
            document.getElementById('errorText').innerText = msg;
            alert.style.display = 'flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function uploadFile(file) {
            closeAlert();
            originalFileName = file.name;
            document.getElementById('uploadStage').style.display = 'none';
            document.getElementById('loadingStage').style.display = 'block';

            // Set initial state
            document.getElementById('loadingTitle').innerText = "Submitting File...";
            document.getElementById('loadingDesc').innerText = "Uploading document to secure cache...";
            document.getElementById('queueStatus').style.display = 'none';

            const formData = new FormData();
            formData.append("file", file);

            const simulateTraffic = document.getElementById('simulateTraffic').checked;

            fetch(`/api/analyze?simulate_traffic=${simulateTraffic}`, {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if(!res.ok) {
                    return res.json().then(err => { throw new Error(err.detail || "Server error submitting file") });
                }
                return res.json();
            })
            .then(data => {
                const jobId = data.job_id;
                pollJobStatus(jobId);
            })
            .catch(err => {
                document.getElementById('loadingStage').style.display = 'none';
                document.getElementById('uploadStage').style.display = 'flex';
                showError(err.message);
            });
        }

        function pollJobStatus(jobId) {
            fetch(`/api/job/${jobId}`)
            .then(res => {
                if(!res.ok) {
                    throw new Error("Failed to fetch queue status.");
                }
                return res.json();
            })
            .then(job => {
                if (job.status === "queued") {
                    document.getElementById('loadingTitle').innerText = "Waiting in Server Queue...";
                    document.getElementById('queueStatus').style.display = 'block';
                    document.getElementById('queuePosition').innerText = `${job.position}`;
                    document.getElementById('queueWait').innerText = job.position * 3; // 3 seconds per position estimate
                    document.getElementById('loadingDesc').innerText = "The server is currently busy processing other documents in the queue. Your document will be analyzed automatically when it reaches the front.";

                    // Poll again in 1 second
                    setTimeout(() => pollJobStatus(jobId), 1000);
                }
                else if (job.status === "processing") {
                    document.getElementById('loadingTitle').innerText = "Processing Document...";
                    document.getElementById('queueStatus').style.display = 'block';
                    document.getElementById('queuePosition').innerText = "Active";
                    document.getElementById('queueWait').innerText = "< 5"; // Hardcoded estimate for demo docs
                    document.getElementById('loadingDesc').innerText = job.progress || "Running AI Entity Detection on paragraphs and tables...";

                    // Poll again in 1 second
                    setTimeout(() => pollJobStatus(jobId), 1000);
                }
                else if (job.status === "completed") {
                    currentFileId = job.result.file_id;
                    rawEntities = job.result.entities;
                    renderDashboard(job.result.filename);
                }
                else if (job.status === "failed") {
                    throw new Error(job.error || "Analysis failed.");
                }
            })
            .catch(err => {
                document.getElementById('loadingStage').style.display = 'none';
                document.getElementById('uploadStage').style.display = 'flex';
                showError(err.message);
            });
        }

        function renderDashboard(filename) {
            document.getElementById('loadingStage').style.display = 'none';
            document.getElementById('dashboardStage').style.display = 'flex';
            document.getElementById('docTitle').innerText = filename;

            // Stats counts
            let total = 0;
            let person = 0;
            let org = 0;
            let structured = 0;

            rawEntities.forEach(ent => {
                total += ent.count;
                if(ent.type === 'PERSON') person += ent.count;
                else if(ent.type === 'ORG') org += ent.count;
                else structured += ent.count;
            });

            document.getElementById('statTotal').innerText = total;
            document.getElementById('statPerson').innerText = person;
            document.getElementById('statOrg').innerText = org;
            document.getElementById('statStructured').innerText = structured;

            // Populate table
            const tbody = document.getElementById('entitiesTableBody');
            tbody.innerHTML = "";

            if(rawEntities.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">No PII detected. Document is clean.</td></tr>`;
                return;
            }

            rawEntities.forEach((ent, index) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-index', index);
                tr.setAttribute('data-type', ent.type);
                tr.setAttribute('data-original', ent.original.toLowerCase());

                tr.innerHTML = `
                    <td><span class="badge badge-${ent.type}">${ent.type}</span></td>
                    <td><div class="original-text-wrapper">${escapeHtml(ent.original)}</div></td>
                    <td><span class="occurrence-badge">${ent.count}x</span></td>
                    <td><input type="text" class="replacement-input" value="${escapeHtml(ent.suggested)}" id="input_${index}"></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function filterTable() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const typeFilter = document.getElementById('typeFilter').value;
            const ignoreCheckboxes = Array.from(document.querySelectorAll('.ignore-cb:checked')).map(cb => cb.value);

            const rows = document.querySelectorAll('#entitiesTableBody tr');
            rows.forEach(row => {
                const type = row.getAttribute('data-type');
                const original = row.getAttribute('data-original');
                
                let matchesSearch = original.includes(searchTerm);
                let matchesType = (typeFilter === "ALL" || type === typeFilter);
                let isIgnored = ignoreCheckboxes.includes(type);

                if (matchesSearch && matchesType) {
                    row.style.display = "";
                    if (isIgnored) {
                        row.style.opacity = "0.3";
                        row.style.pointerEvents = "none";
                        row.querySelector('input').disabled = true;
                    } else {
                        row.style.opacity = "1";
                        row.style.pointerEvents = "auto";
                        row.querySelector('input').disabled = false;
                    }
                } else {
                    row.style.display = "none";
                }
            });
        }

        async function submitRedaction() {
            closeAlert();
            const btn = document.querySelector('.btn-redact');
            btn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Redacting...`;
            btn.disabled = true;

            const replacements = [];
            const rows = document.querySelectorAll('#entitiesTableBody tr');
            
            const ignoreCheckboxes = Array.from(document.querySelectorAll('.ignore-cb:checked')).map(cb => cb.value);

            if(rows.length === 0 || rows[0].innerText.includes('No PII')) {
                showError("No entities to redact.");
                btn.innerHTML = `Redact & Download Document`;
                btn.disabled = false;
                return;
            }

            rows.forEach(row => {
                const idx = parseInt(row.getAttribute('data-index'));
                if(isNaN(idx)) return;
                
                const type = rawEntities[idx].type;
                if (ignoreCheckboxes.includes(type)) return; // Skip ignored categories
                
                const inputVal = document.getElementById(`input_${idx}`).value.trim();
                const original = rawEntities[idx].original;

                replacements.push({
                    original: original,
                    type: type,
                    replacement: inputVal || `[${type}_REDACTED]`
                });
            });

            // Call download custom redaction endpoint
            fetch('/api/redact-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: currentFileId,
                    replacements: replacements,
                    ignored_types: ignoreCheckboxes
                })
            })
            .then(res => {
                if(!res.ok) {
                    return res.json().then(err => { throw new Error(err.detail || "Redaction failed") });
                }
                return res.blob();
            })
            .then(blob => {
                // Trigger client download of the redacted doc
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "redacted_" + originalFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                showError(err.message);
            });
        }

        function resetApp() {
            closeAlert();
            currentFileId = "";
            originalFileName = "";
            rawEntities = [];
            document.getElementById('fileInput').value = "";
            document.getElementById('dashboardStage').style.display = 'none';
            document.getElementById('uploadStage').style.display = 'flex';
        }

        function escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>
    """
    return html_content


# ---------------------------------------------------------------------------
# CLI Server Startup
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8083)
