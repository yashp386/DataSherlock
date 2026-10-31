import React from "react";

function formatLabel(value, monthly) {
  const raw = String(value);

  if (monthly) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
  }

  return raw.length > 12 ? raw.slice(0, 11) + "…" : raw;
}

function DataChart({ query, index }) {
  const rows = query.rows || [];

  if (
    query.status !== "executed" ||
    rows.length === 0 ||
    rows[0].group_value == null ||
    typeof rows[0].result !== "number"
  ) {
    return null;
  }

  const width = 620;
  const height = 260;
  const left = 62;
  const right = 22;
  const top = 30;
  const bottom = 62;

  const values = rows.map(row => Number(row.result));
  const max = Math.max(...values, 1);
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const isMonthly = rows.some(row =>
    /^\d{4}-\d{2}-\d{2}/.test(String(row.group_value))
  );

  const earlierMax = isMonthly && values.length > 1
    ? Math.max(...values.slice(0, -1))
    : 0;

  const anomalyIndex = isMonthly && values.length > 1 &&
    values[values.length - 1] > earlierMax * 1.5
      ? values.length - 1
      : -1;

  const points = rows.map((row, i) => {
    const x = left + (
      rows.length === 1
        ? chartWidth / 2
        : (i / (rows.length - 1)) * chartWidth
    );

    const y = top + chartHeight - (Number(row.result) / max) * chartHeight;

    return {
      x,
      y,
      value: Number(row.result),
      label: String(row.group_value),
      displayLabel: formatLabel(row.group_value, isMonthly)
    };
  });

  const line = points.map(point => `${point.x},${point.y}`).join(" ");

  const purpose = query.purpose || `Query ${index + 1}`;
  const lowerPurpose = purpose.toLowerCase();

  let subtitle = "Revenue comparison";
  if (isMonthly) subtitle = "Monthly trend";
  else if (lowerPurpose.includes("product")) subtitle = "Revenue by product";
  else if (lowerPurpose.includes("region")) subtitle = "Revenue by region";
  else if (lowerPurpose.includes("categor")) subtitle = "Revenue by category";

  const isAnomalyQuery = lowerPurpose.includes("anomal") ||
    lowerPurpose.includes("spike");

  return (
    <div className="chart-card">
      <div className="chart-heading">
        <div>
          <b>{purpose}</b>
          <small>{subtitle}{anomalyIndex >= 0 || isAnomalyQuery ? " · anomaly view" : ""}</small>
        </div>
        <span>QUERY {query.query_number || index + 1}</span>
      </div>

      <div className="chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={purpose}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
            const y = top + chartHeight * fraction;
            return (
              <g key={i}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="rgba(148,163,184,.17)"
                  strokeDasharray="4 4"
                />
                <text
                  x={left - 9}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8998ae"
                  fontSize="10"
                >
                  {Math.round(max * (1 - fraction)).toLocaleString()}
                </text>
              </g>
            );
          })}

          {isMonthly ? (
            <>
              <polyline
                points={line}
                fill="none"
                stroke="#9b8cff"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((point, i) => (
                <g key={i}>
                  {i === anomalyIndex && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="10"
                      fill="rgba(251,113,133,.18)"
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={i === anomalyIndex ? 6 : 4.5}
                    fill={i === anomalyIndex ? "#fb7185" : "#5ce1c1"}
                    stroke="#111827"
                    strokeWidth="2"
                  />
                  <title>{point.label}: {point.value.toLocaleString()}</title>
                </g>
              ))}
            </>
          ) : (
            points.map((point, i) => {
              const barWidth = Math.min(48, chartWidth / points.length * 0.55);
              const highlight = isAnomalyQuery && i === 0;

              return (
                <g key={i}>
                  <rect
                    x={point.x - barWidth / 2}
                    y={point.y}
                    width={barWidth}
                    height={Math.max(1, top + chartHeight - point.y)}
                    rx="5"
                    fill={highlight || i === 0 ? "#9b8cff" : "#5d74b9"}
                  >
                    <title>{point.label}: {point.value.toLocaleString()}</title>
                  </rect>
                  <text
                    x={point.x}
                    y={Math.max(top - 5, point.y - 8)}
                    textAnchor="middle"
                    fill="#dce4f2"
                    fontSize="10"
                  >
                    {point.value.toLocaleString()}
                  </text>
                </g>
              );
            })
          )}

          {points.map((point, i) => (
            <text
              key={i}
              x={point.x}
              y={height - 27}
              textAnchor="middle"
              fill={i === anomalyIndex ? "#fb9aa8" : "#9aa8bd"}
              fontSize="10"
            >
              {point.displayLabel}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function Charts({ queries = [] }) {
  const validQueries = queries.filter(query =>
    query.status === "executed" &&
    Array.isArray(query.rows) &&
    query.rows.length > 0 &&
    query.rows[0].group_value != null &&
    typeof query.rows[0].result === "number"
  );

  if (!validQueries.length) return null;

  return (
    <section className="charts-section">
      <h3>Visual analytics</h3>
      <p>Charts generated directly from validated query results.</p>
      <div className="charts-grid">
        {validQueries.map((query, index) => (
          <DataChart
            key={query.query_number || index}
            query={query}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
