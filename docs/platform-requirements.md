# Platform Requirements

## macOS

No additional dependencies required. Uses built-in `osascript` and `afplay`.

## Linux

### Notifications

Requires `notify-send` (libnotify):

```bash
# Ubuntu/Debian
sudo apt-get install libnotify-bin

# Fedora
sudo dnf install libnotify
```

### Audio

Requires `ffplay` (ffmpeg):

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

## Troubleshooting

### No notifications

1. Check `enabled` is `true`
2. Check cooldown hasn't blocked it
3. Linux: verify `notify-send` is installed

### No sound

1. Check `soundAlert` is `true`
2. Verify sound file exists
3. Linux: verify `ffplay` is installed
4. Check volume > 0

### Too many notifications

Increase the `cooldown` value.
