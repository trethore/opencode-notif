import { basename } from 'path'
import type {
  PluginContext,
  PluginEvent,
  PermissionInput,
  NotificationEventType,
  PluginConfig,
  BunShell,
} from './types.js'
import { loadConfig, getEffectiveConfig, formatMessage, DEFAULT_MESSAGES } from './config.js'
import { CooldownManager } from './cooldown.js'
import { sendNotification, playNotificationSound } from './notifications.js'

async function handleNotification(
  config: PluginConfig,
  cooldownManager: CooldownManager,
  eventType: NotificationEventType,
  projectName: string | null,
  $: BunShell
): Promise<void> {
  if (config.enabled === false) return

  const effectiveConfig = getEffectiveConfig(config, eventType)
  if (!effectiveConfig.enabled) return
  if (!cooldownManager.canNotify()) return

  const message = formatMessage(
    effectiveConfig.message,
    DEFAULT_MESSAGES[eventType],
    { projectName, eventType }
  )

  const promises: Promise<void>[] = []

  if (effectiveConfig.showDesktopNotification) {
    promises.push(sendNotification('OpenCode', message, $))
  }

  if (effectiveConfig.soundAlert) {
    promises.push(playNotificationSound(effectiveConfig.soundFile, effectiveConfig.volume, $))
  }

  await Promise.all(promises)
}

export const NotificationPlugin = async ({ $, directory }: PluginContext) => {
  const config = loadConfig()
  const cooldownManager = new CooldownManager(config.cooldown ?? 30)
  const projectName = directory ? basename(directory) : null

  return {
    event: async ({ event }: { event: PluginEvent }) => {
      if (event.type === 'session.idle') {
        await handleNotification(config, cooldownManager, 'generationCompleted', projectName, $)
      }

      if (event.type === 'session.error') {
        await handleNotification(config, cooldownManager, 'sessionError', projectName, $)
      }
    },

    'permission.ask': async (_input: PermissionInput, _output: unknown) => {
      await handleNotification(config, cooldownManager, 'permissionRequested', projectName, $)
    },

    'tool.execute.before': async (input: { tool: string }, _output: unknown) => {
      if (input.tool === 'mcp_question' || input.tool === 'question') {
        await handleNotification(config, cooldownManager, 'questionAsked', projectName, $)
      }
    },
  }
}
