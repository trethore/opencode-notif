import { join } from 'path'
import type { BunShell } from './types.js'
import { getAssetsPath } from './config.js'

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
      await $`notify-send ${title} ${message}`.quiet()
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

  try {
    if (platform === 'darwin') {
      const afplayVolume = Math.round(clampedVolume * 255)
      await $`afplay -v ${afplayVolume / 255} "${soundPath}"`.quiet()
    } else if (platform === 'linux') {
      await $`ffplay -nodisp -autoexit -loglevel quiet -volume ${Math.round(clampedVolume * 100)} ${soundPath}`.quiet()
    }
  } catch {
    // Audio playback is not critical
  }
}
