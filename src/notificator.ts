import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface SoundConfig {
  enabled?: boolean
  file?: string
  fileSeed?: number
}

interface DesktopNotificationConfig {
  enabled?: boolean
}

interface PluginConfig {
  enabled?: boolean
  showDesktopNotification?: DesktopNotificationConfig
  playSound?: SoundConfig
}

interface PluginContext {
  project: unknown
  client: unknown
  $: (strings: TemplateStringsArray, ...values: unknown[]) => { quiet: () => Promise<unknown> }
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

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function getSoundFiles(): string[] {
  try {
    const soundsDir = join(__dirname, 'assets', 'sounds')
    const files = readdirSync(soundsDir)
      .filter(f => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f))
      .sort()
    return files.length > 0 ? files : ['default.mp3']
  } catch {
    return ['default.mp3']
  }
}

function pickSoundFile(projectPath: string, seed: string | number): string {
  const soundFiles = getSoundFiles()
  const input = `${projectPath}:${seed}`
  const hash = hashString(input)
  const index = hash % soundFiles.length
  return soundFiles[index]
}

let currentSessionID: string | null = null

export const NotificationPlugin = async ({ $, directory, worktree }: PluginContext) => {
  const config = loadConfig()
  const enabled = config.enabled !== false
  const desktopNotificationConfig = config.showDesktopNotification || {}
  const desktopNotificationEnabled = desktopNotificationConfig.enabled !== false
  const soundConfig = config.playSound || {}
  const soundEnabled = soundConfig.enabled !== false
  
  // Determine sound file: explicit file takes priority, then fileSeed, then directory-based with session ID
  let soundFile: string
  if (soundConfig.file) {
    soundFile = soundConfig.file
  } else if (soundConfig.fileSeed !== undefined) {
    soundFile = pickSoundFile(worktree || directory, soundConfig.fileSeed)
  } else if (currentSessionID !== null) {
    soundFile = pickSoundFile(worktree || directory, currentSessionID)
  } else {
    soundFile = pickSoundFile(worktree || directory, hashString(worktree || directory))
  }

  const playNotificationSound = async (): Promise<void> => {
    if (!enabled || !soundEnabled) return
    
    const soundPath = join(__dirname, 'assets', 'sounds', soundFile)
    const platform = process.platform
    
    try {
      if (platform === "darwin") {
        await $`afplay "${soundPath}"`.quiet()
      } else if (platform === "linux") {
        // ffplay handles MP3 properly and is commonly available via ffmpeg
        await $`ffplay -nodisp -autoexit -loglevel quiet ${soundPath}`.quiet()
      }
    } catch {
      // Silently fail - audio is not critical
    }
  }

  const sendNotification = async (title: string, message: string): Promise<void> => {
    if (!enabled || !desktopNotificationEnabled) return
    
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

  return {
    event: async ({ event }: { event: PluginEvent }) => {
      if (event.type === "session.created" && event.sessionID) {
        currentSessionID = event.sessionID
      }
      if (event.type === "session.idle") {
        await sendNotification("OpenCode", "Generation completed")
        await playNotificationSound()
      }
    },
    "permission.ask": async (input: PermissionInput, _output: unknown) => {
      const message = `Permission request: ${input.type}`
      await sendNotification("OpenCode", message)
      await playNotificationSound()
    },
  }
}
