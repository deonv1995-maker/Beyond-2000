import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#050816');

    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.85);
    for (let i = 0; i < 180; i += 1) {
      stars.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(1, 2));
    }

    this.add.text(width / 2, height * 0.28, 'BEYOND 2000', {
      fontFamily: 'Arial',
      fontSize: `${Math.max(38, Math.floor(width * 0.07))}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Reconstruction v0.1.0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#66d9ff'
    }).setOrigin(0.5);

    const start = this.add.text(width / 2, height * 0.62, 'START', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      backgroundColor: '#173b63',
      padding: { x: 42, y: 18 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
