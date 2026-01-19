import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'
import type {
  PluginConfig,
  NotificationEventType,
  EffectiveEventConfig,
  MessageContext,
} from './types.js'
import { DEFAULT_MESSAGES } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function getAssetsPath(): string {
  return join(__dirname, 'assets')
}

function stripJsonComments(str: string): string {
  return str
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

export function loadConfig(): PluginConfig {
  const configPath = join(__dirname, 'notif.jsonc')

  if (!existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}. Using default settings.`)
    return {}
  }

  let content: string
  try {
    content = readFileSync(configPath, 'utf-8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to read config file: ${message}. Using default settings.`)
    return {}
  }

  try {
    const stripped = stripJsonComments(content)
    return JSON.parse(stripped) as PluginConfig
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to parse config file (invalid JSON): ${message}. Using default settings.`)
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
    showDesktopNotification: eventConfig.showDesktopNotification ?? config.showDesktopNotification ?? true,
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
    .replace(/{projectName}/g, context.projectName ?? 'Unknown Project')
    .replace(/{eventType}/g, context.eventType)
}

export { DEFAULT_MESSAGES }
