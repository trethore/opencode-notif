import { fileURLToPath } from 'url'
import { dirname, join, basename } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// Type Definitions
// ============================================================================

// Event types that can trigger notifications
type NotificationEventType =
  | 'generationCompleted'  // session.idle
  | 'permissionRequested'  // permission.ask hook
  | 'questionAsked'        // tool.execute.before with question tool
  | 'sessionError'         // session.error

interface EventNotificationConfig {
  enabled?: boolean
  showDesktopNotification?: boolean
  soundAlert?: boolean
  soundFile?: string
  volume?: number
  // Template string with placeholders: {projectName}, {eventType}
  message?: string
}

interface PermissionsConfig {
  generationCompleted?: EventNotificationConfig
  permissionRequested?: EventNotificationConfig
  questionAsked?: EventNotificationConfig
  sessionError?: EventNotificationConfig
}

interface PluginConfig {
  // Master switch
  enabled?: boolean

  // Global defaults
  showDesktopNotification?: boolean
  soundAlert?: boolean
  soundFile?: string
  volume?: number
  cooldown?: number  // seconds, prevents notification spam

  // Per-event overrides
  permissions?: PermissionsConfig
}

interface EffectiveEventConfig {
  enabled: boolean
  showDesktopNotification: boolean
  soundAlert: boolean
  soundFile: string
  volume: number
  message: string | null
}

interface PluginContext {
  project: unknown
  client: unknown
  $: BunShell
  directory: string
  worktree?: string
}

interface PluginEvent {
  type: string
  sessionID?: string
}

interface PermissionInput {
  type: string
}

interface MessageContext {
  projectName: string | null
  eventType: NotificationEventType
}

type BunShell = (strings: TemplateStringsArray, ...values: unknown[]) => { quiet: () => Promise<unknown> }

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MESSAGES: Record<NotificationEventType, string> = {
  generationCompleted: 'Generation completed',
  permissionRequested: 'Permission requested',
  questionAsked: 'Question asked',
  sessionError: 'Session error occurred',
}

// ============================================================================
// Configuration Loading
// ============================================================================

function stripJsonComments(str: string): string {
  return str
    .replace(/\/\/.*$/gm, '')       // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
}

function loadConfig(): PluginConfig {
  try {
    const configPath = join(__dirname, 'config.jsonc')
    const content = readFileSync(configPath, 'utf-8')
    const stripped = stripJsonComments(content)
    return JSON.parse(stripped) as PluginConfig
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Failed to load config.jsonc:', message)
    return {}
  }
}

// ============================================================================
// Config Resolution
// ============================================================================

function getEffectiveConfig(
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

// ============================================================================
// Cooldown Manager
// ============================================================================

class CooldownManager {
  private lastNotificationTime: number = 0
  private cooldownMs: number

  constructor(cooldownSeconds: number) {
    this.cooldownMs = cooldownSeconds * 1000
  }

  canNotify(): boolean {
    const now = Date.now()
    if (now - this.lastNotificationTime >= this.cooldownMs) {
      this.lastNotificationTime = now
      return true
    }
    return false
  }

  updateCooldown(cooldownSeconds: number): void {
    this.cooldownMs = cooldownSeconds * 1000
  }
}

// ============================================================================
// Message Template System
// ============================================================================

function formatMessage(
  template: string | null,
  defaultMessage: string,
  context: MessageContext
): string {
  const message = template ?? defaultMessage

  return message
    .replace(/{projectName}/g, context.projectName ?? 'Unknown Project')
    .replace(/{eventType}/g, context.eventType)
}

// ============================================================================
// Notification Functions
// ============================================================================

const sendNotification = async (
  title: string,
  message: string,
  $: BunShell
): Promise<void> => {
  const platform = process.platform

  try {
    if (platform === "darwin") {
      const escapedMessage = message.replace(/'/g, "'\"'\"'")
      const escapedTitle = title.replace(/'/g, "'\"'\"'")
      await $`osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`.quiet()
    } else if (platform === "linux") {
      await $`notify-send ${title} ${message}`.quiet()
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to send notification:', errorMessage)
  }
}

const playNotificationSound = async (
  soundFile: string,
  volume: number,
  $: BunShell
): Promise<void> => {
  const soundPath = join(__dirname, 'assets', 'sounds', soundFile)
  const platform = process.platform

  // Clamp volume between 0 and 1
  const clampedVolume = Math.max(0, Math.min(1, volume))

  try {
    if (platform === "darwin") {
      // afplay uses volume 0-255, convert from 0-1 scale
      const afplayVolume = Math.round(clampedVolume * 255)
      await $`afplay -v ${afplayVolume / 255} "${soundPath}"`.quiet()
    } else if (platform === "linux") {
      // ffplay uses volume in percentage (0-100)
      await $`ffplay -nodisp -autoexit -loglevel quiet -volume ${Math.round(clampedVolume * 100)} ${soundPath}`.quiet()
    }
  } catch {
    // Silently fail - audio is not critical
  }
}

// ============================================================================
// Unified Event Handler
// ============================================================================

async function handleNotification(
  config: PluginConfig,
  cooldownManager: CooldownManager,
  eventType: NotificationEventType,
  projectName: string | null,
  $: BunShell
): Promise<void> {
  // Check master switch
  if (config.enabled === false) return

  // Get effective config for this event
  const effectiveConfig = getEffectiveConfig(config, eventType)

  // Check if this event type is enabled
  if (!effectiveConfig.enabled) return

  // Check cooldown
  if (!cooldownManager.canNotify()) return

  // Format message
  const message = formatMessage(
    effectiveConfig.message,
    DEFAULT_MESSAGES[eventType],
    { projectName, eventType }
  )

  // Send notifications (in parallel)
  const promises: Promise<void>[] = []

  if (effectiveConfig.showDesktopNotification) {
    promises.push(sendNotification('OpenCode', message, $))
  }

  if (effectiveConfig.soundAlert) {
    promises.push(playNotificationSound(
      effectiveConfig.soundFile,
      effectiveConfig.volume,
      $
    ))
  }

  await Promise.all(promises)
}

// ============================================================================
// Plugin Export
// ============================================================================

export const NotificationPlugin = async ({ $, directory, worktree: _worktree }: PluginContext) => {
  const config = loadConfig()
  const cooldownManager = new CooldownManager(config.cooldown ?? 30)
  const projectName = directory ? basename(directory) : null

  return {
    event: async ({ event }: { event: PluginEvent }) => {
      // Track session for potential future use
      if (event.type === "session.created" && event.sessionID) {
        // Could store session info if needed
      }

      // Generation completed
      if (event.type === "session.idle") {
        await handleNotification(config, cooldownManager, 'generationCompleted', projectName, $)
      }

      // Session error
      if (event.type === "session.error") {
        await handleNotification(config, cooldownManager, 'sessionError', projectName, $)
      }
    },

    // Permission request hook
    "permission.ask": async (_input: PermissionInput, _output: unknown) => {
      await handleNotification(config, cooldownManager, 'permissionRequested', projectName, $)
    },

    // Question tool hook
    "tool.execute.before": async (input: { tool: string }, _output: unknown) => {
      if (input.tool === "mcp_question" || input.tool === "question") {
        await handleNotification(config, cooldownManager, 'questionAsked', projectName, $)
      }
    },
  }
}
