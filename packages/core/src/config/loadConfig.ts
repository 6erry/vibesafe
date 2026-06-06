import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import type { RuleProfile, VibeSafeConfig } from "../types";
import { defaultConfig, mergeConfig, profileRuleDefaults } from "./schema";

const configNames = [".vibesafe.yml", ".vibesafe.yaml"];

export function loadConfig(
  cwd: string,
  overrides: Partial<VibeSafeConfig> = {},
): VibeSafeConfig {
  const found = configNames.find((name) => existsSync(join(cwd, name)));
  const fileConfig = found ? parseConfigFile(join(cwd, found)) : defaultConfig;
  return mergeConfig({
    ...fileConfig,
    ...overrides,
    scan: {
      ...fileConfig.scan,
      ...overrides.scan,
    },
    rules: {
      ...fileConfig.rules,
      ...overrides.rules,
    },
    agent: {
      ...fileConfig.agent,
      ...overrides.agent,
    },
  });
}

export function configFileExists(cwd: string): boolean {
  return configNames.some((name) => existsSync(join(cwd, name)));
}

export function configTemplate(profile: RuleProfile = "recommended"): string {
  return YAML.stringify({
    version: 1,
    profile,
    scan: {
      mode: "diff",
      include: ["**/*"],
      exclude: defaultConfig.scan.exclude,
    },
    rules: profileRuleDefaults[profile],
    agent: defaultConfig.agent,
  });
}

function parseConfigFile(path: string): VibeSafeConfig {
  try {
    const parsed = YAML.parse(readFileSync(path, "utf8"));
    return mergeConfig(parsed);
  } catch {
    return structuredClone(defaultConfig);
  }
}
