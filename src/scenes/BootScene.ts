import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.makeShipTexture();
    this.makeEnemyTexture();
    this.makeBulletTexture();
    this.makeCrystalTextures();
    this.makeStationTexture();
    this.scene.start('TitleScene');
  }

  private makeShipTexture(): void {
    const g = this.add.graphics();

    // Keep the visible ship centred around the texture origin. The previous
    // geometry extended into negative texture coordinates, which made the
    // sprite appear offset from its physics/world position.
    const cx = 32;
    const cy = 20;

    g.fillStyle(0x66d9ff, 1);
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(cx + 26, cy);
    g.lineTo(cx - 22, cy - 16);
    g.lineTo(cx - 12, cy);
    g.lineTo(cx - 22, cy + 16);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.generateTexture('player-ship', 64, 40);
    g.destroy();
  }

  private makeEnemyTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff4d6d, 1);
    g.lineStyle(2, 0xffb3c1, 1);
    g.fillCircle(18, 18, 15);
    g.strokeCircle(18, 18, 15);
    g.fillStyle(0x2a0010, 1);
    g.fillCircle(18, 18, 5);
    g.generateTexture('enemy', 36, 36);
    g.destroy();
  }

  private makeBulletTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 18, 5, 2);
    g.generateTexture('bullet', 18, 5);
    g.destroy();
  }

  private makeCrystalTextures(): void {
    const orange = this.add.graphics();
    orange.fillStyle(0xff7a18, 1);
    orange.fillTriangle(10, 0, 20, 10, 10, 22);
    orange.fillTriangle(10, 0, 0, 10, 10, 22);
    orange.generateTexture('crystal-orange', 20, 22);
    orange.destroy();

    const blue = this.add.graphics();
    blue.fillStyle(0x32a8ff, 1);
    blue.fillTriangle(10, 0, 20, 10, 10, 22);
    blue.fillTriangle(10, 0, 0, 10, 10, 22);
    blue.generateTexture('crystal-blue', 20, 22);
    blue.destroy();
  }

  private makeStationTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x27315f, 1);
    g.lineStyle(5, 0x7f8cff, 1);
    g.fillCircle(90, 90, 62);
    g.strokeCircle(90, 90, 62);
    g.fillStyle(0x101530, 1);
    g.fillCircle(90, 90, 34);
    g.lineStyle(4, 0x45d6ff, 1);
    g.strokeCircle(90, 90, 34);
    g.fillStyle(0xff7a18, 1);
    g.fillRect(82, 10, 16, 34);
    g.fillRect(82, 136, 16, 34);
    g.fillRect(10, 82, 34, 16);
    g.fillRect(136, 82, 34, 16);
    g.generateTexture('station', 180, 180);
    g.destroy();
  }
}
