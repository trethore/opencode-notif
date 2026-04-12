declare module 'node-notifier' {
  export interface NotificationOptions {
    title?: string;
    message?: string;
    timeout?: number | boolean;
  }

  export type NotificationCallback = (error: Error | null, response?: string, metadata?: unknown) => void;

  const notifier: {
    notify(options: NotificationOptions, callback?: NotificationCallback): void;
  };

  export default notifier;
}

declare module 'play-sound' {
  export type AudioCallback = (error: Error | null) => void;

  export interface PlayOptions {
    [player: string]: string[] | undefined;
  }

  export interface AudioPlayer {
    play(what: string, options: PlayOptions, callback: AudioCallback): unknown;
  }

  export interface CreatePlayerOptions {
    player?: string;
    players?: string[];
  }

  export default function createPlayer(options?: CreatePlayerOptions): AudioPlayer;
}
