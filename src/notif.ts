import { basename } from 'path'
import type { Plugin } from '@opencode-ai/plugin'
import type { NotificationEventType, PluginConfig, BunShell } from './types.js'
import {
  loadConfig,
  getEffectiveConfig,
  formatMessage,
  DEFAULT_MESSAGES,
} from './config.js'
import { CooldownManager } from './cooldown.js'
import { sendNotification, playNotificationSound } from './notifications.js'

function isQuestionTool(tool: string): boolean {
  return tool === 'mcp_question' || tool === 'question'
}

function getProjectName(directory: string, worktree: string): string | null {
  const projectPath = worktree || directory
  return projectPath ? basename(projectPath) : null
}

async function handleEvent(
  event: { type: string },
  config: PluginConfig,
  cooldownManager: CooldownManager,
  projectName: string | null,
  $: BunShell
): Promise<void> {
  if (event.type === 'session.idle') {
    await handleNotification(
      config,
      cooldownManager,
      'generationCompleted',
      projectName,
      $
    )
  }

  if (event.type === 'session.error') {
    await handleNotification(
      config,
      cooldownManager,
      'sessionError',
      projectName,
      $
    )
  }

  if (event.type === 'permission.asked') {
    await handleNotification(
      config,
      cooldownManager,
      'permissionRequested',
      projectName,
      $
    )
  }
}

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
    promises.push(
      playNotificationSound(
        effectiveConfig.soundFile,
        effectiveConfig.volume,
        $
      )
    )
  }

  await Promise.all(promises)
}

export const NotificationPlugin: Plugin = async ({
  $,
  directory,
  worktree,
}) => {
  const config = loadConfig()
  const cooldownManager = new CooldownManager(config.cooldown ?? 30)
  const projectName = getProjectName(directory, worktree)

  return {
    event: async ({ event }) => {
      await handleEvent(event, config, cooldownManager, projectName, $)
    },

    'tool.execute.before': async (
      input: { tool: string },
      _output: unknown
    ) => {
      if (isQuestionTool(input.tool)) {
        await handleNotification(
          config,
          cooldownManager,
          'questionAsked',
          projectName,
          $
        )
      }
    },
  }
}
