import type { PluginInput } from '@opencode-ai/plugin';

export type NotificationEventType =
  | 'generationCompleted'
  | 'permissionRequested'
  | 'questionAsked'
  | 'sessionError';

export interface EventNotificationConfig {
  enabled?: boolean;
  showDesktopNotification?: boolean;
  soundAlert?: boolean;
  soundFile?: string;
  volume?: number;
  message?: string;
  primaryOnly?: boolean;
}

export interface PermissionsConfig {
  generationCompleted?: EventNotificationConfig;
  permissionRequested?: EventNotificationConfig;
  questionAsked?: EventNotificationConfig;
  sessionError?: EventNotificationConfig;
}

export interface PluginConfig {
  enabled?: boolean;
  showDesktopNotification?: boolean;
  soundAlert?: boolean;
  soundFile?: string;
  volume?: number;
  cooldown?: number;
  primaryOnly?: boolean;
  permissions?: PermissionsConfig;
}

export interface EffectiveEventConfig {
  enabled: boolean;
  showDesktopNotification: boolean;
  soundAlert: boolean;
  soundFile: string;
  volume: number;
  message: string | null;
  primaryOnly: boolean;
}

export interface MessageContext {
  projectName: string | null;
  eventType: NotificationEventType;
}

export interface SessionInfo {
  id: string;
  parentID?: string;
}

export type BunShell = PluginInput['$'];

export const DEFAULT_MESSAGES: Record<NotificationEventType, string> = {
  generationCompleted: 'Generation completed',
  permissionRequested: 'Permission requested',
  questionAsked: 'Question asked',
  sessionError: 'Session error occurred',
};
