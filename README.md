# DataSherlock

**Don't just visualize your data. Investigate it.**

DataSherlock is an open-source multimodal AI data investigation prototype powered by **Gemma 4**. It allows users to upload CSV and Excel datasets, PDF reports, and dashboard screenshots. Its coordinated specialist agents profile data, analyze visualizations, detect statistical anomalies, execute validated analytical queries, and synthesize evidence-backed findings.

## Key Features

- **Multimodal Data Analysis:** Investigate structured datasets, PDF reports, and dashboard screenshots.
- **Multi-Agent Investigation:** Coordinate specialist agents for profiling, visual analysis, anomaly detection, querying, and reporting.
- **Automated Anomaly Detection:** Identify statistical outliers and significant period-to-period changes.
- **Natural Language Queries:** Ask questions about uploaded data and receive analytical results.
- **Validated SQL Execution:** Convert constrained query plans into DuckDB SQL through backend validation.
- **Evidence-Based Reports:** Combine analytical results and observations into structured investigation reports.
- **Interactive Visualizations:** Display charts and analytical results through a dashboard.

## Technology Stack

| Component | Technology |
|---|---|
| AI Model | Gemma 4 through Gemini API |
| Backend | Python, FastAPI |
| Frontend | React, Vite |
| Data Processing | Pandas |
| Query Engine | DuckDB |
| Visualization | Custom SVG charts |
| Version Control | Git, GitHub |

## System Architecture

DataSherlock uses a coordinated workflow of five specialist agents:

1. **Data Profiler:** Profiles CSV and Excel datasets using Pandas.
2. **Visual Analyst:** Uses Gemma 4 vision capabilities to interpret dashboard screenshots.
3. **Anomaly Investigator:** Detects outliers using the IQR method and identifies large period-to-period changes.
4. **Query Analyst:** Generates constrained aggregation plans. The backend validates identifiers and constructs DuckDB SQL.
5. **Lead Investigator:** Synthesizes collected evidence into a structured investigation report.

The agents coordinate through the application and share analytical evidence. They are not five independently deployed language models.

## Supported Input Formats

| Format | Extensions | Processing |
|---|---|---|
| CSV | `.csv` | Data profiling and analysis |
| Excel | `.xlsx`, `.xlsm` | Workbook and sheet analysis |
| PDF | `.pdf` | Embedded text extraction |
| Images | `.png`, `.jpg`, `.jpeg`, `.webp` | Dashboard screenshot analysis |

### Processing Limits

- Maximum file size: 15 MB per file
- Maximum files per request: 12
- Maximum Excel sheets per workbook: 5
- Maximum rows per sheet: 100,000
- Maximum PDF pages: 30
- Maximum dashboard screenshots: 3

## Project Structure

```text
DataSherlock/
│
├── backend/
│   ├── agents/
│   │   ├── anomaly.py
│   │   ├── llm.py
│   │   ├── orchestrator.py
│   │   ├── profiler.py
│   │   ├── query_analyst.py
│   │   └── visual_analyst.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── Charts.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── sample_data/
│   ├── dashboard.png
│   ├── demo_sales.csv
│   ├── sales_report.pdf
│   └── test_sales.xlsx
│
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
└── requirements.txt
```

## Getting Started

### Prerequisites

- Python 3.11 or later
- Node.js and npm
- Git
- A Gemini API key

### 1. Clone the Repository

```powershell
git clone https://github.com/yashp386/DataSherlock.git
cd DataSherlock
```

### 2. Set Up the Backend

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install the Python dependencies:

```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMMA_MODEL=gemma-4-26b-a4b-it
PORT=8080
```

Replace the placeholder with your own Gemini API key.

**Never commit your `.env` file or expose your API key in frontend code.**

### 4. Start the Backend

From the project root, run:

```powershell
uvicorn backend.main:app --reload --port 8080
```

Backend health endpoint:

`http://localhost:8080/api/health`

### 5. Set Up and Start the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

Configure the local backend API address:

```powershell
"VITE_API_BASE=http://localhost:8080" | Set-Content .env.local
```

Start the frontend:

```powershell
npm run dev
```

Open the application:

**http://localhost:5173**

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend health and configuration |
| POST | `/api/investigate` | Submit files and an investigation question |

The investigation endpoint accepts multipart form data:

- `files`: One or more supported files.
- `question`: Natural-language investigation question.

## Sample Data

The `sample_data/` directory contains sample files for testing:

- `demo_sales.csv` — Sample structured sales dataset.
- `test_sales.xlsx` — Excel workbook for testing spreadsheet analysis.
- `sales_report.pdf` — PDF report for text extraction.
- `dashboard.png` — Dashboard screenshot for visual analysis.

These files can be used to explore the application's investigation capabilities.

## Deployment

DataSherlock is designed to support cloud deployment. **DigitalOcean App Platform** is a potential hosting option.

A possible deployment architecture consists of:

- **Frontend:** React application deployed as a static site.
- **Backend:** FastAPI application deployed as a Python web service.
- **AI Integration:** Gemini API accessed securely from the backend.

Deployment requires configuring the frontend API address, backend CORS settings, and encrypted environment variables.

Cloud deployment has not yet been completed or verified. The application is currently developed and tested locally.

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

## Future Improvements

- Cloud deployment and production hosting.
- OCR support for scanned PDF documents.
- Expanded anomaly detection methods.
- More advanced analytical query capabilities.
- Improved investigation reporting and visualizations.

## License

This project is licensed under the MIT License for the original project code. Review the Gemma model terms and third-party dependency licenses separately.

## Author

**Yash Prajapati**

GitHub: https://github.com/yashp386