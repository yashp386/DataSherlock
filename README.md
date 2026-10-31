# DataSherlock

**Don't just visualize your data. Investigate it.**

DataSherlock is an open-source multimodal AI data investigation prototype powered by **Gemma 4**. Upload CSV and Excel datasets, PDF reports, and dashboard screenshots. Its coordinated specialist agents profile data, analyze visualizations, detect statistical anomalies, execute validated analytical queries, and synthesize evidence-backed findings.

## Key Features

- **Multimodal Analysis:** Investigate structured datasets, PDF reports, and dashboard screenshots.
- **Multi-Agent Investigation:** Coordinate specialist agents for profiling, visual analysis, anomaly detection, querying, and reporting.
- **Automated Anomaly Detection:** Identify statistical outliers and significant period-to-period changes.
- **Natural Language Queries:** Ask questions about your data and receive analytical results.
- **Validated SQL Execution:** Convert constrained query plans into DuckDB SQL through backend validation.
- **Evidence-Based Reports:** Combine analytical results and observations into a structured investigation report.
- **Interactive Visualizations:** Display charts and analytical results in a dashboard.

## Technology Stack

| Component | Technology |
|---|---|
| AI Model | Gemma 4 through Gemini API |
| Backend | Python, FastAPI |
| Frontend | React, Vite |
| Data Processing | Pandas |
| Query Engine | DuckDB |
| Visualization | Custom SVG charts |
| Deployment | Docker |

## Architecture

DataSherlock uses a coordinated workflow of five specialist agents:

1. **Data Profiler:** Profiles CSV and Excel datasets using Pandas.
2. **Visual Analyst:** Uses Gemma 4 vision capabilities to interpret dashboard screenshots.
3. **Anomaly Investigator:** Detects outliers using the IQR method and identifies large period changes.
4. **Query Analyst:** Generates constrained aggregation plans. The backend validates identifiers and constructs DuckDB SQL.
5. **Lead Investigator:** Synthesizes the collected evidence into a structured investigation report.

This is a coordinated specialist workflow, not five independently deployed language models. The agents share analysis results through the application.

## Supported Input Formats

- CSV: `.csv`
- Excel: `.xlsx`, `.xlsm`
- PDF: `.pdf` (embedded text extraction)
- Images: `.png`, `.jpg`, `.jpeg`, `.webp`

### Processing Limits

- Maximum file size: 15 MB per file
- Maximum files per request: 12
- Maximum Excel sheets per workbook: 5
- Maximum rows per sheet: 100,000
- Maximum PDF pages: 30
- Maximum dashboard screenshots: 3

## Getting Started

### Prerequisites

- Python 3.11 or later
- Node.js and npm
- Git
- A Gemini API key
- Docker (optional, for containerized execution)

### 1. Clone the Repository

```powershell
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd datasherlock
```

### 2. Set Up the Backend

Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create your environment file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your Gemini API key and model configuration:

```env
GEMINI_API_KEY=your_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
PORT=8080
```

Keep your actual API key private.

### 3. Start the Backend

From the project root:

```powershell
uvicorn backend.main:app --reload --port 8080
```

Backend health endpoint:

`http://localhost:8080/api/health`

### 4. Set Up the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
"VITE_API_BASE=http://localhost:8080" | Set-Content .env.local
npm run dev
```

Open the application:

`http://localhost:5173`

## Run with Docker

Build the Docker image from the project root:

```powershell
docker build -t datasherlock .
```

Run the container:

```powershell
docker run --rm -p 8080:8080 --env-file .env datasherlock
```

Open:

`http://localhost:8080`

The Docker image builds the frontend and packages it with the FastAPI backend.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend health and configuration |
| POST | `/api/investigate` | Submit files and an investigation question |

The investigation endpoint accepts multipart form data:

- `files`: One or more supported files.
- `question`: Natural-language investigation question.

## Safety and Limitations

- Model-generated SQL is never executed directly. The Query Analyst produces a constrained JSON aggregation plan, and the backend validates identifiers and constructs SQL.
- Anomaly flags are statistical signals, not proof of fraud, errors, or causation.
- PDF processing extracts embedded text. Scanned PDFs requiring OCR are not fully supported.
- Dashboard screenshot observations are hypotheses until verified against source data.
- Excel formulas, macros, and complex workbook formatting are not evaluated.
- Uploaded files are processed in memory and are not persisted by this demo.
- Dashboard images, extracted PDF text, dataset profiles, sample rows, and analysis context are sent to the Gemini API.
- Do not upload confidential, personal, regulated, or sensitive datasets. Review Google's API data-handling terms before use.
- This prototype is not designed for confidential, regulated, or high-stakes data.

## Deployment

The repository includes a Dockerfile suitable for container-based deployment. DigitalOcean App Platform deployment instructions can be configured using the root Dockerfile, port `8080`, and the required environment variables.

**Note:** Cloud deployment should be tested separately before treating it as production-ready.

## License

This project is licensed under the MIT License for the original project code. Review the Gemma model terms and third-party dependency licenses separately.