import path from 'node:path';
import type { Plugin } from '@opencode-ai/plugin';
import type { NotificationEventType, PluginConfig, BunShell } from './types.js';
import { loadConfig, getEffectiveConfig, formatMessage, DEFAULT_MESSAGES } from './config.js';
import { CooldownManager } from './cooldown.js';
import { sendNotification, playNotificationSound } from './notifications.js';

type SessionEvent = {
  type: string;
  properties?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== undefined && value instanceof Object;
}

function isIdleStatus(event: SessionEvent): boolean {
  if (event.type !== 'session.status') return false;
  if (!isObject(event.properties)) return false;

  const props = event.properties as { status?: unknown };
  if (!isObject(props.status)) return false;

  return (props.status as { type?: unknown }).type === 'idle';
}

function getProjectName(directory: string, worktree: string): string | undefined {
  const projectPath = worktree || directory;
  return projectPath ? path.basename(projectPath) : undefined;
}

async function handleEvent(
  event: SessionEvent,
  config: PluginConfig,
  cooldownManager: CooldownManager,
  projectName: string | undefined,
  $: BunShell
): Promise<void> {
  if (isIdleStatus(event)) {
    await handleNotification(config, cooldownManager, 'generationCompleted', projectName, $);
  }

  if (event.type === 'session.error') {
    await handleNotification(config, cooldownManager, 'sessionError', projectName, $);
  }

  if (event.type === 'permission.asked') {
    await handleNotification(config, cooldownManager, 'permissionRequested', projectName, $);
  }
}

async function handleNotification(
  config: PluginConfig,
  cooldownManager: CooldownManager,
  eventType: NotificationEventType,
  projectName: string | undefined,
  $: BunShell
): Promise<void> {
  if (config.enabled === false) return;

  const effectiveConfig = getEffectiveConfig(config, eventType);
  if (!effectiveConfig.enabled) return;
  if (!cooldownManager.canNotify()) return;

  const message = formatMessage(effectiveConfig.message, DEFAULT_MESSAGES[eventType], {
    projectName,
    eventType,
  });

  const promises: Promise<void>[] = [];

  if (effectiveConfig.showDesktopNotification) {
    promises.push(sendNotification('OpenCode', message, $));
  }

  if (effectiveConfig.soundAlert) {
    promises.push(playNotificationSound(effectiveConfig.soundFile, effectiveConfig.volume, $));
  }

  await Promise.all(promises);
}

export const NotificationPlugin: Plugin = async ({ $, directory, worktree }) => {
  const config = loadConfig();
  const cooldownManager = new CooldownManager(config.cooldown ?? 30);
  const projectName = getProjectName(directory, worktree);

  return {
    event: async ({ event }) => {
      await handleEvent(event, config, cooldownManager, projectName, $);
    },

    'tool.execute.before': async (input: { tool: string }, _output: unknown) => {
      if (input.tool === 'question') {
        await handleNotification(config, cooldownManager, 'questionAsked', projectName, $);
      }
    },
  };
};
