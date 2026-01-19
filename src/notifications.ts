import { join } from 'path'
import { existsSync } from 'fs'
import type { BunShell } from './types.js'
import { getAssetsPath } from './config.js'

let notifySendAvailable: boolean | null = null
let ffplayAvailable: boolean | null = null
let unsupportedPlatformWarningShown = false

async function checkCommand($: BunShell, command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet()
    return true
  } catch {
    return false
  }
}

async function checkNotifySend($: BunShell): Promise<boolean> {
  if (notifySendAvailable !== null) return notifySendAvailable
  notifySendAvailable = await checkCommand($, 'notify-send')
  if (!notifySendAvailable) {
    console.error('notify-send is not installed. Install it with: sudo apt install libnotify-bin')
  }
  return notifySendAvailable
}

async function checkFfplay($: BunShell): Promise<boolean> {
  if (ffplayAvailable !== null) return ffplayAvailable
  ffplayAvailable = await checkCommand($, 'ffplay')
  if (!ffplayAvailable) {
    console.error('ffplay is not installed. Install it with: sudo apt install ffmpeg')
  }
  return ffplayAvailable
}

function warnUnsupportedPlatform(platform: string): void {
  if (unsupportedPlatformWarningShown) return
  console.error(`Unsupported platform: ${platform}. Notifications are only supported on macOS and Linux.`)
  unsupportedPlatformWarningShown = true
}

export async function sendNotification(
  title: string,
  message: string,
  $: BunShell
): Promise<void> {
  const platform = process.platform

  try {
    if (platform === 'darwin') {
      const escapedMessage = message.replace(/'/g, "'\"'\"'")
      const escapedTitle = title.replace(/'/g, "'\"'\"'")
      await $`osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`.quiet()
    } else if (platform === 'linux') {
      if (!(await checkNotifySend($))) {
        return
      }
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, ' ')
      const escapedTitle = title.replace(/"/g, '\\"').replace(/\n/g, ' ')
      await $`notify-send "${escapedTitle}" "${escapedMessage}"`.quiet()
    } else {
      warnUnsupportedPlatform(platform)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to send notification:', errorMessage)
  }
}

export async function playNotificationSound(
  soundFile: string,
  volume: number,
  $: BunShell
): Promise<void> {
  const soundPath = join(getAssetsPath(), 'sounds', soundFile)
  const platform = process.platform
  const clampedVolume = Math.max(0, Math.min(1, volume))

  if (!existsSync(soundPath)) {
    console.error(`Sound file not found: ${soundPath}`)
    return
  }

  try {
    if (platform === 'darwin') {
      const afplayVolume = Math.round(clampedVolume * 255)
      await $`afplay -v ${afplayVolume / 255} "${soundPath}"`.quiet()
    } else if (platform === 'linux') {
      if (!(await checkFfplay($))) {
        return
      }
      await $`ffplay -nodisp -autoexit -loglevel quiet -volume ${Math.round(clampedVolume * 100)} ${soundPath}`.quiet()
    } else {
      warnUnsupportedPlatform(platform)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to play notification sound:', errorMessage)
  }
}
