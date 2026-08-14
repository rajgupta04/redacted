# PII Redaction Tool — Technical Approach & Architecture

This document details the engineering decisions, detection pipelines, and replacement strategies implemented in the PII Redaction Tool.

---

## 🏛️ 1. Architecture Overview

An enterprise PII redaction engine must solve two distinct problems simultaneously:
1. **Perfect Detection**: Minimize False Negatives (privacy leaks) and False Positives (over-redacting standard language).
2. **Document Integrity**: Preserve formatting (fonts, bold/italic markers, paragraph alignment, table layouts) in Microsoft Word (`.docx`) files.

We implemented a **hybrid detection architecture** with a **run-level XML replacement engine**:

```
                       +----------------------------------+
                       |        Input DOCX Document       |
                       +----------------------------------+
                                        |
               +------------------------+------------------------+
               | (Paragraphs, Tables, Headers, Footers)          |
               v                                                 v
  +--------------------------+                      +--------------------------+
  |    Detection Pipeline    |                      |   Formatting Map (XML)   |
  +--------------------------+                      +--------------------------+
  |  1. Regex (Emails, IPs,  |                      | Character Index mapped   |
  |     SSNs, CCs, CINs)     |                      | back to Run indices and  |
  |  2. Heuristics (PINs,    |                      | offsets.                 |
  |     Contact Headers)     |                      +--------------------------+
  |  3. spaCy NER (PERSON,   |                                   |
  |     ORG with remapping)  |                                   |
  +--------------------------+                                   |
               |                                                 |
               v                                                 |
  +--------------------------+                                   |
  |    Entity Resolution     |                                   |
  |  (Overlaps resolved,     |                                   |
  |   sorted by index)       |                                   |
  +--------------------------+                                   |
               |                                                 |
               v                                                 v
  +----------------------------------------------------------------------------+
  |                      Run-Level Replacement Engine                          |
  |  - Seed Faker deterministically: hash(original_text + type + salt)         |
  |  - Write replacement to first run; clear subsequent runs to retain format. |
  +----------------------------------------------------------------------------+
                                        |
                                        v
                       +----------------------------------+
                       |      Redacted Output DOCX        |
                       +----------------------------------+
```

---

## 🛠️ 2. Formatting Preservation (The XML Run Challenge)

In OpenXML (`.docx` structure), text is not stored as flat strings. Paragraphs are composed of multiple **Runs** (`<w:r>` tags). A single run contains text sharing the *exact same styling* (font size, bold, italic, color, underline, hyperlink).

### The Split-Run Problem
Word processors frequently split a single word or entity across multiple runs due to spelling checks, manual editing history, or style changes.
* *Example*: `john.doe@example.com` might be stored as:
  - Run 0: `john.` (Normal)
  - Run 1: `doe` (Bold)
  - Run 2: `@example.com` (Normal)

If you simply search for `john.doe@example.com` in `run.text`, the search fails. If you replace the text at the paragraph level (`paragraph.text = new_text`), Word flattens the paragraph, **destroying all formatting**.

### The Solution: Offset Mapping
We built a character-to-run mapper:
1. Reconstruct the full flat paragraph text.
2. Build an index map: `char_map[i]` points to `(run_index, offset_within_run)`.
3. Detect PII on the flat text to find start and end indices.
4. Execute replacement by modifying runs directly:
   - **Start Run**: Replace text from PII start index with the *fake replacement*. Since this run retains its XML properties, the fake text matches the styling of the original beginning.
   - **Intermediate Runs**: Clear their text entirely.
   - **End Run**: Keep only the suffix text following the PII end index.

---

## 🔍 3. Multi-Layer Detection Strategy

Different PII types require different extraction methodologies:

### A. Regular Expressions (Structured PII)
Designed with specific validations to avoid false positives:
- **Email Addresses**: Matches RFC 5322 specs.
- **Indian Phones**: Matches mobile strings with optional `+91`/`0` and STD landline codes, validated via digit-count limits.
- **SSNs**: Standard US formats, excluding invalid prefixes (e.g. `666`, `000`).
- **Credit Cards**: Matches patterns for major networks, validated via the **Luhn Algorithm Checksum**.
- **CIN / IP / URL**: Matches standard structural formats.
- **Company Name Regex**: Capitalized words ending in standard business suffixes (e.g., `Private Limited`, `LLP`, `Co.`, `Inc.`).

### B. spaCy NER (Contextual PII)
Uses the English pipeline (`en_core_web_sm`) to tag `PERSON` and `ORG` names.
- **remap-layer**: spaCy frequently tags legal/corporate names as `PERSON` (e.g. *"Bijlee Limited"*). We intercepts any `PERSON` entity containing corporate suffixes (`LLP`, `Limited`, etc.) and remaps them to `ORG`.
- **blocklist-layer**: We filtered out 120+ legal/financial nouns (e.g. *"Securities"*, *"Audit Committee"*, *"Objects of the Offer"*) that are misclassified by spaCy.

### C. Heuristic Parsers (Unstructured PII)
- **ContactPersonNameDetector**: Extracts names from slash-delimited contact lines (e.g. `Contact Person: Eric Bacha/ Sachin Gawade/ Pravin Teli...`). Standard NER models fail here due to punctuation. Our parser isolates the contact segment, applies pattern logic, and registers the individual names.
- **AddressDetector**: Finds Indian postal PIN codes, extracts context, checks for address markers ("Taluka", "Floor", "Building"), and expands the boundaries to capture the full mailing address.

---

## 🧬 4. Deterministic Identity Replacement

To maintain readability, the replacement must look realistic and be **consistent**:
* *Raw Text*: `"Kushal Hegde signed the contract. Kushal Hegde is the director."`
* *Bad Redaction*: `"Alice Smith signed the contract. Bob Jones is the director."` (Destroys context)
* *Good Redaction*: `"Lauren Williams signed the contract. Lauren Williams is the director."`

We implement **Hash-Seeded Faker Anonymization**:
1. We compute `hash = md5(original_text.lower() + entity_type + salt)`.
2. We seed the `Faker` instance with this hash: `fake.seed_instance(hash % 2**32)`.
3. Generating a fake value for this seeded instance will **always yield the same fake text** for the same original PII.
4. The replacement mapping is cached in memory for performance and saved to a JSON file for audit records.

---

## 👥 5. Linked Relational Faking (Name-Email Association)

In standard data anonymization, faking name and email entities separately breaks the relational links in the document:
* *Original Name*: `Rashi Patil` ➔ *Fake Name*: `John Doe`
* *Original Email*: `rashhi.patil@gmail.com` ➔ *Fake Email*: `grahammary@example.org` (disconnected)

To resolve this, we designed a **linked anonymization pass**:
1. **Pre-Processing Order**: The backend sorts detected PII so all `PERSON` entities are faked first, fully populating the anonymizer's cache.
2. **Context Matching**: When faking an `EMAIL` (e.g. `rashhi.patil@gmail.com`), the engine extracts the username (`rashhi.patil`) and tokenizes it.
3. **Similarity Search**: It searches the cached `PERSON` replacements. If a name like `Rashi Patil` matches (using substring overlap or edit-distance similarity), the engine retrieves its faked replacement (`John Doe`).
4. **Relational Formatting**: The engine cleans the faked name and formats it into the email structure, outputting `john.doe@gmail.com`. If no name matches, it falls back to standard consistent faking.

---

## 🚦 6. Asynchronous In-Memory Job Queue

To demonstrate production-grade system design without deploying expensive cloud queues (like Celery/Redis), we built an **asynchronous worker queue** directly into the FastAPI server:
1. **Asynchronous Handover**: Upon file upload, the `/api/analyze` endpoint immediately yields a `job_id` and adds it to an in-memory queue.
2. **Background Thread**: A daemon worker thread processes queue jobs sequentially, updating status and granular progress messages in an in-memory database.
3. **Client Polling**: The client interface polls the `/api/job/{job_id}` endpoint every second to fetch:
   * **Queue Position**: How many files are ahead of the current job.
   * **Processing Progress**: Active steps (e.g. *"Parsing paragraphs"*, *"Running AI models"*).
4. **Traffic Simulator**: A toggle allows users to inject simulated workloads into the queue to demonstrate real-time queue position countdowns (e.g. counting down from Position 3 to 1 to Active).

---

## 📊 7. Performance & Trade-offs

1. **Model Size vs. Speed**: We selected `en_core_web_sm` (~12MB) combined with regex/heuristics. This runs in seconds on standard CPUs. While a transformer model (`en_core_web_trf`, ~400MB) offers slightly better raw NER, it requires GPU hardware and is 100x slower. Our heuristics bridged the gap, yielding **100% Recall** on the test dataset.
2. **Recall vs. Precision**: In PII redaction, Recall is critical (0% leakage is the priority). We optimized the pipeline to ensure that all key sensitive elements were captured, accepting that some minor general terms might be over-redacted (False Positives).

---

## 🌐 8. Unified Single-Port Deployment Architecture

To ensure zero-downtime deployment on Microsoft Azure without exposing multiple ports or configuring complex CORS cross-origin policies:

1. **Multi-Stage Docker Pipeline**:
   - **Stage 1 (Node.js Builder)**: Installs npm dependencies and compiles the React SPA into static bundle assets (`frontend/dist/`).
   - **Stage 2 (Python Runtime)**: Copies the compiled `dist/` folder into the Python FastAPI container and runs Uvicorn on Port 80.
2. **FastAPI Static Mount**:
   - Assets are mounted via `StaticFiles(directory="frontend/dist/assets")` at `/assets`.
   - Wildcard route `/{full_path:path}` serves `frontend/dist/index.html` for client-side React routing.
3. **Single Inbound Rule (Azure NSG)**:
   - Both the React UI (`http://<VM_IP>/`) and REST API endpoints (`http://<VM_IP>/api/*`) operate on **Port 80**.
   - Eliminates CORS security issues, reduces network latency, and requires only one HTTP inbound security rule on Azure.

