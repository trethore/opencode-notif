# Configuration

Config file location: `~/.config/opencode/plugin/notif.jsonc`

## Event Types

| Event | Trigger | Description |
|-------|---------|-------------|
| `generationCompleted` | `session.idle` | Code generation finished |
| `permissionRequested` | `permission.ask` | OpenCode requests permission |
| `questionAsked` | `tool.execute.before` | OpenCode asks a question |
| `sessionError` | `session.error` | An error occurred |

## Global Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch |
| `showDesktopNotification` | boolean | `true` | Enable desktop notifications |
| `soundAlert` | boolean | `true` | Enable sound alerts |
| `soundFile` | string | `"default.mp3"` | Sound file from `assets/sounds/` |
| `volume` | number | `0.8` | Volume level (0.0 to 1.0) |
| `cooldown` | number | `30` | Seconds between notifications |

## Per-Event Overrides

Each event can override global settings:

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

## Message Templates

| Placeholder | Description |
|-------------|-------------|
| `{projectName}` | Current project directory name |
| `{eventType}` | Event type identifier |

## Examples

### Sound only for errors

```jsonc
{
  "soundAlert": false,
  "permissions": {
    "sessionError": {
      "soundAlert": true,
      "volume": 1.0
    }
  }
}
```

### Specific events only

```jsonc
{
  "permissions": {
    "generationCompleted": { "enabled": true },
    "permissionRequested": { "enabled": false },
    "questionAsked": { "enabled": true },
    "sessionError": { "enabled": false }
  }
}
```

### Quiet mode (no sound)

```jsonc
{
  "showDesktopNotification": true,
  "soundAlert": false
}
```

### Sound only (no desktop notifications)

```jsonc
{
  "showDesktopNotification": false,
  "soundAlert": true
}
```

## Custom Sounds

Add audio files to `~/.config/opencode/plugin/notif-sounds/`.

Supported formats: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`

```jsonc
{
  "soundFile": "my-custom-sound.mp3"
}
```
