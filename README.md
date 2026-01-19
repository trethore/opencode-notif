# OpenCode Notificator Plugin

A plugin for OpenCode that integrates desktop notifications and sound alerts into your workflow.

## Features

- Desktop notifications and sound alerts for multiple event types
- Per-event configuration with global defaults
- Cooldown system to prevent notification spam
- Volume control for sound alerts
- Custom message templates with placeholders
- Cross-platform support (macOS, Linux)

## Event Types

The plugin can trigger notifications for the following events:

| Event | Trigger | Description |
|-------|---------|-------------|
| `generationCompleted` | `session.idle` | Code generation finished |
| `permissionRequested` | `permission.ask` | OpenCode requests permission |
| `questionAsked` | `tool.execute.before` (question tool) | OpenCode asks a question |
| `sessionError` | `session.error` | An error occurred in the session |

## Installation

1. Clone or download this repository

2. Install dependencies:
    ```bash
    npm install
    ```

3. Build the plugin:
    ```bash
    npm run build
    ```

4. Deploy to OpenCode plugins directory:
    ```bash
    npm run deploy
    ```

   This automatically:
   - Builds the plugin
   - Installs to the correct plugins directory for your platform
   - Overwrites any existing version

   Alternatively, use specific commands:
   ```bash
   npm run deploy:build    # Build only
   npm run deploy:install  # Install only (requires dist/ to exist)
   ```

## Configuration

Config file location: `~/.config/opencode/plugin/notificator.jsonc`

### Default Configuration

```jsonc
{
  // Enable/disable the entire plugin
  "enabled": true,
  
  // Global settings (apply to all events unless overridden)
  "showDesktopNotification": true,
  "soundAlert": true,
  "soundFile": "default.mp3",
  "volume": 0.8,
  
  // Cooldown in seconds - prevents notification spam
  "cooldown": 30,
  
  // Per-event permissions (override global settings)
  "permissions": {
    "generationCompleted": {
      "enabled": true
    },
    "permissionRequested": {
      "enabled": true
    },
    "questionAsked": {
      "enabled": true
    },
    "sessionError": {
      "enabled": true,
      "message": "Error in {projectName}"
    }
  }
}
```

### Configuration Options

#### Global Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for the entire plugin |
| `showDesktopNotification` | boolean | `true` | Enable desktop notifications |
| `soundAlert` | boolean | `true` | Enable sound alerts |
| `soundFile` | string | `"default.mp3"` | Sound file from `assets/sounds/` |
| `volume` | number | `0.8` | Volume level (0.0 to 1.0) |
| `cooldown` | number | `30` | Seconds between notifications (prevents spam) |

#### Per-Event Settings

Each event type can override global settings:

```jsonc
{
  "permissions": {
    "generationCompleted": {
      "enabled": true,
      "showDesktopNotification": true,
      "soundAlert": true,
      "soundFile": "ding1.mp3",
      "volume": 0.5,
      "message": "Done with {projectName}!"
    }
  }
}
```

### Message Templates

Use placeholders in custom messages:

| Placeholder | Description |
|-------------|-------------|
| `{projectName}` | Current project directory name |
| `{eventType}` | Event type identifier |

Example:
```jsonc
{
  "permissions": {
    "generationCompleted": {
      "message": "Task completed in {projectName}"
    },
    "sessionError": {
      "message": "Error in {projectName}: check the console"
    }
  }
}
```

### Cooldown Behavior

The cooldown prevents notification spam when multiple events fire in quick succession:

- Default: 30 seconds
- Set `"cooldown": 5` for more frequent notifications
- Set `"cooldown": 0` to disable cooldown (not recommended)

The cooldown is global - once a notification fires, no other notifications will fire until the cooldown expires.

### Configuration Examples

#### Disable sound for all events except errors

```jsonc
{
  "enabled": true,
  "showDesktopNotification": true,
  "soundAlert": false,
  "cooldown": 30,
  "permissions": {
    "sessionError": {
      "soundAlert": true,
      "soundFile": "alert.mp3",
      "volume": 1.0
    }
  }
}
```

#### Only notify on generation completed and questions

```jsonc
{
  "enabled": true,
  "permissions": {
    "generationCompleted": {
      "enabled": true
    },
    "permissionRequested": {
      "enabled": false
    },
    "questionAsked": {
      "enabled": true
    },
    "sessionError": {
      "enabled": false
    }
  }
}
```

#### Quiet mode (desktop notifications only, no sound)

```jsonc
{
  "enabled": true,
  "showDesktopNotification": true,
  "soundAlert": false
}
```

#### Sound only (no desktop notifications)

```jsonc
{
  "enabled": true,
  "showDesktopNotification": false,
  "soundAlert": true,
  "volume": 0.6
}
```

## Platform-Specific Requirements

### macOS

**Notifications:**
- No additional dependencies required
- Uses built-in `osascript` for notifications

**Audio:**
- No additional dependencies required
- Uses built-in `afplay` for audio playback

### Linux

**Notifications:**
- Requires `notify-send` (part of libnotify)
- Install on Ubuntu/Debian: `sudo apt-get install libnotify-bin`
- Install on Fedora: `sudo dnf install libnotify`

**Audio:**
- Requires `ffplay` (part of ffmpeg)
- Install on Ubuntu/Debian: `sudo apt-get install ffmpeg`
- Install on Fedora: `sudo dnf install ffmpeg`

## Custom Sounds

Add your own audio files to `~/.config/opencode/plugin/notificator-sounds/`. 

Supported formats: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`

Then reference them in your config:

```jsonc
{
  "soundFile": "my-custom-sound.mp3"
}
```

## Troubleshooting

### No notifications appearing

1. Check that `enabled` is `true` in your config
2. Verify the cooldown hasn't blocked the notification
3. On Linux, ensure `notify-send` is installed

### No sound playing

1. Check that `soundAlert` is `true`
2. Verify the sound file exists in `assets/sounds/`
3. On Linux, ensure `ffplay` is installed
4. Check volume is not set to 0

### Notifications firing too often

Increase the `cooldown` value in your config.

## License

MIT
