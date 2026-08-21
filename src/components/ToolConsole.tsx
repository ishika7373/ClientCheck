import { useMemo, useState } from "react";
import { CaretRight, Play, Terminal, Trash } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import { describeInput, findTool } from "../tools/registry";
import type { ToolInput, ToolInvocation, ToolLogEntry } from "../tools/types";
import { fmtDuration } from "../lib/format";
import { Button, Eyebrow, Panel, Select, Status, TextInput, Toggle, type Semantic } from "./primitives";

/* The operator facing surface of the tool layer.
 *
 * Compact execution log, not a chat. The panel renders the invocation record
 * exactly as the tool layer produced it: the parameters that went in, each
 * lifecycle phase with its elapsed time, which data source actually answered,
 * the returned record count and the structured result. */

const STATE_LABEL: Record<ToolInvocation["state"], string> = {
  idle: "Idle",
  calling: "Calling",
  success: "Success",
  empty: "Empty result",
  error: "Error",
  "invalid-input": "Invalid input",
  "database-unavailable": "Database unavailable",
};

const STATE_SEMANTIC: Record<ToolInvocation["state"], Semantic> = {
  idle: "info",
  calling: "progress",
  success: "success",
  empty: "review",
  error: "error",
  "invalid-input": "warning",
  "database-unavailable": "error",
};

const PHASE_TEXT: Record<ToolLogEntry["phase"], string> = {
  input: "text-dsc",
  executing: "text-progress",
  source: "text-info",
  result: "text-dsc",
  error: "text-error",
};

function LogLine({ entry }: { entry: ToolLogEntry }) {
  return (
    <div className="grid grid-cols-[104px_1fr_auto] items-baseline gap-2 border-b border-de px-2 py-1 last:border-b-0">
      <span className={`eyebrow ${PHASE_TEXT[entry.phase]}`}>{entry.title}</span>
      <span className="num min-w-0 break-words text-table-sm text-dbd">{entry.detail}</span>
      <span className="num text-[11px] text-dm">{entry.elapsedMs}ms</span>
    </div>
  );
}

function ResultBody({ invocation }: { invocation: ToolInvocation }) {
  const { result } = invocation;
  if (!result) return null;

  if (result.fields?.length) {
    return (
      <div className="border-t border-de">
        {result.fields.map((f) => (
          <div key={f.label} className="grid grid-cols-[160px_1fr] items-baseline gap-2 border-b border-de px-2 py-1 last:border-b-0">
            <span className="eyebrow">{f.label}</span>
            {f.status ? (
              <Status kind={f.status} label={f.value} />
            ) : (
              <span className="num text-table-sm text-dh">{f.value}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (result.columns?.length && result.rows?.length) {
    return (
      <div className="w-full overflow-x-auto border-t border-de">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              {result.columns.map((c) => (
                <th key={c} scope="col" className="eyebrow whitespace-nowrap border-b border-de px-2 py-1 font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="num border-b border-de px-2 py-1 text-table-sm text-dbd">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export function ToolRunRecord({ invocation, compact = false }: { invocation: ToolInvocation; compact?: boolean }) {
  const tool = findTool(invocation.toolName);

  return (
    <div className="border border-de bg-dbg animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-de px-3 py-2">
        <div className="flex items-center gap-2">
          <Eyebrow>Tool call</Eyebrow>
          <span className="num text-table text-dh">{invocation.toolName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Status kind={STATE_SEMANTIC[invocation.state]} label={STATE_LABEL[invocation.state]} />
          <span className="num text-[11px] text-dm">{invocation.startedAt}</span>
        </div>
      </div>

      {!compact && tool ? <div className="border-b border-de px-2 py-1 text-table-sm text-dm">{tool.description}</div> : null}

      <div className="grid grid-cols-[104px_1fr] items-baseline gap-2 border-b border-de px-2 py-1">
        <span className="eyebrow">Input</span>
        <span className="num min-w-0 break-words text-table-sm text-dbd">{describeInput(invocation.input)}</span>
      </div>

      {invocation.state === "invalid-input" && invocation.validationProblems ? (
        <div className="border-b border-de px-3 py-2">
          <Eyebrow className="text-warning">Rejected before execution</Eyebrow>
          <ul className="mt-1 space-y-[2px]">
            {invocation.validationProblems.map((p) => (
              <li key={p} className="text-table-sm text-dbd">
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-1 text-table-sm text-dm">No query was sent. Correct the parameters and run the tool again.</div>
        </div>
      ) : (
        invocation.log.map((entry, i) => <LogLine key={`${entry.phase}-${i}`} entry={entry} />)
      )}

      {invocation.error ? (
        <div className="border-b border-de px-3 py-2">
          <div className="flex items-baseline gap-2">
            <Eyebrow className="text-error">{invocation.error.code}</Eyebrow>
            <span className="text-table-sm text-dbd">{invocation.error.message}</span>
          </div>
          <div className="mt-1 text-table-sm text-dm">{invocation.error.remedy}</div>
        </div>
      ) : null}

      {invocation.state === "empty" ? (
        <div className="border-b border-de px-2 py-1 text-table-sm text-dm">
          The query ran and matched nothing. Widen the filters or check the account identifier.
        </div>
      ) : null}

      <ResultBody invocation={invocation} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="num text-[11px] text-dm">
          {invocation.state === "calling"
            ? "Running..."
            : `Completed ${fmtDuration(invocation.durationMs ?? 0)}`}
          {invocation.result ? `   ${invocation.result.recordCount} ${invocation.result.recordCount === 1 ? "record" : "records"}` : ""}
        </span>
        {invocation.result ? (
          <span className="num text-[11px] text-dm">
            {invocation.result.origin === "supabase" ? "source: supabase" : "source: local fallback dataset"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* Parameter form driven entirely by tool.inputSchema. */
function ParamForm({
  toolName,
  values,
  onChange,
}: {
  toolName: string;
  values: ToolInput;
  onChange: (name: string, value: string | boolean) => void;
}) {
  const tool = findTool(toolName);
  if (!tool) return null;
  return (
    <div className="grid gap-2 px-2 py-1 sm:grid-cols-2">
      {tool.inputSchema.fields.map((f) => (
        <div key={f.name} className="min-w-0">
          <div className="flex items-baseline gap-1">
            <Eyebrow>{f.label}</Eyebrow>
            {f.required ? <span className="eyebrow text-dh">required</span> : null}
          </div>
          <div className="mt-1">
            {f.kind === "enum" && f.options ? (
              <Select
                className="w-full"
                ariaLabel={f.label}
                value={String(values[f.name] ?? f.options[0])}
                options={f.options}
                onChange={(v) => onChange(f.name, v)}
              />
            ) : f.kind === "boolean" ? (
              <Toggle
                label={f.description}
                checked={values[f.name] !== false}
                onChange={(v) => onChange(f.name, v)}
              />
            ) : (
              <TextInput
                ariaLabel={f.label}
                mono
                type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
                value={String(values[f.name] ?? "")}
                placeholder={f.placeholder}
                onChange={(v) => onChange(f.name, v)}
              />
            )}
          </div>
          {f.kind !== "boolean" ? <div className="mt-[2px] text-[11px] leading-[15px] text-dm">{f.description}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function ToolConsole({
  tools,
  accountId,
  defaults = {},
  title = "Tool execution",
  historyLimit = 4,
}: {
  tools: string[];
  accountId?: string;
  defaults?: Record<string, ToolInput>;
  title?: string;
  historyLimit?: number;
}) {
  const { invokeTool, invocations, clearInvocations } = useStore();
  const [selected, setSelected] = useState(tools[0]);
  const [values, setValues] = useState<ToolInput>(() => ({ ...(defaults[tools[0]] ?? {}) }));
  const [running, setRunning] = useState(false);

  const relevant = useMemo(
    () => invocations.filter((i) => (accountId ? i.accountId === accountId : true) && tools.includes(i.toolName)).slice(0, historyLimit),
    [invocations, accountId, tools, historyLimit],
  );

  function pickTool(name: string) {
    setSelected(name);
    setValues({ ...(defaults[name] ?? {}) });
  }

  async function run() {
    setRunning(true);
    await invokeTool(selected, values, accountId);
    setRunning(false);
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-de px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} weight="regular" className="text-dm" aria-hidden />
          <Eyebrow>{title}</Eyebrow>
        </div>
        {invocations.length ? (
          <Button tone="quiet" glyph={Trash} onClick={clearInvocations}>
            Clear log
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-0 border-b border-de">
        {tools.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => pickTool(name)}
            className={`num border-r border-de px-2 py-1 text-table-sm transition-colors duration-200 ${
              selected === name ? "bg-ds text-dh" : "text-dsc hover:text-dh"
            }`}
          >
            <span className="flex items-center gap-1">
              {selected === name ? <CaretRight size={11} weight="regular" className="text-o200" aria-hidden /> : null}
              {name}
            </span>
          </button>
        ))}
      </div>

      <ParamForm toolName={selected} values={values} onChange={(n, v) => setValues((prev) => ({ ...prev, [n]: v }))} />

      <div className="flex items-center justify-between gap-2 border-b border-t border-de px-3 py-2">
        <span className="num text-[11px] text-dm">
          {tools.length} tool{tools.length === 1 ? "" : "s"} available in this context
        </span>
        <Button tone="primary" glyph={Play} onClick={run} disabled={running}>
          {running ? "Executing" : "Invoke tool"}
        </Button>
      </div>

      {historyLimit === 0 ? null : relevant.length === 0 ? (
        <div className="px-2 py-2 text-table-sm text-dm">
          No invocations yet. Set the parameters above and invoke the tool to see the full execution lifecycle.
        </div>
      ) : (
        <div className="space-y-2 p-2">
          {relevant.map((inv) => (
            <ToolRunRecord key={inv.id} invocation={inv} compact />
          ))}
        </div>
      )}
    </Panel>
  );
}
