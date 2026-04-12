import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type {
  PluginConfig,
  NotificationEventType,
  EffectiveEventConfig,
  MessageContext,
} from './types.js';
export { DEFAULT_MESSAGES } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = 'notif.jsonc';

export function getAssetsPath(): string {
  return path.join(__dirname, 'assets', 'notif');
}

function resolveConfigPath(): { path?: string; tried: string[] } {
  const tried = [path.join(__dirname, CONFIG_FILE)];
  const localConfigPath = tried[0];

  if (existsSync(localConfigPath)) {
    return { path: localConfigPath, tried };
  }

  if (path.basename(__dirname) === 'src') {
    const rootConfigPath = path.join(__dirname, '..', CONFIG_FILE);
    tried.push(rootConfigPath);

    if (existsSync(rootConfigPath)) {
      return { path: rootConfigPath, tried };
    }
  }

  return { tried };
}

function stripJsonComments(str: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < str.length; index += 1) {
    const char = str[index];
    const next = str[index + 1];

    if (!inString && char === '/' && next === '/') {
      index += 1;

      while (index + 1 < str.length && str[index + 1] !== '\n' && str[index + 1] !== '\r') {
        index += 1;
      }

      continue;
    }

    if (!inString && char === '/' && next === '*') {
      index += 1;

      while (index + 1 < str.length) {
        if (str[index + 1] === '*' && str[index + 2] === '/') {
          index += 2;
          break;
        }

        index += 1;
      }

      continue;
    }

    result += char;
    const state = updateStringState(char, inString, escaped);
    inString = state.inString;
    escaped = state.escaped;
  }

  return result;
}

function getNextNonWhitespaceChar(str: string, startIndex: number): string | undefined {
  let index = startIndex;

  while (index < str.length && /\s/.test(str[index])) {
    index += 1;
  }

  return str[index];
}

function getUpdatedEscapeState(char: string, escaped: boolean): boolean {
  if (escaped) {
    return false;
  }

  return char === '\\';
}

function updateStringState(
  char: string,
  inString: boolean,
  escaped: boolean
): { inString: boolean; escaped: boolean } {
  if (!inString) {
    return {
      inString: char === '"',
      escaped: false,
    };
  }

  return {
    inString: escaped || char !== '"',
    escaped: getUpdatedEscapeState(char, escaped),
  };
}

function isTrailingComma(str: string, index: number): boolean {
  if (str[index] !== ',') {
    return false;
  }

  const nextChar = getNextNonWhitespaceChar(str, index + 1);
  return nextChar === '}' || nextChar === ']';
}

function stripTrailingCommas(str: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < str.length; index += 1) {
    const char = str[index];
    const stringState = updateStringState(char, inString, escaped);

    if (inString) {
      result += char;
      inString = stringState.inString;
      escaped = stringState.escaped;
      continue;
    }

    if (stringState.inString) {
      inString = true;
      result += char;
      continue;
    }

    if (isTrailingComma(str, index)) {
      continue;
    }

    result += char;
  }

  return result;
}

export function loadConfig(): PluginConfig {
  const config = resolveConfigPath();

  if (!config.path) {
    console.error(
      `Config file not found. Looked in: ${config.tried.join(', ')}. Using default settings.`
    );
    return {};
  }

  let content: string;
  try {
    content = readFileSync(config.path, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read config file: ${message}. Using default settings.`);
    return {};
  }

  try {
    const stripped = stripTrailingCommas(stripJsonComments(content));
    return JSON.parse(stripped) as PluginConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to parse config file (invalid JSON): ${message}. Using default settings.`
    );
    return {};
  }
}

export function getEffectiveConfig(
  config: PluginConfig,
  eventType: NotificationEventType
): EffectiveEventConfig {
  const eventConfig = config.permissions?.[eventType] ?? {};

  return {
    enabled: eventConfig.enabled ?? true,
    showDesktopNotification:
      eventConfig.showDesktopNotification ?? config.showDesktopNotification ?? true,
    soundAlert: eventConfig.soundAlert ?? config.soundAlert ?? true,
    soundFile: eventConfig.soundFile ?? config.soundFile ?? 'default.mp3',
    volume: eventConfig.volume ?? config.volume ?? 0.8,
    message: eventConfig.message,
  };
}

export function formatMessage(
  template: string | undefined,
  defaultMessage: string,
  context: MessageContext
): string {
  const message = template ?? defaultMessage;

  return message
    .replaceAll('{projectName}', context.projectName ?? 'Unknown Project')
    .replaceAll('{eventType}', context.eventType);
}
