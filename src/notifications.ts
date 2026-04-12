import { existsSync } from 'node:fs';
import path from 'node:path';
import notifier from 'node-notifier';
import createPlayer from 'play-sound';
import { getAssetsPath } from './config.js';

const WINDOWS_SOUND_SCRIPT = [
  '& { param([string]$path)',
  'Add-Type -AssemblyName presentationCore',
  '$player = New-Object System.Windows.Media.MediaPlayer',
  'try {',
  '$player.Volume = __VOLUME__',
  '$player.Open([Uri]$path)',
  '$player.Play()',
  '$deadline = (Get-Date).AddSeconds(10)',
  'while ((Get-Date) -lt $deadline) {',
  'if ($player.NaturalDuration.HasTimeSpan) {',
  '$duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalMilliseconds) + 250',
  'Start-Sleep -Milliseconds $duration',
  'return',
  '}',
  'Start-Sleep -Milliseconds 100',
  '}',
  'throw "Timed out waiting for media to open."',
  '} finally {',
  '$player.Close()',
  '}',
  '}',
].join('; ');

type AudioPlayOptions = {
  player: string;
  arguments: string[];
};

function resolveSoundPath(soundFile: string): string {
  return path.isAbsolute(soundFile)
    ? soundFile
    : path.join(getAssetsPath(), 'sounds', soundFile);
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

function getAudioPlayOptions(volume: number): AudioPlayOptions {
  const normalizedVolume = clampVolume(volume);

  switch (process.platform) {
    case 'darwin': {
      return {
        player: 'afplay',
        arguments: ['-v', `${normalizedVolume}`],
      };
    }

    case 'linux': {
      return {
        player: 'ffplay',
        arguments: ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-volume', `${Math.round(normalizedVolume * 100)}`],
      };
    }

    case 'win32': {
      return {
        player: 'powershell',
        arguments: [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          WINDOWS_SOUND_SCRIPT.replace('__VOLUME__', `${normalizedVolume}`),
        ],
      };
    }

    default: {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
}

function playAudioFile(soundPath: string, volume: number): Promise<void> {
  const audioOptions = getAudioPlayOptions(volume);
  const audioPlayer = createPlayer({ player: audioOptions.player });

  return new Promise((resolve, reject) => {
    audioPlayer.play(soundPath, { [audioOptions.player]: audioOptions.arguments }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function sendNotification(title: string, message: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    notifier.notify({
      title,
      message,
      timeout: 5,
    }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  }).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to send notification:', errorMessage);
  });
}

export async function playNotificationSound(soundFile: string, volume: number): Promise<void> {
  const soundPath = resolveSoundPath(soundFile);

  if (!existsSync(soundPath)) {
    console.error(`Sound file not found: ${soundPath}`);
    return;
  }

  try {
    await playAudioFile(soundPath, volume);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to play notification sound:', errorMessage);
  }
}
