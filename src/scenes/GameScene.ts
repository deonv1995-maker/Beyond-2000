import Phaser from 'phaser';

type ResourceType = 'orange' | 'blue';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private station!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private boostKey!: Phaser.Input.Keyboard.Key;

  private joystickPointerId: number | null = null;
  private joystickOrigin = new Phaser.Math.Vector2();
  private joystickVector = new Phaser.Math.Vector2();
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;

  private fireButton!: Phaser.GameObjects.Arc;
  private boostButton!: Phaser.GameObjects.Arc;
  private dockButton!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private stationPanel?: Phaser.GameObjects.Container;

  private orange = 0;
  private blue = 0;
  private thrustLevel = 0;
  private fireRateLevel = 0;
  private nextShotAt = 0;
  private spawnTimer = 0;
  private facing = new Phaser.Math.Vector2(1, 0);
  private isBoosting = false;

  private readonly worldSize = 4200;
  private readonly baseSpeed = 220;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);
    this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);
    this.cameras.main.setBackgroundColor('#040612');

    this.createStarfield();

    this.station = this.physics.add.image(this.worldSize / 2, this.worldSize / 2, 'station');
    this.station.setImmovable(true);
    (this.station.body as Phaser.Physics.Arcade.Body).setCircle(80, 10, 10);

    this.player = this.physics.add.image(this.worldSize / 2 + 420, this.worldSize / 2, 'player-ship');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(500, 500);
    this.player.setMaxVelocity(450);
    this.player.setDepth(10);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group({ maxSize: 80 });
    this.pickups = this.physics.add.group();

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.boostKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.createHud();
    this.createTouchControls();
    this.bindPointerInput();

    for (let i = 0; i < 6; i += 1) this.spawnEnemy();
  }

  update(time: number, delta: number): void {
    if (this.stationPanel) {
      this.player.setVelocity(0, 0);
      return;
    }

    const movement = this.readMovementInput();
    this.isBoosting = this.boostKey.isDown || this.boostButton.getData('pressed') === true;

    const speed = (this.baseSpeed + this.thrustLevel * 28) * (this.isBoosting ? 1.75 : 1);
    this.player.setVelocity(movement.x * speed, movement.y * speed);

    if (movement.lengthSq() > 0.01) {
      this.facing.copy(movement).normalize();
      this.player.setRotation(this.facing.angle());
    }

    const wantsFire = this.fireKey.isDown || this.fireButton.getData('pressed') === true;
    if (wantsFire) this.tryFire(time);

    this.updateEnemies();
    this.updateDockPrompt();

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.enemies.countActive(true) < 18) {
      this.spawnEnemy();
      this.spawnTimer = 1100;
    }

    this.updateHud();
  }

  private createStarfield(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.72);
    for (let i = 0; i < 900; i += 1) {
      g.fillCircle(Phaser.Math.Between(0, this.worldSize), Phaser.Math.Between(0, this.worldSize), Phaser.Math.Between(1, 2));
    }
    g.fillStyle(0x3355aa, 0.2);
    for (let i = 0; i < 80; i += 1) {
      g.fillCircle(Phaser.Math.Between(0, this.worldSize), Phaser.Math.Between(0, this.worldSize), Phaser.Math.Between(2, 4));
    }
  }

  private createHud(): void {
    this.hudText = this.add.text(16, 14, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 10, y: 8 }
    }).setScrollFactor(0).setDepth(1000);

    this.dockButton = this.add.text(this.scale.width / 2, this.scale.height - 118, 'DOCK', {
      fontFamily: 'Arial', fontSize: '22px', color: '#8ffcff', backgroundColor: '#133a47', padding: { x: 22, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false).setInteractive();

    this.dockButton.on('pointerdown', () => this.openStation());
  }

  private createTouchControls(): void {
    const y = this.scale.height - 105;
    this.joystickBase = this.add.circle(105, y, 62, 0x20304d, 0.5).setScrollFactor(0).setDepth(1000);
    this.joystickKnob = this.add.circle(105, y, 30, 0x66d9ff, 0.7).setScrollFactor(0).setDepth(1001);

    this.fireButton = this.add.circle(this.scale.width - 88, y, 48, 0xff7a18, 0.72).setScrollFactor(0).setDepth(1000).setInteractive();
    this.add.text(this.fireButton.x, this.fireButton.y, 'FIRE', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.boostButton = this.add.circle(this.scale.width - 190, y + 18, 38, 0x2358b8, 0.72).setScrollFactor(0).setDepth(1000).setInteractive();
    this.add.text(this.boostButton.x, this.boostButton.y, 'BOOST', {
      fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const bindHold = (obj: Phaser.GameObjects.Arc): void => {
      obj.setData('pressed', false);
      obj.on('pointerdown', () => obj.setData('pressed', true));
      obj.on('pointerup', () => obj.setData('pressed', false));
      obj.on('pointerout', () => obj.setData('pressed', false));
    };
    bindHold(this.fireButton);
    bindHold(this.boostButton);
  }

  private bindPointerInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > this.scale.width * 0.48 || pointer.y < this.scale.height * 0.55 || this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.joystickOrigin.set(pointer.x, pointer.y);
      this.joystickBase.setPosition(pointer.x, pointer.y);
      this.joystickKnob.setPosition(pointer.x, pointer.y);
      this.joystickVector.set(0, 0);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointerId) return;
      const v = new Phaser.Math.Vector2(pointer.x - this.joystickOrigin.x, pointer.y - this.joystickOrigin.y);
      if (v.length() > 58) v.setLength(58);
      this.joystickKnob.setPosition(this.joystickOrigin.x + v.x, this.joystickOrigin.y + v.y);
      this.joystickVector.copy(v).scale(1 / 58);
    });

    const release = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id !== this.joystickPointerId) return;
      this.joystickPointerId = null;
      this.joystickVector.set(0, 0);
      this.joystickBase.setPosition(105, this.scale.height - 105);
      this.joystickKnob.setPosition(105, this.scale.height - 105);
    };

    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private readMovementInput(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2(this.joystickVector.x, this.joystickVector.y);
    if (this.cursors.left.isDown) v.x -= 1;
    if (this.cursors.right.isDown) v.x += 1;
    if (this.cursors.up.isDown) v.y -= 1;
    if (this.cursors.down.isDown) v.y += 1;
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  private tryFire(time: number): void {
    const fireDelay = Math.max(95, 360 - this.fireRateLevel * 36);
    if (time < this.nextShotAt) return;
    this.nextShotAt = time + fireDelay;

    const bullet = this.bullets.get(this.player.x, this.player.y, 'bullet') as Phaser.Physics.Arcade.Image | null;
    if (!bullet) return;

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    bullet.setActive(true).setVisible(true).setRotation(this.facing.angle());
    body.enable = true;
    bullet.setVelocity(this.facing.x * 720, this.facing.y * 720);

    this.time.delayedCall(1100, () => {
      if (!bullet.active) return;
      bullet.setActive(false).setVisible(false);
      (bullet.body as Phaser.Physics.Arcade.Body).enable = false;
    });
  }

  private spawnEnemy(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(520, 900);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 80, this.worldSize - 80);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 80, this.worldSize - 80);
    const enemy = this.enemies.create(x, y, 'enemy') as Phaser.Physics.Arcade.Image;
    enemy.setData('hp', Phaser.Math.Between(1, 3));
    enemy.setData('speed', Phaser.Math.Between(75, 125));
    enemy.setDepth(8);
  }

  private updateEnemies(): void {
    this.enemies.children.each((child) => {
      const enemy = child as Phaser.Physics.Arcade.Image;
      if (!enemy.active) return true;
      const dir = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y).normalize();
      const speed = enemy.getData('speed') as number;
      enemy.setVelocity(dir.x * speed, dir.y * speed);
      return true;
    });
  }

  private onBulletEnemy = (bulletObj: unknown, enemyObj: unknown): void => {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    bullet.setActive(false).setVisible(false);
    (bullet.body as Phaser.Physics.Arcade.Body).enable = false;

    const hp = (enemy.getData('hp') as number) - 1;
    enemy.setData('hp', hp);
    if (hp <= 0) this.destroyEnemy(enemy);
  };

  private onPlayerEnemy = (_playerObj: unknown, enemyObj: unknown): void => {
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    if (this.isBoosting) {
      this.destroyEnemy(enemy);
      return;
    }

    const push = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y).normalize();
    this.player.setVelocity(push.x * 360, push.y * 360);
    enemy.setVelocity(-push.x * 180, -push.y * 180);
  };

  private destroyEnemy(enemy: Phaser.Physics.Arcade.Image): void {
    const type: ResourceType = Math.random() < 0.55 ? 'orange' : 'blue';
    const pickup = this.pickups.create(enemy.x, enemy.y, type === 'orange' ? 'crystal-orange' : 'crystal-blue') as Phaser.Physics.Arcade.Image;
    pickup.setData('resourceType', type);
    pickup.setDepth(7);
    enemy.destroy();
  }

  private onPickup = (_playerObj: unknown, pickupObj: unknown): void => {
    const pickup = pickupObj as Phaser.Physics.Arcade.Image;
    const type = pickup.getData('resourceType') as ResourceType;
    if (type === 'orange') this.orange += 1;
    else this.blue += 1;
    pickup.destroy();
  };

  private updateDockPrompt(): void {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.station.x, this.station.y);
    this.dockButton.setVisible(distance < 185);
  }

  private openStation(): void {
    if (this.stationPanel) return;

    const w = Math.min(this.scale.width - 30, 520);
    const h = Math.min(this.scale.height - 60, 520);
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;

    const bg = this.add.rectangle(0, 0, w, h, 0x160022, 0.97).setStrokeStyle(3, 0x7788ff);
    const title = this.add.text(0, -h / 2 + 44, 'SPACE STATION', {
      fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    const resource = this.add.text(0, -h / 2 + 92, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#8ffcff'
    }).setOrigin(0.5);

    const thrust = this.makeStationButton(0, -35, 0xc84400, 'Upgrade Thrust');
    const fireRate = this.makeStationButton(0, 65, 0x074dc9, 'Upgrade Fire Rate');
    const close = this.add.text(0, h / 2 - 48, 'UNDOCK', {
      fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', backgroundColor: '#33394d', padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive();

    const refresh = (): void => {
      const thrustCost = 5 + this.thrustLevel * 4;
      const fireCost = 5 + this.fireRateLevel * 4;
      resource.setText(`Orange: ${this.orange}     Blue: ${this.blue}`);
      (thrust.getByName('label') as Phaser.GameObjects.Text).setText(`Upgrade Thrust\nCost: ${thrustCost} Orange`);
      (fireRate.getByName('label') as Phaser.GameObjects.Text).setText(`Upgrade Fire Rate\nCost: ${fireCost} Blue`);
    };

    thrust.setSize(360, 80).setInteractive(new Phaser.Geom.Rectangle(-180, -40, 360, 80), Phaser.Geom.Rectangle.Contains);
    fireRate.setSize(360, 80).setInteractive(new Phaser.Geom.Rectangle(-180, -40, 360, 80), Phaser.Geom.Rectangle.Contains);

    thrust.on('pointerdown', () => {
      const cost = 5 + this.thrustLevel * 4;
      if (this.orange >= cost) {
        this.orange -= cost;
        this.thrustLevel += 1;
        refresh();
      }
    });

    fireRate.on('pointerdown', () => {
      const cost = 5 + this.fireRateLevel * 4;
      if (this.blue >= cost) {
        this.blue -= cost;
        this.fireRateLevel += 1;
        refresh();
      }
    });

    close.on('pointerdown', () => {
      this.stationPanel?.destroy(true);
      this.stationPanel = undefined;
    });

    this.stationPanel = this.add.container(x, y, [bg, title, resource, thrust, fireRate, close]).setScrollFactor(0).setDepth(2000);
    refresh();
  }

  private makeStationButton(x: number, y: number, color: number, text: string): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 360, 80, color, 1);
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setName('label');
    return this.add.container(x, y, [bg, label]);
  }

  private updateHud(): void {
    this.hudText.setText([
      `Orange ${this.orange}   Blue ${this.blue}`,
      `Thrust Lv.${this.thrustLevel}   Fire Lv.${this.fireRateLevel}`,
      `Enemies ${this.enemies.countActive(true)}`
    ]);
  }
}
