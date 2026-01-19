export type NotificationEventType =
  | 'generationCompleted'
  | 'permissionRequested'
  | 'questionAsked'
  | 'sessionError'

export interface EventNotificationConfig {
  enabled?: boolean
  showDesktopNotification?: boolean
  soundAlert?: boolean
  soundFile?: string
  volume?: number
  message?: string
}

export interface PermissionsConfig {
  generationCompleted?: EventNotificationConfig
  permissionRequested?: EventNotificationConfig
  questionAsked?: EventNotificationConfig
  sessionError?: EventNotificationConfig
}

export interface PluginConfig {
  enabled?: boolean
  showDesktopNotification?: boolean
  soundAlert?: boolean
  soundFile?: string
  volume?: number
  cooldown?: number
  permissions?: PermissionsConfig
}

export interface EffectiveEventConfig {
  enabled: boolean
  showDesktopNotification: boolean
  soundAlert: boolean
  soundFile: string
  volume: number
  message: string | null
}

export interface PluginContext {
  project: unknown
  client: unknown
  $: BunShell
  directory: string
  worktree?: string
}

export interface PluginEvent {
  type: string
  sessionID?: string
}

export interface PermissionInput {
  type: string
}

export interface MessageContext {
  projectName: string | null
  eventType: NotificationEventType
}

export type BunShell = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => { quiet: () => Promise<unknown> }

export const DEFAULT_MESSAGES: Record<NotificationEventType, string> = {
  generationCompleted: 'Generation completed',
  permissionRequested: 'Permission requested',
  questionAsked: 'Question asked',
  sessionError: 'Session error occurred',
}
