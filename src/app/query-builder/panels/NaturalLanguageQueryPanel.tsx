"use client";

import { useState, type ReactNode } from "react";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { ScrollableTable } from "@/components/common/ScrollableTable";
import { STICKY_HEADER_CELL } from "@/components/common/tableSticky";

type GeneratedApiCall = {
  method: string;
  endpoint: string;
  pathParameters: Record<string, unknown>;
  queryParameters: Record<string, unknown>;
  body: unknown;
  missingInformation: string[];
};

type ValidationResult = {
  valid: boolean;
  method: string;
  endpoint: string;
  issues: unknown[];
};

type PreparedRequest = {
  method: string;
  url: string;
  query_parameters: Record<string, unknown>;
  body: unknown;
};

type PersistenceResponse = {
  status_code: number;
  content_type: string | null;
  body: unknown;
};

type AgentResponse = {
  status: string;
  received_query: string;
  model: string;
  generated_call?: GeneratedApiCall;
  validation?: ValidationResult;
  prepared_request?: PreparedRequest;
  persistence_response?: PersistenceResponse;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function extractErrorMessage(body: unknown, status: number): string {
  if (isRecord(body)) {
    const detail = body.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (detail !== undefined) {
      return JSON.stringify(detail, null, 2);
    }

    const message = body.message;

    if (typeof message === "string") {
      return message;
    }
  }

  return `Agent request failed with HTTP ${status}.`;
}

export function NaturalLanguageQueryPanel() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setError("Enter a natural-language query.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/agent/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: normalizedQuery,
        }),
      });

      const contentType = res.headers.get("content-type");
      let body: unknown;

      if (contentType?.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      if (!res.ok) {
        setError(extractErrorMessage(body, res.status));
        return;
      }

      setResponse(body as AgentResponse);
    } catch {
      setError("Unable to reach the Agent Service.");
    } finally {
      setLoading(false);
    }
  };

  const resultBody = response?.persistence_response?.body;

  const tableRows =
    Array.isArray(resultBody) && resultBody.every(isRecord)
      ? resultBody
      : null;

  const tableColumns =
    tableRows && tableRows.length > 0
      ? Array.from(
          new Set(tableRows.flatMap((row) => Object.keys(row)))
        )
      : [];

  return (
    <div className="flex gap-8 items-start">
      <div className="w-1/2">
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <label className="block mb-2 font-semibold">
            Natural-language query
          </label>

          <p className="text-sm text-gray-400 mb-4">
            Describe the information you want to retrieve from the WLDT
            Persistence Service.
          </p>

          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={8}
            placeholder={'Example: Mostrami il valore corrente delle proprieta del Digital Twin con id "TEST-001".'}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg resize-y"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || query.trim().length === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Running…" : "Run Natural Language Query"}
        </button>
      </div>

      <div className="w-1/2 relative min-h-64">
        <LoadingOverlay
          open={loading}
          message="Interpreting and running query…"
          mode="inline"
        />

        {error && (
          <div className="p-4 bg-red-900 border border-red-600 rounded-lg mb-4 text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!loading && !error && !response && (
          <div className="p-4 bg-gray-700 rounded-lg text-gray-400 text-center">
            Run a query to see the generated REST call and the backend result.
          </div>
        )}

        {response && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-3">Generated REST Call</h2>

              <div className="p-4 bg-gray-700 rounded-lg space-y-2 text-sm">
                {response.generated_call ? (
                  <>
                    <div>
                      <span className="font-semibold">Method:</span>{" "}
                      {response.generated_call.method}
                    </div>

                    <div>
                      <span className="font-semibold">Endpoint:</span>{" "}
                      <code>{response.generated_call.endpoint}</code>
                    </div>

                    {response.prepared_request && (
                      <div className="break-all">
                        <span className="font-semibold">Prepared URL:</span>{" "}
                        <code>{response.prepared_request.url}</code>
                      </div>
                    )}

                    {response.validation && (
                      <div>
                        <span className="font-semibold">Validation:</span>{" "}
                        <span
                          className={
                            response.validation.valid
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {response.validation.valid ? "valid" : "invalid"}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">
                    No generated REST call available.
                  </span>
                )}
              </div>
            </div>

            {response.persistence_response && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">Query Results</h2>

                  <span className="text-sm text-gray-400">
                    HTTP {response.persistence_response.status_code}
                  </span>
                </div>

                {tableRows && tableRows.length > 0 ? (
                  <ScrollableTable>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          {tableColumns.map((column) => (
                            <th
                              key={column}
                              className={`px-4 py-2 text-left ${STICKY_HEADER_CELL}`}
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {tableRows.map((row, index) => (
                          <tr
                            key={index}
                            className="border-t border-gray-700 hover:bg-gray-700"
                          >
                            {tableColumns.map((column) => (
                              <td
                                key={column}
                                className="px-4 py-2 align-top"
                              >
                                {formatValue(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollableTable>
                ) : Array.isArray(resultBody) &&
                  resultBody.length === 0 ? (
                  <div className="p-4 bg-gray-700 rounded-lg text-gray-400 text-center">
                    The query completed successfully but returned no results.
                  </div>
                ) : (
                  <pre className="p-4 bg-gray-900 border border-gray-700 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                    {JSON.stringify(resultBody, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {response.message && (
              <div className="text-sm text-gray-400">
                {response.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
