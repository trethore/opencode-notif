import path from 'node:path';
import type { Plugin } from '@opencode-ai/plugin';
import type { NotificationEventType } from './types.js';
import { loadConfig, getEffectiveConfig, formatMessage, DEFAULT_MESSAGES } from './config.js';
import { CooldownManager } from './cooldown.js';
import { sendNotification, playNotificationSound } from './notifications.js';

type SessionEvent = {
  type: string;
  properties?: unknown;
};

type SessionCache = Map<string, Promise<boolean>>;

type ResolvedEvent = {
  eventType: NotificationEventType;
  sessionID?: string;
};

type NotificationContext = {
  config: ReturnType<typeof loadConfig>;
  cooldownManager: CooldownManager;
  projectName?: string;
  isPrimary: (sessionID?: string) => Promise<boolean>;
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

function getSessionID(event: SessionEvent): string | undefined {
  if (!isObject(event.properties)) return;

  const props = event.properties as { sessionID?: unknown };
  return typeof props.sessionID === 'string' ? props.sessionID : undefined;
}

function resolveEvent(event: SessionEvent): ResolvedEvent | undefined {
  if (isIdleStatus(event)) {
    return { eventType: 'generationCompleted', sessionID: getSessionID(event) };
  }

  if (event.type === 'session.error') {
    return { eventType: 'sessionError', sessionID: getSessionID(event) };
  }

  if (event.type === 'permission.asked') {
    return { eventType: 'permissionRequested', sessionID: getSessionID(event) };
  }
}

function createPrimarySessionResolver(
  client: Parameters<Plugin>[0]['client'],
  directory: string,
  cache: SessionCache
): (sessionID?: string) => Promise<boolean> {
  return async (sessionID?: string): Promise<boolean> => {
    if (!sessionID) return true;

    const cached = cache.get(sessionID);
    if (cached) return cached;

    const run = client.session
      .get({
        path: { id: sessionID },
        query: { directory },
      })
      .then((result) => !result.data?.parentID)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to load session ${sessionID}: ${message}. Falling back to sound playback.`);
        return true;
      });

    cache.set(sessionID, run);
    return run;
  };
}

async function notifyEvent(
  context: NotificationContext,
  eventType: NotificationEventType,
  sessionID?: string
): Promise<void> {
  if (context.config.enabled === false) return;

  const effectiveConfig = getEffectiveConfig(context.config, eventType);
  if (!effectiveConfig.enabled) return;

  const desktop = effectiveConfig.showDesktopNotification;
  const sound =
    effectiveConfig.soundAlert &&
    (!effectiveConfig.primaryOnly || (await context.isPrimary(sessionID)));

  if (!desktop && !sound) return;
  if (!context.cooldownManager.canNotify()) return;

  const message = formatMessage(effectiveConfig.message, DEFAULT_MESSAGES[eventType], {
    projectName: context.projectName,
    eventType,
  });

  const tasks: Promise<void>[] = [];

  if (desktop) {
    tasks.push(sendNotification('OpenCode', message));
  }

  if (sound) {
    tasks.push(playNotificationSound(effectiveConfig.soundFile, effectiveConfig.volume));
  }

  await Promise.all(tasks);
}

export const NotificationPlugin: Plugin = async ({ client, directory, worktree }) => {
  const config = loadConfig();
  const cooldownManager = new CooldownManager(config.cooldown ?? 30);
  const projectName = getProjectName(directory, worktree);
  const cache: SessionCache = new Map();
  const context: NotificationContext = {
    config,
    cooldownManager,
    projectName,
    isPrimary: createPrimarySessionResolver(client, directory, cache),
  };

  return {
    event: async ({ event }) => {
      const resolved = resolveEvent(event);
      if (!resolved) return;

      await notifyEvent(context, resolved.eventType, resolved.sessionID);
    },

    'tool.execute.before': async (input: { tool: string; sessionID: string }, _output: unknown) => {
      if (input.tool === 'question') {
        await notifyEvent(context, 'questionAsked', input.sessionID);
      }
    },
  };
};
