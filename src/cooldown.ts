export class CooldownManager {
  private lastNotificationTime: number = 0
  private cooldownMs: number

  constructor(cooldownSeconds: number) {
    this.cooldownMs = cooldownSeconds * 1000
  }

  canNotify(): boolean {
    const now = Date.now()
    if (now - this.lastNotificationTime >= this.cooldownMs) {
      this.lastNotificationTime = now
      return true
    }
    return false
  }

  updateCooldown(cooldownSeconds: number): void {
    this.cooldownMs = cooldownSeconds * 1000
  }
}
