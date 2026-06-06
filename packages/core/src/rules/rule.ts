import type { Finding, FindingCategory, ScanContext, Severity } from "../types";

export interface Rule {
  id: string;
  title: string;
  description: string;
  defaultSeverity: Severity;
  category: FindingCategory;
  appliesTo?: string[];
  run(context: ScanContext): Promise<Finding[]> | Finding[];
}
