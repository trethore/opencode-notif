import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import type {
  PluginConfig,
  NotificationEventType,
  EffectiveEventConfig,
  MessageContext,
} from './types.js'
export { DEFAULT_MESSAGES } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function getAssetsPath(): string {
  return join(__dirname, 'assets')
}

function stripJsonComments(str: string): string {
  return str.replaceAll(/\/\/.*$/gm, '').replaceAll(/\/\*[\s\S]*?\*\//g, '')
}

function getNextNonWhitespaceChar(str: string, startIndex: number): string | undefined {
  let index = startIndex

  while (index < str.length && /\s/.test(str[index])) {
    index += 1
  }

  return str[index]
}

function getUpdatedEscapeState(char: string, escaped: boolean): boolean {
  if (escaped) {
    return false
  }

  return char === '\\'
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
    }
  }

  return {
    inString: escaped || char !== '"',
    escaped: getUpdatedEscapeState(char, escaped),
  }
}

function isTrailingComma(str: string, index: number): boolean {
  if (str[index] !== ',') {
    return false
  }

  const nextChar = getNextNonWhitespaceChar(str, index + 1)
  return nextChar === '}' || nextChar === ']'
}

function stripTrailingCommas(str: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < str.length; index += 1) {
    const char = str[index]
    const stringState = updateStringState(char, inString, escaped)

    if (inString) {
      result += char
      inString = stringState.inString
      escaped = stringState.escaped
      continue
    }

    if (stringState.inString) {
      inString = true
      result += char
      continue
    }

    if (isTrailingComma(str, index)) {
      continue
    }

    result += char
  }

  return result
}

export function loadConfig(): PluginConfig {
  const configPath = join(__dirname, 'notif.jsonc')

  if (!existsSync(configPath)) {
    console.error(
      `Config file not found: ${configPath}. Using default settings.`
    )
    return {}
  }

  let content: string
  try {
    content = readFileSync(configPath, 'utf-8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `Failed to read config file: ${message}. Using default settings.`
    )
    return {}
  }

  try {
    const stripped = stripTrailingCommas(stripJsonComments(content))
    return JSON.parse(stripped) as PluginConfig
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `Failed to parse config file (invalid JSON): ${message}. Using default settings.`
    )
    return {}
  }
}

export function getEffectiveConfig(
  config: PluginConfig,
  eventType: NotificationEventType
): EffectiveEventConfig {
  const eventConfig = config.permissions?.[eventType] ?? {}

  return {
    enabled: eventConfig.enabled ?? true,
    showDesktopNotification:
      eventConfig.showDesktopNotification ??
      config.showDesktopNotification ??
      true,
    soundAlert: eventConfig.soundAlert ?? config.soundAlert ?? true,
    soundFile: eventConfig.soundFile ?? config.soundFile ?? 'default.mp3',
    volume: eventConfig.volume ?? config.volume ?? 0.8,
    message: eventConfig.message ?? null,
  }
}

export function formatMessage(
  template: string | null,
  defaultMessage: string,
  context: MessageContext
): string {
  const message = template ?? defaultMessage

  return message
    .replaceAll('{projectName}', context.projectName ?? 'Unknown Project')
    .replaceAll('{eventType}', context.eventType)
}
