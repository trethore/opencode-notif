export type NotificationEventType =
  | 'generationCompleted'
  | 'permissionRequested'
  | 'questionAsked'
  | 'sessionError';

export interface EventNotificationConfig {
  enabled?: boolean;
  showDesktopNotification?: boolean;
  soundAlert?: boolean;
  primaryOnly?: boolean;
  soundFile?: string;
  volume?: number;
  message?: string;
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
  primaryOnly?: boolean;
  soundFile?: string;
  volume?: number;
  cooldown?: number;
  permissions?: PermissionsConfig;
}

export interface EffectiveEventConfig {
  enabled: boolean;
  showDesktopNotification: boolean;
  soundAlert: boolean;
  primaryOnly: boolean;
  soundFile: string;
  volume: number;
  message?: string;
}

export interface MessageContext {
  projectName?: string;
  eventType: NotificationEventType;
}

export const DEFAULT_MESSAGES: Record<NotificationEventType, string> = {
  generationCompleted: 'Generation completed',
  permissionRequested: 'Permission requested',
  questionAsked: 'Question asked',
  sessionError: 'Session error occurred',
};
