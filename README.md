# OpenCode Notif Plugin

Desktop notifications and sound alerts for [OpenCode](https://github.com/anomalyco/opencode).

## Features

- Desktop notifications and sound alerts
- Configurable per-event (generation completed, permission requested, question asked, errors)
- Cooldown system to prevent spam
- Cross-platform (macOS, Linux)

## Installation

```bash
git clone https://github.com/trethore/opencode-notif.git
cd opencode-notif
npm install
npm run deploy
```

## Configuration

Config file: `~/.config/opencode/plugin/notif.jsonc`

```jsonc
{
  "enabled": true,
  "showDesktopNotification": true,
  "soundAlert": true,
  "volume": 0.8,
  "cooldown": 30
}
```

See [docs/configuration.md](docs/configuration.md) for all options.

## Platform Requirements

| Platform | Notifications | Audio |
|----------|---------------|-------|
| macOS | Built-in | Built-in |
| Linux | `libnotify-bin` | `ffmpeg` |

See [docs/platform-requirements.md](docs/platform-requirements.md) for details.

## License

MIT
