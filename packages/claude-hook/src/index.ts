export interface ClaudeHookPayload {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

export type HookDecisionAction = "allow" | "warn" | "block";

export interface HookDecision {
  action: HookDecisionAction;
  ruleId?: string;
  message?: string;
  command?: string;
}

export function evaluateClaudePreToolUse(
  payload: ClaudeHookPayload,
): HookDecision {
  const toolName = payload.tool_name ?? "";
  const input = payload.tool_input ?? {};

  if (/^Read$/i.test(toolName)) {
    const path = stringValue(input.file_path ?? input.path);
    if (path && isSensitiveReadPath(path)) {
      return {
        action: "block",
        ruleId: "agent.read-env-file",
        message: `Reading sensitive file ${path} is blocked by VibeSafe.`,
      };
    }
  }

  if (/^(Edit|Write|MultiEdit)$/i.test(toolName)) {
    const path = stringValue(input.file_path ?? input.path);
    if (path && isSensitiveReadPath(path)) {
      return {
        action: "warn",
        ruleId: "agent.write-sensitive-file",
        message: `Writing ${path} may affect secrets or private key material. Review carefully.`,
      };
    }
  }

  if (/^Bash$/i.test(toolName)) {
    const command = stringValue(input.command);
    if (!command) {
      return { action: "allow" };
    }

    const commandDecision = evaluateShellCommand(command);
    if (commandDecision.action !== "allow") {
      return commandDecision;
    }
  }

  return { action: "allow" };
}

export function evaluateShellCommand(command: string): HookDecision {
  const normalized = command.trim();

  if (
    /\b(cat|less|more|tail|head|sed|awk)\b[^;&|]*\s(?:\.env(?:\.[\w.-]+)?|.*\.pem|.*\.key|id_rsa)\b/i.test(
      normalized,
    )
  ) {
    return {
      action: "block",
      ruleId: "agent.read-env-file",
      command,
      message:
        "Reading environment files or private keys from shell commands is blocked by VibeSafe.",
    };
  }

  const destructivePatterns = [
    /\brm\s+-[^\n]*r[^\n]*f\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+-[^\n]*f[^\n]*d\b/i,
    /\bdrop\s+database\b/i,
    /\bsupabase\s+db\s+reset\b/i,
    /\bfirebase\s+firestore:delete\b/i,
    /\bRemove-Item\b[^\n]*\b-Recurse\b/i,
  ];

  if (destructivePatterns.some((pattern) => pattern.test(normalized))) {
    return {
      action: "block",
      ruleId: "agent.destructive-command",
      command,
      message: "This destructive command is blocked by VibeSafe.",
    };
  }

  const productionPatterns = [
    /\bgit\s+push\b/i,
    /\bnpm\s+publish\b/i,
    /\bfirebase\s+deploy\b/i,
    /\bvercel\b[^\n]*\s--prod\b/i,
    /\bwrangler\s+deploy\b/i,
    /\bsupabase\s+db\s+push\b[^\n]*\s--linked\b/i,
    /\bprisma\s+migrate\s+deploy\b/i,
  ];

  if (productionPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      action: "warn",
      ruleId: "agent.production-deploy",
      command,
      message:
        "This command can affect production or remote state. VibeSafe recommends explicit human approval.",
    };
  }

  return { action: "allow" };
}

export function renderBlockedMessage(decision: HookDecision): string {
  return [
    `Blocked by VibeSafe: ${decision.message ?? "dangerous operation"}`,
    decision.command ? `Command: ${decision.command}` : undefined,
    decision.ruleId ? `Rule: ${decision.ruleId}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderWarningJson(decision: HookDecision): string {
  return JSON.stringify({
    systemMessage: `VibeSafe warning: ${decision.message ?? "review this operation"}${decision.ruleId ? ` (${decision.ruleId})` : ""}`,
  });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isSensitiveReadPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  return (
    /(^|\/)\.env(?:\.[\w.-]+)?$/.test(normalized) ||
    /\.(pem|key)$/.test(normalized) ||
    /(^|\/)id_rsa$/.test(normalized)
  );
}
