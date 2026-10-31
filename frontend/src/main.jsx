import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import Charts from "./Charts.jsx";

import {
  Search,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Image,
  Sparkles,
  Database,
  ScanEye,
  Activity,
  Terminal,
  ShieldCheck,
  LoaderCircle,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  BrainCircuit,
  FileChartColumn,
  History,
  Plus,
  ChevronRight,
  Clock3,
  ArrowLeft
} from "lucide-react";


function App() {

  const [files, setFiles] = useState([]);

  const [question, setQuestion] = useState(
    "Investigate this data. Identify unusual patterns, possible causes and the strongest evidence."
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [drag, setDrag] = useState(false);
  const [activeSection, setActiveSection] = useState("new");
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const selectedReport = reports.find(report => report.id === selectedReportId);

  const accept = ".csv,.xlsx,.xlsm,.pdf,.png,.jpg,.jpeg,.webp";

  function addFiles(list) {

    const next = [...files];

    for (const f of Array.from(list)) {

      if (f.size > 15 * 1024 * 1024) {
        setError(`${f.name} is larger than 15 MB.`);
        continue;
      }

      if (!accept.split(",").includes("." + f.name.split(".").pop().toLowerCase())) {
        setError(`Unsupported file: ${f.name}`);
        continue;
      }

      if (next.length < 12 && !next.some(x => x.name === f.name)) {
        next.push(f);
      }
    }

    setFiles(next);
    setData(null);
  }


  async function investigate() {

    if (!files.length) {
      setError("Upload at least one supported file.");
      return;
    }

    setBusy(true);
    setError("");
    setData(null);

    try {

      const body = new FormData();

      files.forEach(f => body.append("files", f));
      body.append("question", question);

      const res = await fetch("/api/investigate", {
        method: "POST",
        body
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || "Investigation failed.");
      }

      setData(json);

      const reportEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: json.report?.title || "Investigation report",
        createdAt: new Date().toISOString(),
        question,
        files: files.map(file => file.name),
        data: json
      };

      setReports(previous => [reportEntry, ...previous]);
      setSelectedReportId(reportEntry.id);
      setActiveSection("reports");

    } catch (e) {

      setError(e.message || "Something went wrong.");

    } finally {

      setBusy(false);
    }
  }


  function download(reportData = data) {

    if (!reportData) return;

    const blob = new Blob(
      [JSON.stringify(reportData, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = "datasherlock-investigation.json";
    a.click();

    URL.revokeObjectURL(a.href);
  }


  const iconFor = f => {

    const ext = f.name.split(".").pop().toLowerCase();

    if (ext === "pdf") return <FileText />;

    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return <Image />;
    }

    return <FileSpreadsheet />;
  };


  const agentNames = [
    "Data Profiler",
    "Visual Analyst",
    "Anomaly Investigator",
    "Query Analyst",
    "Lead Investigator"
  ];

  const agentIcons = [
    <Database />,
    <ScanEye />,
    <Activity />,
    <Terminal />,
    <BrainCircuit />
  ];

  const agentDescriptions = [
    "Profiles tables, columns and data quality",
    "Reads dashboard screenshots with Gemma vision",
    "Flags statistical outliers and large changes",
    "Plans safe aggregations and runs validated SQL",
    "Combines evidence into a final investigation"
  ];


  return (

    <div className="shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <span className="brandicon">
            <Search size={20} />
          </span>

          <span>
            DataSherlock
            <small>AI INVESTIGATION ENGINE</small>
          </span>

        </div>


        <div className="side-label">WORKSPACE</div>

        <button
          className={`nav nav-button ${activeSection === "new" ? "active" : ""}`}
          onClick={() => {
            setActiveSection("new");
            setData(null);
            setError("");
          }}
        >
          <Plus size={17} />
          New investigation
        </button>

        <button
          className={`nav nav-button ${activeSection === "reports" ? "active" : ""}`}
          onClick={() => setActiveSection("reports")}
        >
          <FileChartColumn size={17} />
          Investigation reports
          <span className="nav-count">{reports.length}</span>
        </button>

        <button
          className={`nav nav-button ${activeSection === "history" ? "active" : ""}`}
          onClick={() => setActiveSection("history")}
        >
          <History size={17} />
          Investigation history
        </button>


        <div className="side-label">SPECIALIST AGENTS</div>

        {agentNames.map((name, i) => (

          <div className="agentnav" key={name}>
            {agentIcons[i]}
            {name}
          </div>

        ))}


        <div className="sidebar-bottom">

          <ShieldCheck size={16} />

          Evidence-first AI

          <small>
            Model-generated hypotheses are labeled separately
            from computed facts.
          </small>

        </div>

      </aside>


      {/* MAIN CONTENT */}

      <main className="main">

        <header>

          <div>

            <div className="crumb">
              WORKSPACE <span>/</span> NEW INVESTIGATION
            </div>

            <h1>Investigate your data.</h1>

            <p>
              Upload datasets and dashboard evidence.
              Let your AI agents find the story behind the numbers.
            </p>

          </div>


          <div className="modeltag">
            <span />
            GEMMA 4 POWERED
          </div>

        </header>


        {activeSection === "new" && (
          <div className="content">

            {/* LEFT COLUMN */}

            <section className="leftcol">

              <div className="card">

                <div className="cardhead">

                  <div>
                    <span className="num">01</span>
                    <h2>Evidence workspace</h2>
                  </div>

                  <span className="muted">UP TO 12 FILES</span>

                </div>


                {/* FILE UPLOAD */}

                <div
                  className={`drop ${drag ? "drag" : ""}`}

                  onDragOver={e => {
                    e.preventDefault();
                    setDrag(true);
                  }}

                  onDragLeave={() => setDrag(false)}

                  onDrop={e => {
                    e.preventDefault();
                    setDrag(false);
                    addFiles(e.dataTransfer.files);
                  }}

                  onClick={() => document.getElementById("fileinput").click()}
                >

                  <input
                    id="fileinput"
                    type="file"
                    multiple
                    accept={accept}
                    hidden
                    onChange={e => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <div className="uploadicon">
                    <UploadCloud size={25} />
                  </div>

                  <b>Drop your evidence files here</b>

                  <span>
                    or <strong>browse files</strong>
                  </span>

                  <small>
                    CSV · XLSX · PDF · PNG · JPG · WEBP · 15 MB each
                  </small>

                </div>


                {/* UPLOADED FILES */}

                {files.length > 0 && (

                  <div className="filelist">

                    {files.map((f, i) => (

                      <div className="fileitem" key={`${f.name}-${i}`}>

                        {iconFor(f)}

                        <div>
                          <b>{f.name}</b>
                          <small>{(f.size / 1024).toFixed(0)} KB</small>
                        </div>

                        <button
                          onClick={() => {
                            setFiles(files.filter((_, j) => i !== j));
                            setData(null);
                          }}
                        >
                          Remove
                        </button>

                      </div>

                    ))}

                  </div>

                )}


                {/* INVESTIGATION QUESTION */}

                <div className="field">

                  <label>INVESTIGATION QUESTION</label>

                  <textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    rows="4"
                    placeholder="What would you like to investigate?"
                  />

                </div>


                {error && (

                  <div className="error">
                    <AlertTriangle size={16} />
                    {error}
                  </div>

                )}


                {/* RUN BUTTON */}

                <button
                  className="run"
                  disabled={busy || !files.length}
                  onClick={investigate}
                >

                  {busy ? (

                    <>
                      <LoaderCircle className="spin" />
                      Agents investigating...
                    </>

                  ) : (

                    <>
                      <Sparkles size={17} />
                      Run investigation
                      <ArrowUpRight size={17} />
                    </>

                  )}

                </button>


                <div className="hint">

                  <ShieldCheck size={14} />

                  App does not save uploads. Selected evidence
                  and summaries are sent to the Gemini API;
                  avoid confidential data.

                </div>

              </div>


              {/* WORKFLOW */}

              <div className="workflow card">

                <div className="cardhead">

                  <h2>Investigation workflow</h2>

                  <span className="muted">SPECIALIST AGENTS</span>

                </div>


                {agentNames.map((name, i) => {

                  const agent = data?.agents?.find(a => a.name === name);

                  return (

                    <div className="workflowrow" key={name}>

                      <span className="workflowicon">
                        {agentIcons[i]}
                      </span>

                      <div>
                        <b>{name}</b>
                        <small>{agentDescriptions[i]}</small>
                      </div>

                      <span className="stage">
                        {busy
                          ? "PROCESSING"
                          : agent?.status?.toUpperCase() || "READY"}
                      </span>

                    </div>

                  );

                })}

              </div>

            </section>


            {/* RIGHT COLUMN */}

            <section className="rightcol">

              {!data && !busy && (

                <div className="card empty">

                  <div className="emptyicon">
                    <BrainCircuit size={38} />
                  </div>

                  <h2>Your investigation will appear here</h2>

                  <p>
                    Upload CSV, Excel, PDF or dashboard screenshots,
                    then ask a question. DataSherlock will coordinate
                    its specialist agents.
                  </p>

                  <div className="emptychecks">

                    <span><CheckCircle2 /> Computed evidence</span>
                    <span><CheckCircle2 /> Visual interpretation</span>
                    <span><CheckCircle2 /> Executed analytical queries</span>
                    <span><CheckCircle2 /> Actionable findings</span>

                  </div>

                </div>

              )}


              {busy && (

                <div className="card busy">

                  <LoaderCircle className="spin big" />

                  <h2>Investigating your evidence</h2>

                  <p>
                    Profiling data, inspecting screenshots,
                    detecting anomalies and preparing a report.
                  </p>

                  <div className="busylist">

                    {agentNames.map(x => (
                      <span key={x}>
                        <CheckCircle2 size={15} />
                        {x}
                      </span>
                    ))}

                  </div>

                </div>

              )}


              {data && (

                <Results
                  data={data}
                  download={download}
                />

              )}

            </section>

          </div>
        )}

        {activeSection === "reports" && (
          <section className="workspace-page">
            <div className="page-heading">
              <div>
                <div className="crumb">WORKSPACE <span>/</span> REPORTS</div>
                <h1>Investigation reports.</h1>
                <p>Open completed investigations, review findings, charts and executed SQL.</p>
              </div>
              <button className="secondary-action" onClick={() => {
                setActiveSection("new");
                setData(null);
              }}>
                <Plus size={16} /> New investigation
              </button>
            </div>

            {selectedReport ? (
              <div className="report-detail">
                <button className="back-link" onClick={() => setSelectedReportId(null)}>
                  <ArrowLeft size={15} /> All reports
                </button>
                <div className="report-meta">
                  <span><Clock3 size={14} /> {new Date(selectedReport.createdAt).toLocaleString()}</span>
                  <span>{selectedReport.files.length} source file{selectedReport.files.length === 1 ? "" : "s"}</span>
                </div>
                <div className="card report-question">
                  <span className="muted">INVESTIGATION QUESTION</span>
                  <p>{selectedReport.question}</p>
                  <span className="muted">FILES: {selectedReport.files.join(", ")}</span>
                </div>
                <Results
                  data={selectedReport.data}
                  download={() => download(selectedReport.data)}
                />
              </div>
            ) : reports.length ? (
              <div className="report-grid">
                {reports.map(report => (
                  <button className="report-list-card" key={report.id} onClick={() => setSelectedReportId(report.id)}>
                    <span className="report-card-icon"><FileChartColumn size={20} /></span>
                    <span className="report-card-content">
                      <b>{report.title}</b>
                      <small>{new Date(report.createdAt).toLocaleString()}</small>
                      <small>{report.files.join(", ")}</small>
                      <span className="report-question-preview">{report.question}</span>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="card section-empty">
                <div className="emptyicon"><FileChartColumn size={34} /></div>
                <h2>No investigation reports yet</h2>
                <p>Run your first investigation. Completed reports will appear here with their charts, findings and SQL results.</p>
                <button className="run empty-cta" onClick={() => setActiveSection("new")}>
                  <Plus size={16} /> Start an investigation
                </button>
              </div>
            )}
          </section>
        )}

        {activeSection === "history" && (
          <section className="workspace-page">
            <div className="page-heading">
              <div>
                <div className="crumb">WORKSPACE <span>/</span> HISTORY</div>
                <h1>Investigation history.</h1>
                <p>A chronological record of investigations completed in this browser session.</p>
              </div>
              <span className="history-total">{reports.length} investigation{reports.length === 1 ? "" : "s"}</span>
            </div>

            {reports.length ? (
              <div className="history-list">
                {reports.map((report, index) => (
                  <div className="history-row" key={report.id}>
                    <span className="history-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="history-main">
                      <b>{report.title}</b>
                      <p>{report.question}</p>
                      <small><Clock3 size={13} /> {new Date(report.createdAt).toLocaleString()} · {report.files.join(", ")}</small>
                    </div>
                    <button className="history-open" onClick={() => {
                      setSelectedReportId(report.id);
                      setActiveSection("reports");
                    }}>Open report <ChevronRight size={15} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card section-empty">
                <div className="emptyicon"><History size={34} /></div>
                <h2>Your history is empty</h2>
                <p>Completed investigations will be listed here so you can revisit their reports during this session.</p>
                <button className="run empty-cta" onClick={() => setActiveSection("new")}>
                  <Plus size={16} /> Start an investigation
                </button>
              </div>
            )}
          </section>
        )}


        <footer>

          <span>DataSherlock · Open-source AI investigation</span>

          <span>Gemma 4 · DuckDB · Pandas · FastAPI</span>

        </footer>

      </main>

    </div>

  );

}


/* RESULTS COMPONENT */

function Results({ data, download }) {

  const r = data.report || {};

  // Support both multi-query and legacy single-query responses.
  const queries = data.query_result?.queries?.length

    ? data.query_result.queries

    : data.query_result?.status === "executed"

      ? [{
        query_number: 1,
        status: "executed",
        sql: data.query_result.sql,
        rows: data.query_result.rows || [],
        purpose: "Primary analytical query",
        note: data.query_result.note
      }]

      : [];


  const agents = data.agents || [];


  return (

    <div className="card results">

      {/* REPORT HEADER */}

      <div className="resulttop">

        <div>
          <span className="num">02</span>
          <span className="muted">INVESTIGATION COMPLETE</span>
        </div>

        <button onClick={download}>
          <Download size={15} />
          Export JSON
        </button>

      </div>


      <h2>{r.title || "Investigation report"}</h2>

      {r.executive_summary && (
        <p className="summary">{r.executive_summary}</p>
      )}


      {/* AGENT STATUS */}

      <div className="agentchips">

        {agents.map(a => (

          <span key={a.name}>
            {a.status === "completed"
              ? <CheckCircle2 size={13} />
              : <AlertTriangle size={13} />}

            {a.name}
          </span>

        ))}

      </div>


      {/* KEY FINDINGS */}

      <h3>Key findings</h3>

      {(r.key_findings || []).map((f, i) => (

        <div className="finding" key={i}>

          <div>
            <b>{f.finding}</b>

            {f.severity && (
              <span className={`tag ${f.severity}`}>
                {f.severity}
              </span>
            )}

          </div>

          <p>{f.evidence}</p>

          <small>
            {f.type} · {f.confidence} confidence
          </small>

        </div>

      ))}


      {/* ANSWER */}

      {r.answer_to_question && (

        <>
          <h3>Answer to your question</h3>

          <div className="answer">
            {r.answer_to_question}
          </div>
        </>

      )}


      {/* POSSIBLE EXPLANATIONS */}

      {r.possible_explanations?.length > 0 && (

        <>
          <h3>Possible explanations</h3>

          <ul>
            {r.possible_explanations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>

      )}


      {/* RECOMMENDATIONS */}

      {r.recommended_next_steps?.length > 0 && (

        <>
          <h3>Recommended next steps</h3>

          <ol>
            {r.recommended_next_steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </>

      )}


      {/* MULTI-QUERY RESULTS */}
      <Charts queries={queries} />
      <h3>Executed analytical queries ({queries.length})</h3>


      {queries.length === 0 ? (

        <p className="muted">
          No analytical queries were executed.
        </p>

      ) : (

        queries.map((q, i) => (

          <div
            className="finding query-card"
            key={q.query_number || i}
          >

            <div>

              <b>Query {q.query_number || i + 1}</b>

              <span
                className={`tag ${q.status === "executed" ? "low" : "high"
                  }`}
              >
                {q.status}
              </span>

            </div>


            {q.purpose && (
              <p>{q.purpose}</p>
            )}


            {/* SQL */}

            {q.sql && (

              <>
                <small>SQL statement</small>
                <pre>{q.sql}</pre>
              </>

            )}


            {/* QUERY RESULT TABLE */}

            {q.status === "executed" && Array.isArray(q.rows) && (

              q.rows.length > 0 ? (

                <div className="query-table-wrap">

                  <table className="query-table">

                    <thead>

                      <tr>

                        {Object.keys(q.rows[0]).map(column => (

                          <th key={column}>{column}</th>

                        ))}

                      </tr>

                    </thead>


                    <tbody>

                      {q.rows.map((row, rowIndex) => (

                        <tr key={rowIndex}>

                          {Object.keys(q.rows[0]).map(column => (

                            <td key={column}>

                              {row[column] == null
                                ? "—"
                                : typeof row[column] === "object"
                                  ? JSON.stringify(row[column])
                                  : String(row[column])}

                            </td>

                          ))}

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <p className="muted">
                  Query executed successfully. No rows returned.
                </p>

              )

            )}


            {q.reason && (

              <p className="error">
                {q.reason}
              </p>

            )}


            {q.note && (
              <small>{q.note}</small>
            )}

          </div>

        ))

      )}


      {/* LIMITATIONS */}

      {r.limitations?.length > 0 && (

        <>
          <h3>Limitations</h3>

          <ul>
            {r.limitations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>

      )}


      {/* VISUAL ANALYSIS */}

      {data.visual_analysis?.findings?.length > 0 && (

        <>
          <h3>Visual analysis</h3>

          {data.visual_analysis.findings.map((f, i) => (

            <div className="finding" key={i}>

              <b>{f.observation}</b>

              {f.metric_or_chart && (
                <p>{f.metric_or_chart}</p>
              )}

              {f.approximate_value && (
                <small>Visible value: {f.approximate_value}</small>
              )}

              {f.caveat && (
                <small>{f.caveat}</small>
              )}

            </div>

          ))}

        </>

      )}


      {/* DISCLAIMER */}

      <div className="disclaimer">

        AI-generated analysis. Verify important findings
        against source records before making decisions.
        Statistical anomalies are flags, not proof of
        fraud or error.

      </div>

    </div>

  );

}


ReactDOM.createRoot(document.getElementById("root")).render(<App />);
