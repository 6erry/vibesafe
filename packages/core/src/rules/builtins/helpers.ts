import type {
  Confidence,
  Finding,
  FindingCategory,
  ScannedFile,
  Severity,
} from "../../types";

export interface FindingInput {
  ruleId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  file?: ScannedFile;
  filePath?: string;
  line?: number;
  column?: number;
  message: string;
  evidence?: string;
  recommendation: string;
  confidence?: Confidence;
  references?: string[];
}

export function createFinding(input: FindingInput): Finding {
  const filePath = input.file?.path ?? input.filePath;
  return {
    id: [input.ruleId, filePath, input.line, input.column]
      .filter(Boolean)
      .join(":"),
    ruleId: input.ruleId,
    title: input.title,
    severity: input.severity,
    category: input.category,
    file: filePath,
    line: input.line,
    column: input.column,
    message: input.message,
    evidence: input.evidence,
    recommendation: input.recommendation,
    references: input.references,
    confidence: input.confidence ?? "high",
  };
}

export function findLine(
  content: string,
  pattern: RegExp,
): { line: number; column: number; text: string } | undefined {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = pattern.exec(lines[index]);
    pattern.lastIndex = 0;
    if (match) {
      return {
        line: index + 1,
        column: match.index + 1,
        text: lines[index].trim(),
      };
    }
  }
  return undefined;
}

export function findAllLines(
  content: string,
  pattern: RegExp,
): Array<{ line: number; column: number; text: string; match: string }> {
  const results: Array<{
    line: number;
    column: number;
    text: string;
    match: string;
  }> = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : `${pattern.flags}g`;
    const linePattern = new RegExp(pattern.source, flags);
    for (const match of line.matchAll(linePattern)) {
      results.push({
        line: index + 1,
        column: (match.index ?? 0) + 1,
        text: line.trim(),
        match: match[0],
      });
    }
  }
  return results;
}

export function maskSecret(value: string): string {
  const cleaned = value.trim().replace(/^["']|["']$/g, "");
  if (cleaned.length <= 12) {
    return "********";
  }
  const prefix = cleaned.slice(0, Math.min(8, Math.floor(cleaned.length / 3)));
  const suffix = cleaned.slice(-4);
  return `${prefix}************${suffix}`;
}

export function isFrontendPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.startsWith("src/") ||
    lower.startsWith("app/") ||
    lower.startsWith("pages/") ||
    lower.includes("/components/") ||
    lower.includes("/client") ||
    lower.includes("frontend")
  );
}

export function hasAuthSignal(content: string): boolean {
  return /\b(auth|authenticate|authorization|authorize|requireAuth|requireUser|middleware|session|getServerSession|verifyToken|currentUser)\b/i.test(
    content,
  );
}
