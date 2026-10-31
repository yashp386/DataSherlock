import os
from io import BytesIO
from pathlib import Path
from typing import List
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader
from .agents.orchestrator import run_investigation

BASE = Path(__file__).resolve().parent.parent
load_dotenv(BASE / ".env")
DIST = BASE / "frontend" / "dist"
MAX_FILE = 15 * 1024 * 1024
MAX_ROWS = 100_000
MAX_FILES = 12

app = FastAPI(title="DataSherlock", version="1.0.0")

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it"),
        "api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
    }

@app.post("/api/investigate")
async def investigate(
    files: List[UploadFile] = File(...),
    question: str = Form("Investigate this data and identify the most important unusual patterns."),
):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")
    if not files or len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Upload between 1 and {MAX_FILES} files.")

    datasets, documents, screenshots = {}, [], []
    for file in files:
        name = file.filename or "uploaded_file"
        ext = Path(name).suffix.lower()
        raw = await file.read()
        if len(raw) > MAX_FILE:
            raise HTTPException(status_code=413, detail=f"{name} exceeds the 15 MB file limit.")
        if not raw:
            continue
        try:
            if ext == ".csv":
                df = pd.read_csv(BytesIO(raw), nrows=MAX_ROWS, low_memory=False)
                datasets[name] = df
            elif ext in {".xlsx", ".xlsm"}:
                sheets = pd.read_excel(BytesIO(raw), sheet_name=None, nrows=MAX_ROWS)
                for sheet, df in list(sheets.items())[:5]:
                    datasets[f"{Path(name).stem}_{sheet}"] = df
            elif ext == ".pdf":
                reader = PdfReader(BytesIO(raw))
                text = "\n".join((page.extract_text() or "") for page in reader.pages[:30])
                documents.append({"source": name, "text": text[:12000]})
            elif ext in {".png", ".jpg", ".jpeg", ".webp"}:
                screenshots.append((name, raw))
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not read {name}: {type(exc).__name__}")

    if not datasets and not screenshots and not documents:
        raise HTTPException(status_code=400, detail="No supported readable files were uploaded.")

    try:
        return run_investigation(datasets, documents, screenshots, question[:3000])
    except Exception as exc:
        print(f"Investigation failed: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail="Investigation failed. Check server logs, model access and try again.")

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    @app.get("/{path:path}")
    def frontend(path: str):
        target = DIST / path
        if path and target.is_file():
            return FileResponse(target)
        return FileResponse(DIST / "index.html")
