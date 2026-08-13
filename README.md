# PII Redaction Tool — Production Deployment (Azure)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/FastAPI-0.95+-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED.svg" alt="Docker">
  <img src="https://img.shields.io/badge/Azure-Ready-0078D4.svg" alt="Azure">
</p>

An enterprise-grade PII (Personally Identifiable Information) Redaction Engine that processes unstructured Microsoft Word (`.docx`) documents. Designed for high accuracy and context preservation, this tool parses paragraphs and tables, detects sensitive information via hybrid NER & Regex pipelines, and replaces it with **deterministically consistent fake data**.

This repository is fully containerized and configured for zero-downtime deployment on **Microsoft Azure**.

---

## ✨ Enterprise Features

- **Format-Preserving XML Redaction**: Replaces PII at the OpenXML run-level (`docx.text.run.Run`), ensuring surrounding fonts, bolding, colors, and layout remain completely untouched.
- **Linked Relational Faking**: Automatically links names to contact information (e.g., `Rashi Patil` and `rashi.patil@gmail.com` are faked intelligently as `John Doe` and `john.doe@gmail.com` to preserve narrative context).
- **Asynchronous In-Memory Queue**: A lightweight background worker thread processes files sequentially. The client UI polls a status endpoint to view real-time queue position and processing progress (no Redis/Celery required).
- **Domain-Aware AI**: Combines `spaCy` NER (`en_core_web_sm`) with domain-specific re-mapping (e.g., catching false `PERSON` flags on corporate entities with "Limited" or "LLP" suffixes).
- **Interactive UI Dashboard**: An integrated web interface (FastAPI + Vanilla JS) allows users to review AI-suggested fake replacements and manually override them before downloading the final document.

---

## 🏗️ Azure Deployment Guide (Virtual Machine)

This application is packaged using Docker and `docker-compose` for easy deployment on an **Azure Virtual Machine (Linux)**.

### 1. Provision an Azure VM
Create an Ubuntu Linux VM in Azure and open port `80` (HTTP) in the Network Security Group (NSG).
```bash
# Example using Azure CLI
az vm create \
  --resource-group MyResourceGroup \
  --name PiiRedactorVM \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys

# Open Port 80 for the web server
az vm open-port --resource-group MyResourceGroup --name PiiRedactorVM --port 80
```

### 2. Connect and Install Docker
SSH into your new VM and install Docker and Docker Compose:
```bash
ssh azureuser@<VM_PUBLIC_IP>

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker azureuser
```

### 3. Deploy the Application
Transfer your project files to the VM (via `scp` or `git clone`), then build and run the containers in the background:
```bash
# Navigate to the project directory
cd pii-redactor-repo

# Build and start the container detached
docker-compose up -d --build
```
Your PII Redaction Engine is now live and accessible via your VM's public IP address `http://<VM_PUBLIC_IP>`.

---

## ☁️ Cloud Architecture Roadmap (Phase 2)

To transition this POC into a highly available, globally distributed enterprise service, we plan to integrate the following Azure Free Tier services:

1. **Azure Key Vault (Security)**
   * **Purpose**: Currently, the engine uses a local salt (`pii_redaction_salt_2026`) for deterministic hashing. In production, this cryptographic salt will be stored in and retrieved securely from Azure Key Vault to prevent exposure in source code.
2. **Azure Blob Storage (Storage)**
   * **Purpose**: Instead of processing and caching `.docx` files on the VM's local disk, files will be streamed directly to Azure Blob Storage. Post-redaction, the system will generate a secure, time-limited **SAS (Shared Access Signature) URL** for the client to download the redacted document.
3. **Azure Service Bus (Messaging)**
   * **Purpose**: To scale horizontally across multiple VMs or Container Apps, the current in-memory Python queue will be replaced by Azure Service Bus. The web server will publish `RedactionTask` events, and a fleet of independent worker nodes will consume and process them.
4. **Azure Document Intelligence (AI/OCR)**
   * **Purpose**: To expand support beyond structured `.docx` files, we will integrate Azure Document Intelligence to run OCR on PDFs and scanned images, extracting text and bounding boxes to draw redaction rectangles directly onto the original image coordinates.

Link : incoming...

---

## 🚀 Local Development

### Option A: Using Docker (Recommended)
```bash
# Build and run the containers locally
docker-compose up --build

# The UI will be available at http://localhost:80
```

### Option B: Native Python Environment
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download the NLP model
python -m spacy download en_core_web_sm

# 3. Start the FastAPI server
python app.py

# The UI will be available at http://127.0.0.1:8083
```

---

## 📊 Evaluation & Accuracy

The redaction engine was evaluated against a strict ground-truth dataset extracted from a 200,000+ character *Red Herring Prospectus*.

| Metric | Score | Description |
|---|---|---|
| **Target Detection (Recall)** | **100.00%** | Zero leaks. Every targeted ground-truth PII entity was successfully detected and redacted. |
| **Identity Consistency** | **100.00%** | All repeated entities are mapped to the exact same fake replacement preserving document context. |
| **Format Preservation** | **100.00%** | Surrounding XML tags (bold, italic, font colors) remain untouched during redaction. |

*Note: In Enterprise PII Security, **Recall (0 Data Leaks) is the ultimate safety-critical metric**.*

### Run Local Evaluation
You can reproduce the evaluation metrics on the raw prospectus dataset:
```bash
python evaluate.py
```
This generates a detailed `evaluation_report.txt` breaking down performance by entity type.
