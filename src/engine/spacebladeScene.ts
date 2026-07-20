import Phaser from "phaser";
import { REBUILD_ENEMIES, REBUILD_PLAYER, type FrameAnimation, type RebuildSprite } from "../rebuild/assets/frameManifest";
import { frameIndexAt } from "../rebuild/animation";
import {
  advanceRebuildRun,
  createRebuildRun,
  releaseChargeRebuildRun,
  rebuildActiveThreatWeight,
  rebuildWaveTarget,
  startChargeRebuildRun,
  tapRebuildRun,
  type RebuildEnemy,
  type RebuildRun,
} from "../rebuild/rebuildGame";
import { rebuildAutoParkourOffset, rebuildFloorTransitionOffset, rebuildFloorTraversalPhase, rebuildPlayerVisualOffset } from "../rebuild/renderScene";
import { SPACEBLADE_HEIGHT, SPACEBLADE_WIDTH } from "./spacebladeConstants";
import { loadSpacebladeBest, loadSpacebladeSettings, saveSpacebladeBest, saveSpacebladeSettings, spacebladeMotionDefaults, type SpacebladeSettings } from "./spacebladePersistence";
import { createSoundBus, type SoundBus, type SoundCue } from "../game/audio/soundBus";
import { loadRebuildHighscores, submitRebuildRun, type RebuildHighscores } from "../rebuild/rebuildLeaderboard";
import { localFriendsResult, sanitizePlayerName } from "../state/leaderboard/leaderboardService";
import {
  enemyAnimationElapsed,
  enemyDeathAnimationElapsed,
  enemyDeathIsVisible,
  enemyDeathVisualAnimation,
  enemyHitIsVisible,
  enemyHitVisualAnimation,
  clampSpriteCenterX,
  parryTimingSignal,
  enemyVisualAnimation,
  playerVisualAnimation,
} from "./spacebladeAnimation";
import { enemyVisualMotion, glitchTeleportCueDue, glitchTeleportPresentation } from "./spacebladeMotion";
import { shouldPauseForVisibility } from "./spacebladeVisibility";
import { initialSpacebladeScreen } from "./spacebladeDevice";
import { gradeForScore } from "../game/run/scoreSystem";
import {
  PUBLIC_EXPLOSION_SOURCES,
  PUBLIC_SHOT_SOURCES,
  publicExplosionSourceAt,
  publicShotSourceAt,
} from "./publicEffectAnimation";

const GROUND_Y = 552;
const PLAYER_X = SPACEBLADE_WIDTH / 2;
const VIEW_PLAYER_X = SPACEBLADE_WIDTH / 2;
const PUBLIC_PALETTE = {
  background: 0x0b0918,
  skyline: 0x1b1638,
  skylineFar: 0x261d4c,
  ground: 0x100c1f,
  groundLine: 0xffc52f,
  ink: "#fff4d5",
  muted: "#c2b7d9",
  amber: 0xffc52f,
  magenta: 0xff4fa3,
  cyan: 0x8df5ff,
} as const;

const frameKey = (source: string): string => `spaceblade:${source}`;
const effectKey = (source: string): string => `spaceblade-effect:${source}`;

function allFrameSources(): readonly string[] {
  return Array.from(new Set(
    [REBUILD_PLAYER, ...REBUILD_ENEMIES].flatMap((sprite) =>
      Object.values(sprite.animations).flatMap((animation) => animation.frames),
    ),
  ));
}

function animationFor(sprite: RebuildSprite, animationName: string): FrameAnimation {
  return sprite.animations[animationName] ?? sprite.animations.walk ?? sprite.animations.idle;
}

const PLAYER_ANIMATION_KEYS = new Set(Object.keys(REBUILD_PLAYER.animations));
const ENEMY_ANIMATION_KEYS = new Map(
  REBUILD_ENEMIES.map((sprite) => [sprite.id, new Set(Object.keys(sprite.animations))] as const),
);
const EMPTY_ANIMATION_KEYS = new Set<string>();
const CALLSIGNS = ["Pilot", "Nova", "Blade", "Ghost", "Zero", "Ace"] as const;

function facingFor(run: RebuildRun): "left" | "right" {
  const nearest = run.enemies
    .filter((enemy) => enemy.state !== "dead")
    .reduce<RebuildEnemy | null>((closest, enemy) => {
      if (!closest) return enemy;
      const distance = Math.abs(enemy.x - PLAYER_X);
      const closestDistance = Math.abs(closest.x - PLAYER_X);
      return distance < closestDistance || (distance === closestDistance && enemy.x > closest.x) ? enemy : closest;
    }, null);
  return nearest && nearest.x < PLAYER_X ? "left" : "right";
}

type EnemyView = {
  readonly sprite: Phaser.GameObjects.Image;
  readonly marker: Phaser.GameObjects.Text;
  readonly healthBar: Phaser.GameObjects.Graphics;
  readonly definition: RebuildSprite;
};

type EngineScreen = "title" | "tutorial" | "playing" | "paused" | "settings" | "nameEntry" | "gameOver" | "highscores" | "mobileWarning";
type HighscoresTab = "global" | "friends";

export class SpacebladePlayScene extends Phaser.Scene {
  private run: RebuildRun | null = null;
  private playerView: Phaser.GameObjects.Image | null = null;
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly enemyViewPools = new Map<string, EnemyView[]>();
  private readonly projectileViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly projectileViewPool: Phaser.GameObjects.Image[] = [];
  private readonly enemyExplosionViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly enemyExplosionViewPool: Phaser.GameObjects.Image[] = [];
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private spaceDownAt: number | null = null;
  private lastTapAt = Number.NEGATIVE_INFINITY;
  private hud: Phaser.GameObjects.Text | null = null;
  private hudWave: Phaser.GameObjects.Text | null = null;
  private hudScore: Phaser.GameObjects.Text | null = null;
  private playerHpBar: Phaser.GameObjects.Graphics | null = null;
  private status: Phaser.GameObjects.Text | null = null;
  private combatFx: Phaser.GameObjects.Graphics | null = null;
  private deathFx: Phaser.GameObjects.Graphics | null = null;
  private enemyFx: Phaser.GameObjects.Graphics | null = null;
  private waveProgress: Phaser.GameObjects.Graphics | null = null;
  private waveProgressLabel: Phaser.GameObjects.Text | null = null;
  private parryTiming: Phaser.GameObjects.Graphics | null = null;
  private parryTimingLabel: Phaser.GameObjects.Text | null = null;
  private skylineMotion: Phaser.GameObjects.Graphics | null = null;
  private publicSkylineFar: Phaser.GameObjects.TileSprite | null = null;
  private publicSkylineNear: Phaser.GameObjects.TileSprite | null = null;
  private publicGround: Phaser.GameObjects.TileSprite | null = null;
  private buildingInterior: Phaser.GameObjects.Graphics | null = null;
  private runnerMotion: Phaser.GameObjects.Graphics | null = null;
  private waveBanner: Phaser.GameObjects.Text | null = null;
  private waveBannerUntil = 0;
  private floorClimbAt: number | null = null;
  private floorLandingPlayedAt: number | null = null;
  private parkourWasAirborne = false;
  private lastSeenWave = 1;
  private bossWasPresent = false;
  private lastFxActionAt: number | null = null;
  private screen: EngineScreen = "title";
  private screenTitle: Phaser.GameObjects.Text | null = null;
  private screenBody: Phaser.GameObjects.Text | null = null;
  private screenHint: Phaser.GameObjects.Text | null = null;
  private screenBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private pauseButtonBackground: Phaser.GameObjects.Rectangle | null = null;
  private pauseButtonLabel: Phaser.GameObjects.Text | null = null;
  private menuButtonBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private menuButtonLabels: Phaser.GameObjects.Text[] = [];
  private menuFocus = 0;
  private tutorialReturnScreen: "title" | "paused" = "title";
  private menuActions: readonly string[] = [];
  private storage: Storage | null = null;
  private bestScore = 0;
  private bestWave = 1;
  private settings: SpacebladeSettings = { volume: 0.7, screenShakeEnabled: true, reducedEffectsEnabled: false };
  private soundBus: SoundBus | null = null;
  private readonly alertedEnemies = new Map<string, number>();
  private readonly enemyDeathAt = new Map<string, number>();
  private readonly enemyAttackTargetAt = new Map<string, number>();
  private readonly enemyRecoveryAt = new Map<string, number>();
  private readonly enemyHpSeen = new Map<string, number>();
  private readonly enemyHitAt = new Map<string, number>();
  private readonly glitchTeleportAlertedAt = new Map<string, number>();
  private readonly enemyHitLabelAt = new Map<string, number>();
  private readonly enemyHitLabels = new Map<string, Phaser.GameObjects.Text>();
  private readonly retiredEnemyIds = new Set<string>();
  private lastDisplayedProjectileCount = 0;
  private lastDisplayedShieldedCount = 0;
  private lastDisplayedBlockedProjectileCount = 0;
  private lastDisplayedEnergyShotsBlocked = 0;
  private playerHurtAt: number | null = null;
  private terminalAt: number | null = null;
  private combatCallout = "";
  private combatCalloutUntil = 0;
  private playerName = "Pilot";
  private highscores: RebuildHighscores | null = null;
  private highscoresTab: HighscoresTab = "global";
  private leaderboardLoading = false;
  private leaderboardSubmitted = false;
  private submitOutcome: "pending" | "submitted" | "skipped" | "offline" | "disabled" | null = null;
  private nameEntryForm: HTMLFormElement | null = null;
  private nameEntryInput: HTMLInputElement | null = null;
  private nameEntryError: HTMLParagraphElement | null = null;

  private clearMenuButtons(): void {
    for (const button of this.menuButtonBackgrounds) button.destroy();
    for (const label of this.menuButtonLabels) label.destroy();
    this.menuButtonBackgrounds = [];
    this.menuButtonLabels = [];
  }

  private menuButtonText(action: string): string {
    if (action === "resume") return "RESUME RUN";
    if (action === "settings") return "SETTINGS";
    if (action === "tutorial") return "HOW TO PLAY";
    if (action === "restart") return "RESTART RUN";
    if (action === "title") return "QUIT TO TITLE";
    if (action === "global") return "GLOBAL RECORDS";
    if (action === "friends") return "LOCAL BEST";
    if (action === "volume") return `VOLUME  ${Math.round(this.settings.volume * 100)}%`;
    if (action === "screenShake") return `SCREEN SHAKE  ${this.settings.screenShakeEnabled ? "ON" : "OFF"}`;
    if (action === "reducedEffects") return `REDUCED EFFECTS  ${this.settings.reducedEffectsEnabled ? "ON" : "OFF"}`;
    if (action === "callsign") return `CALLSIGN  ${this.playerName.toUpperCase()}`;
    return "BACK";
  }

  private refreshMenuButtons(): void {
    this.menuButtonBackgrounds.forEach((button, index) => {
      const focused = index === this.menuFocus;
      button.setFillStyle(focused ? PUBLIC_PALETTE.amber : 0x18132d, focused ? 0.96 : 0.92);
      button.setStrokeStyle(focused ? PUBLIC_PALETTE.amber : 0x57456e, 1);
      this.menuButtonLabels[index]
        ?.setColor(focused ? "#0b0918" : PUBLIC_PALETTE.ink)
        .setBackgroundColor(focused ? "#ffc52f" : "#18132d");
    });
  }

  private buildMenuButtons(): void {
    this.clearMenuButtons();
    if (this.menuActions.length === 0) return;
    const firstY = this.screen === "gameOver" ? 510 : this.screen === "highscores" ? 560 : 430;
    const gap = 48;
    this.menuActions.forEach((action, index) => {
      const y = firstY + index * gap;
      const button = this.add.rectangle(SPACEBLADE_WIDTH / 2, y, 380, 38, 0x18132d, 0.92)
        .setStrokeStyle(1, 0x57456e, 1)
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(SPACEBLADE_WIDTH / 2, y, this.menuButtonText(action), {
        color: PUBLIC_PALETTE.ink,
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
        backgroundColor: "#18132d",
        padding: { left: 16, right: 16, top: 8, bottom: 8 },
      }).setOrigin(0.5).setDepth(31);
      button.on("pointerover", () => {
        this.menuFocus = index;
        this.refreshMenuButtons();
      });
      button.on("pointerup", () => {
        this.menuFocus = index;
        this.confirmMenuAction();
      });
      this.menuButtonBackgrounds.push(button);
      this.menuButtonLabels.push(label);
    });
    this.refreshMenuButtons();
  }

  constructor() {
    super("spaceblade-play");
  }

  preload(): void {
    for (const source of allFrameSources()) this.load.image(frameKey(source), source);
    for (const source of PUBLIC_SHOT_SOURCES) this.load.image(effectKey(source), source);
    for (const source of PUBLIC_EXPLOSION_SOURCES) this.load.image(effectKey(source), source);
    this.load.image("public-skyline-a", "/assets/public/warped-city/skyline-a.png?v=public-pack-3");
    this.load.image("public-skyline-b", "/assets/public/warped-city/skyline-b.png?v=public-pack-3");
    this.load.image("public-near-buildings", "/assets/public/warped-city/near-buildings-bg.png?v=public-pack-3");
    this.load.image("public-ground-strip", "/assets/public/warped-city/ground-strip.png?v=public-pack-3");
  }

  create(): void {
    this.drawArena();
    this.publicSkylineFar = this.add.tileSprite(0, 0, SPACEBLADE_WIDTH, GROUND_Y, "public-skyline-a")
      .setOrigin(0)
      .setAlpha(0.34)
      .setTileScale(2.8)
      .setDepth(-2);
    this.publicSkylineNear = this.add.tileSprite(0, GROUND_Y - 214, SPACEBLADE_WIDTH, 214, "public-near-buildings")
      .setOrigin(0)
      .setAlpha(0.88)
      .setTileScale(1.28)
      .setDepth(-1);
    this.publicGround = this.add.tileSprite(0, GROUND_Y, SPACEBLADE_WIDTH, SPACEBLADE_HEIGHT - GROUND_Y, "public-ground-strip")
      .setOrigin(0)
      .setAlpha(0.96)
      .setTileScale(1, 1.45)
      .setDepth(0.2);
    this.buildingInterior = this.add.graphics().setDepth(-0.4);
    this.soundBus = createSoundBus(() => this.settings.volume);
    this.createNameEntryForm();
    const prefersReducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionDefaults = spacebladeMotionDefaults(prefersReducedMotion);
    try {
      this.storage = window.localStorage;
      ({ score: this.bestScore, wave: this.bestWave } = loadSpacebladeBest(this.storage));
      this.settings = loadSpacebladeSettings(this.storage, motionDefaults);
      this.playerName = window.localStorage.getItem("spaceblade.playerName") ?? "Pilot";
    } catch {
      this.storage = null;
      this.settings = { volume: 0.7, ...motionDefaults };
    }
    this.run = createRebuildRun(this.time.now);
    this.playerView = this.add.image(VIEW_PLAYER_X, GROUND_Y, frameKey(REBUILD_PLAYER.animations.idle.frames[0]))
      .setOrigin(0.5, 1)
      .setScale(REBUILD_PLAYER.scale)
      .setDepth(2);
    this.hud = this.add.text(20, 16, "", {
      color: PUBLIC_PALETTE.ink,
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setDepth(5);
    this.hudWave = this.add.text(SPACEBLADE_WIDTH / 2, 16, "", {
      color: PUBLIC_PALETTE.ink,
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(5);
    this.hudScore = this.add.text(SPACEBLADE_WIDTH - 20, 16, "", {
      color: PUBLIC_PALETTE.ink,
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(5);
    this.pauseButtonBackground = this.add.rectangle(SPACEBLADE_WIDTH - 86, 76, 112, 34, 0x18132d, 0.94)
      .setStrokeStyle(1, PUBLIC_PALETTE.cyan, 1)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.pauseButtonLabel = this.add.text(SPACEBLADE_WIDTH - 86, 76, "PAUSE", {
      color: PUBLIC_PALETTE.ink,
      fontFamily: "monospace",
      fontSize: "14px",
      fontStyle: "bold",
      backgroundColor: "#18132d",
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5).setDepth(9);
    this.pauseButtonBackground.on("pointerover", () => {
      this.pauseButtonBackground?.setFillStyle(PUBLIC_PALETTE.cyan, 1);
      this.pauseButtonLabel?.setColor("#0b0918").setBackgroundColor("#57eaff");
    });
    this.pauseButtonBackground.on("pointerout", () => {
      this.pauseButtonBackground?.setFillStyle(0x18132d, 0.94);
      this.pauseButtonLabel?.setColor(PUBLIC_PALETTE.ink).setBackgroundColor("#18132d");
    });
    this.pauseButtonBackground.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (this.screen === "playing") this.setScreen("paused");
    });
    this.playerHpBar = this.add.graphics().setDepth(5);
    this.status = this.add.text(SPACEBLADE_WIDTH / 2, 70, "", {
      color: "#ffc52f",
      fontFamily: "monospace",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5);
    this.combatFx = this.add.graphics().setDepth(3);
    this.deathFx = this.add.graphics().setDepth(3);
    this.enemyFx = this.add.graphics().setDepth(3);
    this.runnerMotion = this.add.graphics().setDepth(1);
    this.waveProgress = this.add.graphics().setDepth(5);
    this.waveProgressLabel = this.add.text(SPACEBLADE_WIDTH / 2, 122, "", {
      color: PUBLIC_PALETTE.muted,
      fontFamily: "monospace",
      fontSize: "13px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5);
    this.parryTiming = this.add.graphics().setDepth(5).setVisible(false);
    this.parryTimingLabel = this.add.text(SPACEBLADE_WIDTH / 2, 676, "", {
      color: PUBLIC_PALETTE.muted,
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5).setVisible(false);
    this.skylineMotion = this.add.graphics().setDepth(0.5);
    this.waveBanner = this.add.text(SPACEBLADE_WIDTH / 2, 182, "", {
      color: "#ffc52f",
      fontFamily: "monospace",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#0b0918",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    this.screenBackdrop = this.add.rectangle(SPACEBLADE_WIDTH / 2, SPACEBLADE_HEIGHT / 2, SPACEBLADE_WIDTH, SPACEBLADE_HEIGHT, PUBLIC_PALETTE.background, 0.96)
      .setDepth(10);
    this.screenTitle = this.add.text(SPACEBLADE_WIDTH / 2, 190, "SPACEBLADE", {
      color: PUBLIC_PALETTE.ink,
      fontFamily: "monospace",
      fontSize: "58px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);
    this.screenBody = this.add.text(SPACEBLADE_WIDTH / 2, 350, "ONE KEY. ENDLESS RUN.\n\nAuto-run through Neon-Sector 04.\nCut down threats before they reach you.", {
      color: PUBLIC_PALETTE.muted,
      fontFamily: "monospace",
      fontSize: "24px",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5).setDepth(11);
    this.screenHint = this.add.text(SPACEBLADE_WIDTH / 2, 590, "HOLD SPACE TO START", {
      color: "#ffc52f",
      fontFamily: "monospace",
      fontSize: "25px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);

    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) ?? null;
    if (!this.spaceKey) throw new Error("Keyboard input is required for Spaceblade");
    this.spaceKey.on("down", this.handleSpaceDown, this);
    this.spaceKey.on("up", this.handleSpaceUp, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerupoutside", this.handlePointerUp, this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);
    this.setScreen(initialSpacebladeScreen(window.matchMedia("(pointer: coarse)").matches));
  }

  shutdown(): void {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleWindowBlur);
    this.nameEntryForm?.remove();
    this.nameEntryForm = null;
    this.nameEntryInput = null;
    this.nameEntryError = null;
  }

  update(): void {
    this.publicSkylineFar?.setTilePosition(this.time.now * -0.012, 0);
    this.publicSkylineNear?.setTilePosition(this.time.now * -0.028, 0);
    this.publicGround?.setTilePosition(this.time.now * -0.06, 0);
    if (this.screen !== "playing" || !this.run) return;
    const now = this.time.now;
    const heartsBefore = this.run.hearts;
    this.run = advanceRebuildRun(this.run, now);
    if (this.run.hearts < heartsBefore) {
      this.playerHurtAt = now;
      this.playSound("hit");
      this.showCombatCallout("HIT", now, 620);
      if (!this.settings.reducedEffectsEnabled) this.cameras.main.flash(110, 255, 63, 98, false);
    }
    if (this.run.wave !== this.lastSeenWave) {
      this.lastSeenWave = this.run.wave;
      this.floorClimbAt = now;
      this.floorLandingPlayedAt = null;
      this.playSound("wallClimb");
      this.showWaveBanner(this.run.wave >= 15 ? "FLOOR 15  ·  BOSS WAVE" : `FLOOR ${this.run.wave}  ·  WAVE ${this.run.wave}`, now, 1800);
    }
    if (this.floorClimbAt !== null && now - this.floorClimbAt >= 1500 && this.floorLandingPlayedAt !== this.floorClimbAt) {
      this.floorLandingPlayedAt = this.floorClimbAt;
      this.playSound("landing");
    }
    const bossPresent = this.run.enemies.some((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    if (bossPresent && !this.bossWasPresent) this.showWaveBanner("BOSS SIGNAL", now, 2200);
    if (bossPresent && !this.bossWasPresent) this.playSound("boss");
    this.bossWasPresent = bossPresent;
    if (this.spaceDownAt !== null && this.run.player.animation === "idle" && now - this.spaceDownAt >= 220) {
      this.run = startChargeRebuildRun(this.run, now);
    }
    if (this.run.status !== "playing") {
      // Publish terminal state before leaving gameplay so browser probes and
      // integrations cannot observe a stale "playing" status on the end screen.
      this.game.canvas.dataset.spacebladeRunStatus = this.run.status;
      this.game.canvas.dataset.spacebladeWave = String(this.run.wave);
      this.game.canvas.dataset.spacebladeScore = String(this.run.score);
      this.game.canvas.dataset.spacebladeHearts = String(this.run.hearts);
      this.game.canvas.dataset.spacebladeDefeated = String(this.run.defeated);
      this.game.canvas.dataset.spacebladeGrade = gradeForScore(this.run.score) ?? "UNRANKED";
      this.persistBest();
      if (this.run.status === "gameOver") {
        this.terminalAt ??= now;
        this.syncViews(now);
        if (now - this.terminalAt < 360) return;
      }
      this.setScreen("nameEntry");
      return;
    }
    this.terminalAt = null;
    this.syncViews(now);
  }

  private handleSpaceDown(): void {
    if (this.spaceDownAt !== null) return;
    if (this.screen === "playing" && (!this.run || this.run.status !== "playing")) {
      this.run = createRebuildRun(this.time.now);
      this.lastTapAt = Number.NEGATIVE_INFINITY;
      this.resetEnemyPresentation();
    }
    this.spaceDownAt = this.time.now;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Combat is intentionally Space-only. The pause control has its own
    // interactive handler and remains available as a UI exception.
    void pointer;
  }

  private readonly handleVisibilityChange = (): void => {
    if (shouldPauseForVisibility(document.hidden, this.screen)) {
      // Browsers may drop the matching keyup/pointerup while a tab is hidden.
      // Clear the transient hold before pausing so the next input can recover.
      this.spaceDownAt = null;
      this.setScreen("paused");
    }
  };

  private readonly handleWindowBlur = (): void => {
    if (this.screen !== "playing") return;
    this.spaceDownAt = null;
  };

  private handleSpaceUp(): void {
    if (this.spaceDownAt === null) return;
    const now = this.time.now;
    const heldMs = now - this.spaceDownAt;
    this.spaceDownAt = null;
    if (this.screen !== "playing") {
      if (this.screen === "mobileWarning") {
        this.setScreen("title");
        return;
      }
      if (this.screen === "title" || this.screen === "tutorial") {
        if (heldMs >= 260) {
          if (this.screen === "title") this.setScreen("tutorial");
          else if (this.tutorialReturnScreen === "paused") {
            this.tutorialReturnScreen = "title";
            this.setScreen("paused");
          } else this.startGameplay();
        }
        return;
      }
      if (heldMs >= 450) {
        this.confirmMenuAction();
      } else {
        this.menuFocus = (this.menuFocus + 1) % this.menuActions.length;
        this.refreshOverlay();
      }
      return;
    }
    if (!this.run) return;
    if (this.run.status !== "playing") return;
    if (heldMs >= 220) {
      this.run = releaseChargeRebuildRun(this.run, now, heldMs);
      this.playSound(this.run.player.animation === "heavy" ? "energyShot" : "slash");
    }
    else {
      this.run = tapRebuildRun(this.run, now, now - this.lastTapAt <= 300);
      this.lastTapAt = now;
      if (this.run.player.animation === "parry") {
        this.playSound("parry");
        this.showCombatCallout("PERFECT PARRY  ·  STUNNED", now, 820);
        if (!this.settings.reducedEffectsEnabled) this.cameras.main.flash(120, 57, 246, 176, false);
      } else this.playSound("slash");
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.screen === "playing") return;
    if (this.screen === "mobileWarning") {
      this.setScreen("title");
      return;
    }
    if (this.screen === "title") {
      this.setScreen("tutorial");
      return;
    }
    if (this.screen === "tutorial") {
      if (this.tutorialReturnScreen === "paused") {
        this.tutorialReturnScreen = "title";
        this.setScreen("paused");
      } else this.startGameplay();
      return;
    }
    if (this.screen === "highscores") {
      return;
    }
    if (this.screen === "nameEntry") return;
    void pointer;
  }

  private startGameplay(): void {
    this.run = createRebuildRun(this.time.now);
    this.resetEnemyPresentation();
    this.lastTapAt = Number.NEGATIVE_INFINITY;
    this.lastSeenWave = 1;
    this.bossWasPresent = false;
    this.waveBannerUntil = 0;
    this.waveBanner?.setVisible(false);
    this.highscores = null;
    this.highscoresTab = "global";
    this.leaderboardLoading = false;
    this.leaderboardSubmitted = false;
    this.submitOutcome = null;
    this.nameEntryInput && (this.nameEntryInput.value = "");
    this.lastDisplayedProjectileCount = 0;
    this.lastDisplayedShieldedCount = 0;
    this.lastDisplayedBlockedProjectileCount = 0;
    this.lastDisplayedEnergyShotsBlocked = 0;
    this.playSound("ambient");
    this.setScreen("playing");
  }

  private playSound(cue: SoundCue): void {
    try {
      this.soundBus?.play(cue);
    } catch {
      // Audio is an enhancement; gameplay must continue if the browser blocks it.
    }
  }

  private persistBest(): void {
    if (!this.run || !this.storage) return;
    const best = saveSpacebladeBest(this.storage, { score: this.run.score, wave: this.run.wave });
    this.bestScore = best.score;
    this.bestWave = best.wave;
  }

  private persistSettings(): void {
    if (this.storage) saveSpacebladeSettings(this.storage, this.settings);
  }

  private async loadHighscores(): Promise<void> {
    if (this.leaderboardLoading) return;
    this.leaderboardLoading = true;
    this.refreshOverlay();
    try {
      this.highscores = await loadRebuildHighscores(this.bestScore, this.bestWave, this.playerName);
    } catch {
      this.highscores = { fetchState: "offline", entries: [] };
    } finally {
      this.leaderboardLoading = false;
      if (this.screen === "highscores") this.refreshOverlay();
    }
  }

  private submitRunIfEligible(): void {
    if (!this.run || this.leaderboardSubmitted) return;
    this.leaderboardSubmitted = true;
    void submitRebuildRun(this.run, this.playerName).then((outcome) => {
      this.submitOutcome = outcome;
      if (this.screen === "gameOver") this.refreshOverlay();
    });
  }

  private createNameEntryForm(): void {
    const form = document.createElement("form");
    form.className = "spaceblade-name-entry";
    form.setAttribute("data-spaceblade-name-entry", "");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submitNameEntry();
    });

    const label = document.createElement("label");
    label.className = "spaceblade-name-label";
    label.textContent = "ENTER YOUR NAME";
    label.htmlFor = "spaceblade-player-name";
    const input = document.createElement("input");
    input.id = "spaceblade-player-name";
    input.className = "spaceblade-name-input";
    input.type = "text";
    input.maxLength = 16;
    input.setAttribute("autocomplete", "nickname");
    input.placeholder = "Pilot name";
    input.setAttribute("data-spaceblade-player-name", "");
    const submit = document.createElement("button");
    submit.className = "spaceblade-name-submit";
    submit.type = "submit";
    submit.textContent = "SUBMIT SCORE";
    const error = document.createElement("p");
    error.className = "spaceblade-name-error";
    error.setAttribute("data-spaceblade-name-error", "");

    form.append(label, input, submit, error);
    document.body.append(form);
    this.nameEntryForm = form;
    this.nameEntryInput = input;
    this.nameEntryError = error;
  }

  private submitNameEntry(): void {
    if (this.screen !== "nameEntry" || !this.run || !this.nameEntryInput) return;
    const rawName = this.nameEntryInput.value.trim();
    if (!rawName) {
      if (this.nameEntryError) this.nameEntryError.textContent = "TYPE A NAME TO CONTINUE";
      this.nameEntryInput.focus();
      return;
    }
    this.playerName = sanitizePlayerName(rawName);
    try {
      window.localStorage.setItem("spaceblade.playerName", this.playerName);
    } catch {
      // Name persistence is best-effort; this run still submits normally.
    }
    if (this.nameEntryError) this.nameEntryError.textContent = "";
    this.submitOutcome = "pending";
    this.setScreen("gameOver");
    this.submitRunIfEligible();
  }

  private resetEnemyPresentation(): void {
    // A new simulation run gets fresh enemy IDs, but Phaser views outlive the
    // simulation. Hide and pool every old view before the first new frame.
    for (const [id, view] of this.enemyViews) {
      view.sprite.setVisible(false).setAlpha(0).setAngle(0);
      view.marker.setVisible(false);
      view.healthBar.clear().setVisible(false);
      const pool = this.enemyViewPools.get(view.definition.id) ?? [];
      pool.push(view);
      this.enemyViewPools.set(view.definition.id, pool);
      this.enemyViews.delete(id);
    }
    for (const [id, view] of this.projectileViews) {
      view.setVisible(false).setAlpha(0);
      this.projectileViewPool.push(view);
      this.projectileViews.delete(id);
    }
    this.enemyDeathAt.clear();
    this.enemyAttackTargetAt.clear();
    this.enemyRecoveryAt.clear();
    this.enemyHpSeen.clear();
    this.enemyHitAt.clear();
    this.glitchTeleportAlertedAt.clear();
    for (const label of this.enemyHitLabels.values()) label.destroy();
    this.enemyHitLabels.clear();
    this.enemyHitLabelAt.clear();
    this.retiredEnemyIds.clear();
    for (const view of this.enemyExplosionViews.values()) {
      view.setVisible(false).setAlpha(0);
      this.enemyExplosionViewPool.push(view);
    }
    this.enemyExplosionViews.clear();
    this.playerHurtAt = null;
    this.terminalAt = null;
    this.combatCallout = "";
    this.combatCalloutUntil = 0;
  }

  private confirmMenuAction(): void {
    const action = this.menuActions[this.menuFocus];
    if (this.screen === "paused") {
      if (action === "resume") {
        this.playSound("ambient");
        this.setScreen("playing");
      }
      else if (action === "settings") this.setScreen("settings");
      else if (action === "tutorial") {
        this.tutorialReturnScreen = "paused";
        this.setScreen("tutorial");
      }
      else if (action === "restart") this.startGameplay();
      else if (action === "title") {
        this.run = createRebuildRun(this.time.now);
        this.setScreen("title");
      }
    } else if (this.screen === "settings") {
      if (action === "screenShake") {
        this.settings = { ...this.settings, screenShakeEnabled: !this.settings.screenShakeEnabled };
        this.persistSettings();
        this.refreshOverlay();
      } else if (action === "reducedEffects") {
        this.settings = { ...this.settings, reducedEffectsEnabled: !this.settings.reducedEffectsEnabled };
        this.persistSettings();
        this.refreshOverlay();
      } else if (action === "volume") {
        const levels = [0, 0.25, 0.5, 0.7, 1];
        const current = levels.findIndex((level) => Math.abs(level - this.settings.volume) < 0.01);
        this.settings = { ...this.settings, volume: levels[(current + 1) % levels.length] };
        this.persistSettings();
        this.refreshOverlay();
      } else if (action === "callsign") {
        const current = CALLSIGNS.indexOf(this.playerName as (typeof CALLSIGNS)[number]);
        this.playerName = CALLSIGNS[(current + 1) % CALLSIGNS.length];
        try {
          window.localStorage.setItem("spaceblade.playerName", this.playerName);
        } catch {
          // A missing or blocked storage backend must not interrupt gameplay.
        }
        this.refreshOverlay();
      } else if (action === "back") {
        this.setScreen("paused");
      }
    } else if (this.screen === "gameOver") {
      if (action === "restart") this.startGameplay();
      else if (action === "highscores") {
        this.highscoresTab = "global";
        this.setScreen("highscores");
        void this.loadHighscores();
      }
      else if (action === "title") {
        this.run = createRebuildRun(this.time.now);
        this.setScreen("title");
      }
    } else if (this.screen === "highscores") {
      if (action === "global") {
        this.highscoresTab = action;
        if (this.highscores?.fetchState === "offline") {
          this.highscores = null;
          void this.loadHighscores();
        } else {
          this.refreshOverlay();
        }
      } else if (action === "friends") {
        this.highscoresTab = action;
        this.refreshOverlay();
      } else if (action === "title") {
        this.setScreen("title");
      }
    }
  }

  private setScreen(screen: EngineScreen): void {
    this.screen = screen;
    this.clearMenuButtons();
    if (screen === "title") this.tutorialReturnScreen = "title";
    if (screen !== "playing") this.soundBus?.stopAmbient();
    this.game.canvas.dataset.spacebladeScreen = screen;
    this.game.canvas.dataset.spacebladeHudLayout = "split";
    if (screen === "highscores") this.game.canvas.dataset.spacebladeHighscoresTab = this.highscoresTab;
    const inGameplay = screen === "playing";
    this.playerView?.setVisible(inGameplay);
    this.hud?.setVisible(inGameplay);
    this.hudWave?.setVisible(inGameplay);
    this.hudScore?.setVisible(inGameplay);
    this.pauseButtonBackground?.setVisible(inGameplay);
    this.pauseButtonLabel?.setVisible(inGameplay);
    this.playerHpBar?.setVisible(inGameplay);
    this.status?.setVisible(inGameplay);
    this.combatFx?.setVisible(inGameplay);
    this.deathFx?.setVisible(inGameplay);
    this.enemyFx?.setVisible(inGameplay);
    for (const view of this.projectileViews.values()) view.setVisible(inGameplay);
    for (const view of this.enemyExplosionViews.values()) view.setVisible(inGameplay);
    this.runnerMotion?.setVisible(inGameplay);
    this.waveProgress?.setVisible(inGameplay);
    this.waveProgressLabel?.setVisible(inGameplay);
    this.parryTiming?.setVisible(inGameplay);
    this.parryTimingLabel?.setVisible(inGameplay);
    this.skylineMotion?.setVisible(inGameplay);
    this.buildingInterior?.setVisible(inGameplay);
    this.waveBanner?.setVisible(inGameplay && this.waveBannerUntil > this.time.now);
    for (const view of this.enemyViews.values()) {
      view.sprite.setVisible(inGameplay);
      view.marker.setVisible(false);
      view.healthBar.setVisible(inGameplay);
    }
    this.screenBackdrop?.setVisible(!inGameplay);
    this.menuActions = screen === "paused" || screen === "settings" || screen === "gameOver" || screen === "highscores"
      ? (screen === "paused" ? ["resume", "settings", "tutorial", "restart", "title"] : screen === "settings" ? ["volume", "screenShake", "reducedEffects", "callsign", "back"] : screen === "gameOver" ? ["restart", "highscores", "title"] : ["global", "friends", "title"])
      : [];
    this.menuFocus = 0;
    this.game.canvas.dataset.spacebladeMenuMode = this.menuActions.length > 0 ? "mouse" : "none";
    if (this.menuActions.length > 0) {
      this.screenTitle?.setVisible(true).setDepth(40);
      this.screenBody?.setVisible(true).setDepth(40);
      this.screenHint?.setVisible(true).setDepth(40);
    }
    this.buildMenuButtons();
    if (this.nameEntryForm) {
      this.nameEntryForm.style.display = screen === "nameEntry" ? "grid" : "none";
      if (screen === "nameEntry") {
        this.nameEntryInput?.focus();
      }
    }
    this.screenHint?.setY(this.menuActions.length > 0 ? 688 : 590);
    this.screenTitle?.setVisible(!inGameplay);
    this.screenBody?.setVisible(!inGameplay);
    this.screenHint?.setVisible(!inGameplay);
    this.screenTitle?.setDepth(this.menuActions.length > 0 ? 40 : 20);
    this.screenBody?.setDepth(this.menuActions.length > 0 ? 40 : 20);
    this.screenHint?.setDepth(this.menuActions.length > 0 ? 40 : 20);
    this.refreshOverlay();
  }

  private refreshOverlay(): void {
    if (!this.screenTitle || !this.screenBody || !this.screenHint || this.screen === "playing") return;
    const run = this.run;
    const isMobileWarning = this.screen === "mobileWarning";
    this.screenTitle.setFontSize(isMobileWarning ? "72px" : "58px");
    this.screenBody.setFontSize(isMobileWarning ? "34px" : "24px");
    this.screenHint.setFontSize(isMobileWarning ? "32px" : "25px");
    this.screenTitle.setY(this.screen === "gameOver" || this.screen === "highscores" ? 120 : 190);
    if (this.screen === "title") {
      this.screenTitle.setText("SPACEBLADE");
      this.game.canvas.dataset.spacebladeTitleTagline = "ONE KEY. ENDLESS FIGHT.";
      this.screenBody.setText(`ONE KEY. ENDLESS FIGHT.\n\nAuto-run through Neon-Sector 04.\nCut down threats before they reach you.\n\nBEST  ${this.bestScore}  ·  WAVE ${this.bestWave}`);
      this.screenHint.setText("CLICK TO START");
    } else if (this.screen === "mobileWarning") {
      this.screenTitle.setText("KEYBOARD RECOMMENDED");
      this.screenBody.setText("ONE BUTTON. SPACE OR TOUCH.\n\nROTATE TO LANDSCAPE FOR GAMEPLAY.");
      this.screenHint.setText("CLICK TO CONTINUE");
    } else if (this.screen === "tutorial") {
      this.screenTitle.setText("HOW TO PLAY");
      this.screenBody.setText("TAP  -  SWORD SLASH\nHOLD + RELEASE  -  GUN SHOT\nDOUBLE TAP  -  DODGE\nPERFECT TIMING  -  PARRY\n\nSHIELDS BLOCK GUNS. TAP TO BREAK THEM.\nThreats approach from ahead. Strike before contact.");
      this.screenHint.setText(this.tutorialReturnScreen === "paused" ? "CLICK TO RETURN" : "CLICK TO DEPLOY");
    } else if (this.screen === "paused") {
      this.screenTitle.setText("PAUSED");
      this.screenBody.setText("SELECT AN OPTION\n\nThe run stays paused while you choose.");
      this.screenHint.setText("CLICK AN OPTION");
    } else if (this.screen === "settings") {
      this.screenTitle.setText("SETTINGS");
      this.screenBody.setText("PERSONALIZE YOUR RUN\n\nChoose a setting to change it.");
      this.screenHint.setText("CLICK A SETTING");
    } else if (this.screen === "nameEntry") {
      this.screenTitle.setText("RUN COMPLETE");
      this.screenBody.setText(`SCORE  ${run?.score ?? 0}\nWAVE  ${run?.wave ?? 1}\n\nTYPE YOUR NAME TO PUBLISH THIS RUN`);
      this.screenHint.setText("SUBMIT YOUR SCORE");
    } else if (this.screen === "gameOver") {
      const title = run?.status === "victory" ? "SECTOR CLEARED" : "GAME OVER";
      this.screenTitle.setText(title);
      this.game.canvas.dataset.spacebladeScreenTitle = title;
      const submitLabel = this.submitOutcome === "pending" ? "SUBMITTING SCORE..." : this.submitOutcome === "submitted" ? "SCORE SUBMITTED" : this.submitOutcome === "offline" ? "SCORE SAVED LOCALLY  ·  OFFLINE" : this.submitOutcome === "disabled" ? "ONLINE SCORES DISABLED" : this.submitOutcome === "skipped" ? "SCORE NOT SUBMITTED" : "";
      const grade = gradeForScore(run?.score ?? 0) ?? "UNRANKED";
      this.screenBody.setText(`SCORE  ${run?.score ?? 0}\nWAVE  ${run?.wave ?? 1}\nENEMIES DEFEATED  ${run?.defeated ?? 0}\nBEST COMBO  ${run?.bestCombo ?? 0}\nGRADE  ${grade}${submitLabel ? `\n${submitLabel}` : ""}`);
      this.screenHint.setText("CLICK AN OPTION");
    } else {
      this.screenTitle.setText("HIGHSCORES");
      this.game.canvas.dataset.spacebladeHighscoresTab = this.highscoresTab;
      this.game.canvas.dataset.spacebladeHighscoresState = this.leaderboardLoading
        ? "loading"
        : this.highscores?.fetchState ?? "unknown";
      this.game.canvas.dataset.spacebladeHighscoresCount = String(this.highscores?.entries.length ?? 0);
      const localEntries = localFriendsResult(this.bestScore, this.bestWave, this.playerName).entries;
      let content = "";
      if (this.highscoresTab === "global" && this.leaderboardLoading) {
        content = "LOADING SECTOR RECORDS...\n\nThe leaderboard is checked only when this screen opens.";
      } else if (this.highscoresTab === "global" && this.highscores?.fetchState === "offline") {
        content = "GLOBAL RECORDS OFFLINE.\n\nHOLD GLOBAL TO RETRY.\nYour local best remains saved on this device.";
      } else if (this.highscoresTab === "global" && this.highscores?.fetchState === "disabled") {
        content = "GLOBAL RECORDS DISABLED.\n\nConfigure Firebase to publish online scores.";
      } else if (this.highscoresTab === "friends" && localEntries.length === 0) {
        content = "NO LOCAL BEST YET.\n\nPlay a run to create your YOU row.";
      } else {
        const entries = this.highscoresTab === "friends" ? localEntries : this.highscores?.entries ?? [];
        const rows = entries.slice(0, 8).map((entry, index) => `${this.highscoresTab === "friends" ? "YOU" : String(index + 1).padStart(2, "0")}  ${entry.playerName.padEnd(16, " ")}  ${String(entry.score).padStart(6, " ")}  W${entry.wave}`).join("\n");
        content = `${this.highscoresTab === "friends" ? "FRIENDS  ·  LOCAL BEST" : "GLOBAL RECORDS"}\n\n${rows}`;
      }
      this.screenBody.setText(`${content}`);
      this.screenHint.setText("CLICK A RECORDS OPTION");
    }
  }

  private drawArena(): void {
    const graphics = this.add.graphics().setDepth(0);
    // Overscan keeps camera shake from exposing transparent canvas edges.
    const overscan = 96;
    graphics.fillStyle(PUBLIC_PALETTE.background, 1).fillRect(-overscan, -overscan, SPACEBLADE_WIDTH + overscan * 2, SPACEBLADE_HEIGHT + overscan * 2);
    graphics.fillStyle(PUBLIC_PALETTE.ground, 1).fillRect(0, GROUND_Y, SPACEBLADE_WIDTH, SPACEBLADE_HEIGHT - GROUND_Y);
    graphics.fillStyle(PUBLIC_PALETTE.groundLine, 1).fillRect(0, GROUND_Y, SPACEBLADE_WIDTH, 4);
  }

  private syncViews(now: number): void {
    if (!this.hudWave || !this.hudScore || !this.playerHpBar) return;
    if (this.screen !== "playing" || !this.run || !this.playerView || !this.hud || !this.status) return;
    const run = this.run;
    this.game.canvas.dataset.spacebladeWave = String(run.wave);
    this.game.canvas.dataset.spacebladeScore = String(run.score);
    this.game.canvas.dataset.spacebladeHearts = String(run.hearts);
    this.game.canvas.dataset.spacebladeActiveThreats = String(run.enemies.filter((enemy) => enemy.state !== "dead").length);
    this.game.canvas.dataset.spacebladeThreatWeight = String(rebuildActiveThreatWeight(run));
    this.game.canvas.dataset.spacebladeCombo = String(run.combo);
    this.game.canvas.dataset.spacebladeDefeated = String(run.defeated);
    this.game.canvas.dataset.spacebladeEnergyReadyAt = String(run.energyReadyAt);
    this.game.canvas.dataset.spacebladeGrade = gradeForScore(run.score) ?? "UNRANKED";
    this.game.canvas.dataset.spacebladeReducedEffects = String(this.settings.reducedEffectsEnabled);
    this.game.canvas.dataset.spacebladeFloor = String(run.wave);
    this.game.canvas.dataset.spacebladeRunStatus = run.status;
    this.game.canvas.dataset.spacebladePlayerX = String(VIEW_PLAYER_X);
    this.syncWaveBanner(now);
    const facing = facingFor(run);
    const playerVisualState = run.status === "gameOver"
      ? "dead"
      : run.player.hurtUntil > now
        ? "hurt"
        : run.player.animation;
    const playerAnimation = playerVisualState === "idle" && PLAYER_ANIMATION_KEYS.has("run")
      ? "run"
      : playerVisualAnimation(playerVisualState, PLAYER_ANIMATION_KEYS);
    const playerFrames = animationFor(REBUILD_PLAYER, playerAnimation);
    const playerElapsed = playerVisualState === "dead"
      ? now - (this.terminalAt ?? now)
      : playerVisualState === "hurt"
        ? now - (this.playerHurtAt ?? now)
        : now - run.player.actionStartedAt;
    const playerFrame = playerFrames.frames[frameIndexAt(playerFrames, playerElapsed)];
    this.game.canvas.dataset.spacebladePlayerFrame = playerFrame;
    this.game.canvas.dataset.spacebladePlayerAnimation = playerAnimation;
    if (playerVisualState === "hurt") this.game.canvas.dataset.spacebladePlayerHurtFrame = playerFrame;
    if (playerVisualState === "dead") this.game.canvas.dataset.spacebladePlayerDeadFrame = playerFrame;
    const motionAnimation = playerVisualState === "hurt" || playerVisualState === "dead" ? "idle" : run.player.animation;
    const playerOffset = rebuildPlayerVisualOffset(motionAnimation, playerElapsed, facing);
    const floorOffset = playerVisualState === "dead" || this.floorClimbAt === null
      ? null
      : rebuildFloorTransitionOffset(now - this.floorClimbAt, facing);
    if (this.floorClimbAt !== null && floorOffset === null) this.floorClimbAt = null;
    const traversalPhase = floorOffset === null
      ? "complete"
      : rebuildFloorTraversalPhase(now - (this.floorClimbAt ?? now));
    const parkourOffset = playerVisualState === "dead"
      ? { x: 0, y: 0, angle: 0 }
      : floorOffset ?? rebuildAutoParkourOffset(now, facing);
    const airborne = parkourOffset.y < 0;
    if (airborne && !this.parkourWasAirborne && floorOffset === null) this.playSound("parkourJump");
    if (!airborne && this.parkourWasAirborne) this.playSound("landing");
    this.parkourWasAirborne = airborne;
    this.game.canvas.dataset.spacebladeParkour = traversalPhase !== "complete"
      ? traversalPhase
      : parkourOffset.y < 0 ? "vaulting" : "grounded";
    this.game.canvas.dataset.spacebladeTraversalPhase = traversalPhase;
    this.playerView
      .setTexture(frameKey(playerFrame))
      .setPosition(VIEW_PLAYER_X + playerOffset.x + parkourOffset.x, GROUND_Y + playerOffset.y + parkourOffset.y)
      .setAngle(parkourOffset.angle)
      .setAlpha(1)
      .setFlipX(facing === "left");
    this.playerView.setCrop();
    if (this.lastFxActionAt !== run.player.actionStartedAt) {
      this.lastFxActionAt = run.player.actionStartedAt;
      if (this.settings.screenShakeEnabled && (run.player.animation === "slash" || run.player.animation === "heavy" || run.player.animation === "parry")) {
        this.cameras.main.shake(90, 0.002);
      }
    }
    this.drawCombatFx(motionAnimation, playerElapsed, facing);
    this.syncCombatFeedback(run, now);
    this.syncProjectiles(now);
    this.deathFx?.clear();
    this.enemyFx?.clear();

    this.hud.setText(`HP ${"♥".repeat(run.hearts)}${"♡".repeat(3 - run.hearts)}`);
    this.hudWave.setText(`FLOOR ${run.wave}`);
    this.hudScore.setText(`SCORE ${run.score}${run.combo > 0 ? `  ·  COMBO x${run.combo}` : ""}`);
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x241532, 0.96).fillRect(20, 48, 180, 8);
    this.playerHpBar.fillStyle(run.hearts > 0 ? PUBLIC_PALETTE.magenta : 0x5a2133, 1).fillRect(20, 48, 180 * Math.max(0, Math.min(1, run.hearts / 3)), 8);
    this.playerHpBar.lineStyle(1, PUBLIC_PALETTE.amber, 0.7).strokeRect(20, 48, 180, 8);
    this.drawWaveProgress(run);
    this.drawParryTiming(run, now);
    this.drawBuildingInterior(now, run.wave, traversalPhase);
    this.drawSkylineMotion(now, run.wave);
    this.drawRunnerMotion(now, facing);
    const bossActive = run.enemies.some((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    const boss = run.enemies.find((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    this.game.canvas.dataset.spacebladeBossActive = String(Boolean(boss));
    if (boss) this.game.canvas.dataset.spacebladeBossHp = String(boss.hp);
    const baseStatus = bossActive ? "BOSS SIGNAL  ·  READ THE TELEGRAPH  ·  SPACE TO SURVIVE" : run.status === "playing" ? "TAP: SWORD  ·  HOLD: GUN SHOT  ·  DOUBLE TAP: DODGE" : run.status === "victory" ? "SECTOR CLEARED  ·  PRESS SPACE TO RESTART" : "RUN OVER  ·  PRESS SPACE TO RESTART";
    this.status.setText(now < this.combatCalloutUntil ? this.combatCallout : baseStatus);

    for (const enemy of run.enemies) {
      if (enemy.state === "dead" && this.retiredEnemyIds.has(enemy.id)) continue;
      this.syncEnemy(enemy, now);
    }
  }

  private drawRunnerMotion(now: number, facing: "left" | "right"): void {
    if (!this.runnerMotion) return;
    const offset = (now * 0.18) % 180;
    this.runnerMotion.clear();
    this.runnerMotion.lineStyle(2, 0x1a5d73, 0.55);
    for (let x = -180 + offset; x < SPACEBLADE_WIDTH + 180; x += 180) {
      this.runnerMotion.lineBetween(x, GROUND_Y + 28, x + 72, GROUND_Y + 28);
      this.runnerMotion.lineBetween(x + 30, GROUND_Y + 48, x + 82, GROUND_Y + 48);
    }
    this.runnerMotion.lineStyle(1, 0x2cb7d3, 0.28);
    for (let x = -120 + offset * 0.55; x < SPACEBLADE_WIDTH + 120; x += 240) {
      this.runnerMotion.lineBetween(x, GROUND_Y - 24, x + 36, GROUND_Y - 24);
    }

    const direction = facing === "right" ? 1 : -1;
    const trailPhase = now / 95;
    for (let index = 0; index < 4; index += 1) {
      const length = 26 + ((index * 13) % 24);
      const y = GROUND_Y - 54 - index * 18 + Math.sin(trailPhase + index) * 3;
      const start = VIEW_PLAYER_X - direction * (54 + index * 22);
      this.runnerMotion.lineStyle(2 + (index % 2), 0x57eaff, 0.34 - index * 0.055);
      this.runnerMotion.lineBetween(start, y, start - direction * length, y + 4);
    }
  }

  private drawSkylineMotion(now: number, wave: number): void {
    if (!this.skylineMotion) return;
    const offset = (now * 0.06) % 320;
    this.skylineMotion.clear().setVisible(false);
    const floorOffset = Math.max(0, wave - 1) * 42;
    this.publicSkylineFar?.setTilePosition(now * -0.012, -floorOffset * 0.35);
    this.publicSkylineNear?.setTilePosition(now * -0.028, -floorOffset);
    this.publicGround?.setTilePosition(now * -0.06, 0);
    this.game.canvas.dataset.spacebladeBackgroundOffset = String(Math.round(offset));
  }

  private drawBuildingInterior(
    now: number,
    floor: number,
    traversalPhase: ReturnType<typeof rebuildFloorTraversalPhase>,
  ): void {
    if (!this.buildingInterior) return;
    const graphics = this.buildingInterior;
    const floorTone = floor % 3;
    const pulse = 0.45 + Math.sin(now / 240) * 0.12;
    graphics.clear();

    // A restrained interior shell keeps the public city art behind the action
    // while making the active room, walls, and vertical shaft legible.
    graphics.fillStyle(0x071322, 0.72).fillRect(42, 82, SPACEBLADE_WIDTH - 84, GROUND_Y - 82);
    graphics.fillStyle(0x101d31, 0.96).fillRect(42, 82, 22, GROUND_Y - 82);
    graphics.fillStyle(0x101d31, 0.96).fillRect(SPACEBLADE_WIDTH - 64, 82, 22, GROUND_Y - 82);
    graphics.fillStyle(0x14243a, 0.92).fillRect(42, 82, SPACEBLADE_WIDTH - 84, 14);
    graphics.lineStyle(2, 0x2cb7d3, 0.56).lineBetween(64, 96, SPACEBLADE_WIDTH - 64, 96);

    const windowColors = [0x12304a, 0x17304e, 0x241d48] as const;
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const x = 108 + column * 164;
        const y = 142 + row * 142;
        const lit = (column + row + floor) % 4 === 0;
        graphics.fillStyle(lit ? 0x214866 : windowColors[floorTone], lit ? pulse : 0.82);
        graphics.fillRect(x, y, 92, 76);
        graphics.lineStyle(1, lit ? 0x57eaff : 0x1c4960, lit ? 0.7 : 0.42);
        graphics.strokeRect(x, y, 92, 76);
        graphics.lineBetween(x + 46, y, x + 46, y + 76);
        graphics.lineBetween(x, y + 38, x + 92, y + 38);
      }
    }

    // The side rails and rungs communicate the automatic wall-climb route.
    graphics.lineStyle(4, 0x2cb7d3, traversalPhase === "wall-climb" ? 0.95 : 0.52);
    graphics.lineBetween(88, 112, 88, GROUND_Y - 20);
    graphics.lineBetween(116, 112, 116, GROUND_Y - 20);
    graphics.lineStyle(2, 0x57eaff, traversalPhase === "wall-climb" ? 0.8 : 0.32);
    for (let y = 136; y < GROUND_Y - 24; y += 38) graphics.lineBetween(88, y, 116, y);

    graphics.fillStyle(0x0b1728, 0.98).fillRect(42, GROUND_Y - 12, SPACEBLADE_WIDTH - 84, 12);
    graphics.lineStyle(3, 0xffc52f, 0.9).lineBetween(42, GROUND_Y - 2, SPACEBLADE_WIDTH - 42, GROUND_Y - 2);
    graphics.lineStyle(1, 0x57eaff, 0.42).lineBetween(64, GROUND_Y + 12, SPACEBLADE_WIDTH - 64, GROUND_Y + 12);

    if (traversalPhase === "wall-climb") {
      const rung = 136 + (Math.floor(now / 90) % 9) * 38;
      graphics.lineStyle(4, 0xffc52f, 0.9).lineBetween(82, rung, 122, rung);
      graphics.lineStyle(2, 0xffc52f, 0.78).lineBetween(102, rung - 26, 102, rung - 6);
    }
  }

  private drawCombatFx(animation: RebuildRun["player"]["animation"], elapsed: number, facing: "left" | "right"): void {
    if (!this.combatFx) return;
    this.combatFx.clear();
    if (this.settings.reducedEffectsEnabled && (animation === "charging" || animation === "dodge")) return;
    const direction = facing === "right" ? 1 : -1;
    const fade = Math.max(0, 1 - elapsed / (animation === "heavy" ? 460 : 300));
    if (animation === "slash") {
      this.combatFx.lineStyle(7, 0x57eaff, fade);
      this.combatFx.lineBetween(VIEW_PLAYER_X + direction * 32, GROUND_Y - 126, VIEW_PLAYER_X + direction * 190, GROUND_Y - 194);
      this.combatFx.lineStyle(3, 0xc8fbff, fade * 0.9);
      this.combatFx.lineBetween(VIEW_PLAYER_X + direction * 62, GROUND_Y - 92, VIEW_PLAYER_X + direction * 156, GROUND_Y - 140);
      this.combatFx.lineBetween(VIEW_PLAYER_X + direction * 78, GROUND_Y - 74, VIEW_PLAYER_X + direction * 135, GROUND_Y - 102);
    } else if (animation === "heavy") {
      const launchX = VIEW_PLAYER_X + direction * 34;
      const launchY = GROUND_Y - 112;
      this.combatFx.fillStyle(0x10243b, fade);
      this.combatFx.fillRect(launchX - direction * 8, launchY - 14, direction * 42, 18);
      this.combatFx.fillStyle(0x24d9ff, fade);
      this.combatFx.fillRect(launchX + direction * 24, launchY - 10, direction * 22, 10);
      this.combatFx.lineStyle(3, 0xe8feff, fade);
      this.combatFx.lineBetween(launchX + direction * 5, launchY - 14, launchX + direction * 45, launchY - 14);
      this.combatFx.lineBetween(launchX + direction * 6, launchY + 5, launchX + direction * 20, launchY + 22);
      this.combatFx.fillStyle(0xf4fbff, fade);
      this.combatFx.fillTriangle(
        launchX + direction * 48,
        launchY - 14,
        launchX + direction * 70,
        launchY - 5,
        launchX + direction * 48,
        launchY + 2,
      );
      this.combatFx.lineStyle(5, 0x24d9ff, fade * 0.9);
      for (let index = 0; index < 4; index += 1) {
        const spread = 18 + index * 9;
        this.combatFx.lineBetween(launchX, launchY, launchX + direction * (42 + index * 12), launchY - spread);
      }
    } else if (animation === "charging") {
      const pulse = 0.35 + 0.35 * Math.sin(elapsed / 70);
      this.combatFx.lineStyle(4, 0x57eaff, pulse);
      for (let index = 0; index < 4; index += 1) {
        const offset = 34 + index * 22;
        this.combatFx.lineBetween(VIEW_PLAYER_X - offset, GROUND_Y - 42, VIEW_PLAYER_X - offset - 12, GROUND_Y - 120 - index * 8);
        this.combatFx.lineBetween(VIEW_PLAYER_X + offset, GROUND_Y - 42, VIEW_PLAYER_X + offset + 12, GROUND_Y - 120 - index * 8);
      }
    } else if (animation === "dodge") {
      this.combatFx.lineStyle(6, 0x57eaff, fade);
      for (let index = 0; index < 4; index += 1) {
        const start = VIEW_PLAYER_X - direction * (48 + index * 28);
        this.combatFx.lineBetween(start, GROUND_Y - 60 - index * 12, start - direction * 92, GROUND_Y - 60 - index * 12);
      }
    } else if (animation === "parry") {
      this.combatFx.lineStyle(6, 0xf4fbff, fade);
      this.combatFx.lineBetween(VIEW_PLAYER_X - direction * 24, GROUND_Y - 70, VIEW_PLAYER_X + direction * 80, GROUND_Y - 176);
      this.combatFx.lineStyle(3, 0x57eaff, fade);
      this.combatFx.lineBetween(VIEW_PLAYER_X - direction * 46, GROUND_Y - 40, VIEW_PLAYER_X + direction * 110, GROUND_Y - 200);
    }
  }

  private syncProjectiles(now: number): void {
    if (!this.run) return;
    const activeIds = new Set<string>();
    for (const projectile of this.run.projectiles) {
      activeIds.add(projectile.id);
      let view = this.projectileViews.get(projectile.id);
      if (!view) {
        view = this.projectileViewPool.pop() ?? this.add.image(0, 0, effectKey(PUBLIC_SHOT_SOURCES[0]))
          .setOrigin(0.5)
          .setScale(3.4)
          .setDepth(3);
        this.projectileViews.set(projectile.id, view);
      }
      const screenX = VIEW_PLAYER_X + (projectile.x - PLAYER_X);
      const age = now - projectile.startedAt;
      const pulse = 0.78 + Math.sin(age / 45) * 0.18;
      view
        .setTexture(effectKey(publicShotSourceAt(age)))
        .setPosition(screenX, GROUND_Y - 112)
        .setAlpha(pulse)
        .setVisible(true);
    }
    for (const [id, view] of this.projectileViews) {
      if (activeIds.has(id)) continue;
      this.projectileViews.delete(id);
      view.setVisible(false).setAlpha(0);
      this.projectileViewPool.push(view);
    }
    this.game.canvas.dataset.spacebladeProjectileCount = String(this.run.projectiles.length);
    if (this.run.projectiles[0]) {
      this.game.canvas.dataset.spacebladeProjectileX = String(Math.round(this.run.projectiles[0].x));
    } else {
      delete this.game.canvas.dataset.spacebladeProjectileX;
    }
  }

  private syncCombatFeedback(run: RebuildRun, now: number): void {
    const shieldedCount = run.enemies.filter((enemy) => enemy.state !== "dead" && enemy.type === "shield" && enemy.shielded).length;
    const projectileImpact = run.projectiles.length < this.lastDisplayedProjectileCount && run.player.animation === "heavy";
    const projectileBlocked = run.projectilesBlocked > this.lastDisplayedBlockedProjectileCount;
    const energyShotBlocked = run.energyShotsBlocked > this.lastDisplayedEnergyShotsBlocked;
    if (energyShotBlocked) {
      this.showCombatCallout("ENERGY RECHARGING  ·  USE SWORD", now, 820);
    } else if (projectileBlocked) {
      this.showCombatCallout("ENERGY BLOCKED  ·  USE SWORD", now, 820);
    } else if (shieldedCount < this.lastDisplayedShieldedCount && projectileImpact) {
      this.showCombatCallout("SHIELD BREAK", now, 720);
    } else if (projectileImpact) {
      this.showCombatCallout("ENERGY HIT", now, 620);
    }
    this.lastDisplayedProjectileCount = run.projectiles.length;
    this.lastDisplayedShieldedCount = shieldedCount;
    this.lastDisplayedBlockedProjectileCount = run.projectilesBlocked;
    this.lastDisplayedEnergyShotsBlocked = run.energyShotsBlocked;
    if (now >= this.combatCalloutUntil) delete this.game.canvas.dataset.spacebladeCombatCallout;
  }

  private syncEnemy(enemy: RebuildEnemy, now: number): void {
    const definition = REBUILD_ENEMIES.find((sprite) => sprite.id === enemy.type) ?? REBUILD_ENEMIES[0];
    const screenX = VIEW_PLAYER_X + (enemy.x - PLAYER_X);
    let view = this.enemyViews.get(enemy.id);
    if (!view) {
      const firstFrame = animationFor(definition, "walk").frames[0];
      const pool = this.enemyViewPools.get(definition.id) ?? [];
      view = pool.pop() ?? {
          sprite: this.add.image(screenX, GROUND_Y, frameKey(firstFrame)).setOrigin(0.5, 1).setScale(definition.scale).setDepth(2),
          marker: this.add.text(screenX, GROUND_Y - definition.height * definition.scale - 18, "", { color: "#ff3f62", fontFamily: "monospace", fontSize: "28px", fontStyle: "bold" }).setOrigin(0.5).setDepth(4),
          healthBar: this.add.graphics().setDepth(4),
          definition,
        };
      view.sprite.setOrigin(0.5, 1).setScale(definition.scale).setVisible(true);
      view.marker.setOrigin(0.5).setVisible(false);
      view.healthBar.setVisible(true);
      this.enemyViews.set(enemy.id, view);
    }
    if (enemy.state === "dead") {
      this.enemyRecoveryAt.delete(enemy.id);
      this.enemyHitAt.delete(enemy.id);
      this.enemyHpSeen.delete(enemy.id);
      const deathAt = this.enemyDeathAt.get(enemy.id) ?? now;
      this.enemyDeathAt.set(enemy.id, deathAt);
      const deathElapsed = enemyDeathAnimationElapsed(now, deathAt);
      const renderX = clampSpriteCenterX(screenX, definition.width, definition.scale, SPACEBLADE_WIDTH);
      let explosionView = this.enemyExplosionViews.get(enemy.id);
      if (!explosionView) {
        explosionView = this.enemyExplosionViewPool.pop() ?? this.add.image(0, 0, effectKey(PUBLIC_EXPLOSION_SOURCES[0]))
          .setOrigin(0.5)
          .setDepth(3);
        this.enemyExplosionViews.set(enemy.id, explosionView);
      }
      explosionView
        .setTexture(effectKey(publicExplosionSourceAt(deathElapsed)))
        .setPosition(renderX, GROUND_Y - definition.height * definition.scale * 0.55)
        .setScale(definition.scale * (definition.id === "boss" ? 2.8 : 2.2))
        .setAlpha(Math.max(0, 1 - deathElapsed / 420))
        .setVisible(true);
      this.drawEnemyDeathFx(renderX, GROUND_Y - definition.height * definition.scale * 0.55, deathElapsed, definition.scale);
      if (!enemyDeathIsVisible(deathElapsed)) {
        this.retiredEnemyIds.add(enemy.id);
        view.sprite.setVisible(false).setAlpha(0);
        view.marker.setVisible(false);
        view.healthBar.setVisible(false);
        explosionView.setVisible(false).setAlpha(0);
        this.enemyExplosionViews.delete(enemy.id);
        this.enemyExplosionViewPool.push(explosionView);
        this.enemyViews.delete(enemy.id);
        const pool = this.enemyViewPools.get(view.definition.id) ?? [];
        pool.push(view);
        this.enemyViewPools.set(view.definition.id, pool);
        return;
      }
      const availableAnimations = ENEMY_ANIMATION_KEYS.get(enemy.type) ?? EMPTY_ANIMATION_KEYS;
      const deathAnimation = animationFor(view.definition, enemyDeathVisualAnimation(availableAnimations));
      const deathSource = deathAnimation.frames[frameIndexAt(deathAnimation, deathElapsed)];
      const deathProgress = Math.min(1, deathElapsed / 360);
      this.game.canvas.dataset.spacebladeEnemyFrame = deathSource;
      this.game.canvas.dataset.spacebladeEnemyAnimation = "dead";
      this.game.canvas.dataset.spacebladeEnemyDeathFrame = deathSource;
      view.sprite
        .setVisible(deathElapsed <= 360)
        .setTexture(frameKey(deathSource))
        .setPosition(renderX, GROUND_Y - deathProgress * 10)
        .setAngle((enemy.side === "right" ? -1 : 1) * deathProgress * 12)
        .setAlpha(1 - deathProgress);
      view.marker.setVisible(false);
      view.healthBar.setVisible(false);
      this.syncEnemyHitLabel(enemy.id, renderX, GROUND_Y - definition.height * definition.scale, now);
      return;
    }
    this.enemyDeathAt.delete(enemy.id);
    this.retiredEnemyIds.delete(enemy.id);
    const previousHp = this.enemyHpSeen.get(enemy.id);
    const tookDamage = previousHp !== undefined && enemy.hp < previousHp;
    if (tookDamage) {
      this.enemyHitAt.set(enemy.id, now);
      this.enemyHitLabelAt.set(enemy.id, now);
      this.playSound("enemyHit");
    }
    this.enemyHpSeen.set(enemy.id, enemy.hp);
    const previousAttackTargetAt = this.enemyAttackTargetAt.get(enemy.id);
    if (previousAttackTargetAt !== undefined && previousAttackTargetAt !== enemy.nextAttackAt) {
      if (previousAttackTargetAt <= now && enemy.state === "attacking") this.enemyRecoveryAt.set(enemy.id, now);
      else this.enemyRecoveryAt.delete(enemy.id);
    }
    this.enemyAttackTargetAt.set(enemy.id, enemy.nextAttackAt);
    if (enemy.state !== "attacking") this.enemyRecoveryAt.delete(enemy.id);
    const timeToImpact = enemy.nextAttackAt - now;
    const availableAnimations = ENEMY_ANIMATION_KEYS.get(enemy.type) ?? EMPTY_ANIMATION_KEYS;
    const recoveryAt = this.enemyRecoveryAt.get(enemy.id) ?? -1;
    const recoveryElapsed = recoveryAt >= 0 ? now - recoveryAt : -1;
    const recoveryAnimation = view.definition.animations.recover;
    const recoveryDurationMs = recoveryAnimation
      ? recoveryAnimation.frames.length * recoveryAnimation.frameDurationMs
      : 220;
    const hitAt = this.enemyHitAt.get(enemy.id) ?? -1;
    const hitElapsed = hitAt >= 0 ? now - hitAt : -1;
    const hitVisible = enemyHitIsVisible(hitElapsed) && availableAnimations.has("hurt");
    const animationName = hitVisible
      ? enemyHitVisualAnimation(availableAnimations)
      : enemyVisualAnimation(enemy.state, timeToImpact, availableAnimations, recoveryElapsed, enemy.type === "boss", recoveryDurationMs);
    const animation = animationFor(view.definition, animationName);
    const animationElapsed = hitVisible
      ? hitElapsed
      : enemyAnimationElapsed(enemy.state, now, enemy.startedAt, enemy.nextAttackAt, recoveryAt);
    const source = animation.frames[frameIndexAt(animation, animationElapsed)];
    this.game.canvas.dataset.spacebladeEnemyFrame = source;
    this.game.canvas.dataset.spacebladeEnemyAnimation = animationName;
    if (hitVisible) this.game.canvas.dataset.spacebladeEnemyHitFrame = source;
    if (animationName === "recover") this.game.canvas.dataset.spacebladeEnemyRecoveryFrame = source;
    if (animationName === "specialAttack") this.game.canvas.dataset.spacebladeBossSpecialFrame = source;
    const motion = enemyVisualMotion(enemy.state, now, enemy.x, PLAYER_X, enemy.nextAttackAt);
    const glitchTeleport = enemy.type === "glitch" && (this.run?.wave ?? 1) >= 8
      ? glitchTeleportPresentation(now, enemy.teleportAt)
      : { active: false, alpha: 1, x: 0 };
    if (glitchTeleport.active) this.game.canvas.dataset.spacebladeGlitchTeleportFlicker = "true";
    else delete this.game.canvas.dataset.spacebladeGlitchTeleportFlicker;
    if (glitchTeleportCueDue(glitchTeleport.active, enemy.teleportAt, this.glitchTeleportAlertedAt.get(enemy.id) ?? null)) {
      this.glitchTeleportAlertedAt.set(enemy.id, enemy.teleportAt);
      this.playSound("glitchTeleport");
    }
    const visualX = clampSpriteCenterX(screenX + motion.x + glitchTeleport.x, definition.width, definition.scale, SPACEBLADE_WIDTH);
    const visualY = GROUND_Y + motion.y;
    if (tookDamage) {
      let label = this.enemyHitLabels.get(enemy.id);
      if (!label) {
        label = this.add.text(visualX, visualY, "", {
          color: "#ffda6a",
          fontFamily: "monospace",
          fontSize: "22px",
          fontStyle: "bold",
          stroke: "#071322",
          strokeThickness: 4,
        }).setOrigin(0.5).setDepth(6);
        this.enemyHitLabels.set(enemy.id, label);
      }
      label.setText("-1").setVisible(true).setAlpha(1).setScale(1);
    }
    view.sprite.setVisible(true).setTexture(frameKey(source)).setPosition(visualX, visualY).setAngle(motion.angle).setAlpha(glitchTeleport.alpha).setFlipX(enemy.side === "right");
    if (glitchTeleport.active && !this.settings.reducedEffectsEnabled) {
      this.drawGlitchTeleportFx(visualX, GROUND_Y - definition.height * definition.scale * 0.55, definition.width * definition.scale, now, enemy.teleportAt - now);
    }
    const marker = enemy.type === "boss"
      ? enemy.state === "attacking" && enemy.nextAttackAt - now <= 260 ? "BOSS !" : "BOSS"
      : enemy.nextAttackAt - now <= 180 ? "!" : "";
    view.marker.setVisible(enemy.type === "boss" || enemy.state === "attacking").setPosition(visualX, visualY - view.definition.height * view.definition.scale - 18).setText(marker);
    const barWidth = enemy.type === "boss" ? 180 : 72;
    const barY = visualY - view.definition.height * view.definition.scale - 8;
    view.healthBar.clear().setPosition(visualX - barWidth / 2, barY).setVisible(true);
    view.healthBar.fillStyle(0x180d18, 0.95).fillRect(0, 0, barWidth, 7);
    view.healthBar.fillStyle(enemy.type === "boss" ? 0xff3f62 : 0x57eaff, 1).fillRect(0, 0, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 7);
    if (hitVisible) this.drawEnemyHitFx(visualX, visualY - definition.height * definition.scale * 0.55, hitElapsed, definition.scale);
    this.syncEnemyHitLabel(enemy.id, visualX, visualY - definition.height * definition.scale - 24, now);
    if (enemy.type === "boss") this.drawBossTelegraphFx(visualX, now, enemy, definition);
    const alertAt = enemy.nextAttackAt;
    if (enemy.state === "attacking" && alertAt - now <= 180 && this.alertedEnemies.get(enemy.id) !== alertAt) {
      this.alertedEnemies.set(enemy.id, alertAt);
      this.playSound("enemyAlert");
    }
  }

  private drawBossTelegraphFx(screenX: number, now: number, enemy: RebuildEnemy, definition: RebuildSprite): void {
    if (!this.enemyFx) return;
    const centerY = GROUND_Y - definition.height * definition.scale * 0.55;
    const pulse = 0.45 + Math.sin(now / 130) * 0.2;
    this.enemyFx.lineStyle(4, 0xff3f62, pulse);
    this.enemyFx.strokeCircle(screenX, centerY, 58 + Math.sin(now / 100) * 7);
    this.enemyFx.lineStyle(2, 0xffda6a, pulse * 0.8);
    this.enemyFx.strokeCircle(screenX, centerY, 72 + Math.sin(now / 150) * 8);
    if (enemy.state !== "attacking" || enemy.nextAttackAt - now > 260) return;
    const intensity = Math.max(0.25, Math.min(1, 1 - (enemy.nextAttackAt - now) / 260));
    this.enemyFx.lineStyle(8, 0xff3f62, intensity);
    this.enemyFx.lineBetween(screenX - 170, GROUND_Y - 10, screenX + 26, GROUND_Y - 10);
    this.enemyFx.lineStyle(3, 0xffda6a, intensity);
    for (let index = 0; index < 5; index += 1) {
      const x = screenX - 150 + index * 38;
      this.enemyFx.lineBetween(x, GROUND_Y - 18, x + 10, GROUND_Y - 2);
    }
  }

  private drawGlitchTeleportFx(x: number, y: number, width: number, now: number, remainingMs: number): void {
    if (!this.enemyFx) return;
    const pulse = 0.35 + Math.sin(now / 32) * 0.15;
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / 260));
    const halfWidth = width * (0.28 + progress * 0.18);
    this.enemyFx.lineStyle(3, 0xff3f9a, pulse);
    for (let index = 0; index < 4; index += 1) {
      const offsetY = (index - 1.5) * 22 + Math.sin(now / 45 + index) * 5;
      const fragment = halfWidth * (0.55 + (index % 2) * 0.3);
      this.enemyFx.lineBetween(x - fragment, y + offsetY, x + fragment, y + offsetY);
    }
    this.enemyFx.lineStyle(2, 0x57eaff, pulse * 0.9);
    this.enemyFx.lineBetween(x - halfWidth, y - 42, x + halfWidth * 0.6, y - 42);
    this.enemyFx.lineBetween(x - halfWidth * 0.65, y + 38, x + halfWidth, y + 38);
  }

  private drawEnemyDeathFx(x: number, y: number, elapsed: number, scale: number): void {
    if (!this.deathFx || elapsed > 360) return;
    const progress = Math.min(1, elapsed / 360);
    const alpha = 1 - progress;
    const radius = 18 * scale + progress * 30 * scale;
    this.deathFx.lineStyle(4, 0xff3f62, alpha);
    this.deathFx.strokeCircle(x, y, radius);
    this.deathFx.lineStyle(2, 0x57eaff, alpha * 0.9);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      const inner = radius * 0.55;
      const outer = radius * (0.9 + (index % 2) * 0.2);
      this.deathFx.lineBetween(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer,
      );
    }
    this.deathFx.fillStyle(0xf4fbff, alpha * 0.85);
    this.deathFx.fillCircle(x, y, Math.max(2, 8 * scale * (1 - progress)));
  }

  private drawEnemyHitFx(x: number, y: number, elapsed: number, scale: number): void {
    if (!this.enemyFx) return;
    const progress = Math.min(1, Math.max(0, elapsed / 160));
    const alpha = 1 - progress;
    const radius = 18 * scale + progress * 18 * scale;
    this.enemyFx.lineStyle(3, 0xffda6a, alpha);
    this.enemyFx.strokeCircle(x, y, radius);
    this.enemyFx.fillStyle(0xf4fbff, alpha * 0.8);
    this.enemyFx.fillCircle(x, y, Math.max(2, 7 * scale * (1 - progress)));
  }

  private syncEnemyHitLabel(id: string, x: number, y: number, now: number): void {
    const label = this.enemyHitLabels.get(id);
    const hitAt = this.enemyHitLabelAt.get(id);
    if (!label || hitAt === undefined) return;
    const elapsed = now - hitAt;
    if (elapsed > 420) {
      label.destroy();
      this.enemyHitLabels.delete(id);
      this.enemyHitLabelAt.delete(id);
      return;
    }
    const progress = Math.max(0, elapsed / 420);
    label
      .setVisible(true)
      .setPosition(x, y - progress * 30)
      .setAlpha(1 - progress)
      .setScale(1 + progress * 0.18);
  }

  private showWaveBanner(message: string, now: number, duration: number): void {
    if (!this.waveBanner) return;
    this.waveBanner.setText(message).setAlpha(1).setVisible(true);
    this.waveBannerUntil = now + duration;
  }

  private showCombatCallout(message: string, now: number, duration: number): void {
    this.combatCallout = message;
    this.combatCalloutUntil = now + duration;
    this.game.canvas.dataset.spacebladeCombatCallout = message;
  }

  private syncWaveBanner(now: number): void {
    if (!this.waveBanner) return;
    if (now >= this.waveBannerUntil) {
      this.waveBanner.setVisible(false);
      return;
    }
    const remaining = this.waveBannerUntil - now;
    this.waveBanner.setVisible(true).setAlpha(Math.min(1, remaining / 300));
  }

  private drawWaveProgress(run: RebuildRun): void {
    if (!this.waveProgress) return;
    const target = rebuildWaveTarget(run.wave);
    const width = 380;
    const x = (SPACEBLADE_WIDTH - width) / 2;
    this.waveProgress.clear();
    this.waveProgress.fillStyle(0x10243b, 1).fillRect(x, 106, width, 8);
    this.waveProgress.fillStyle(0x2cb7d3, 1).fillRect(x, 106, width * Math.min(1, run.defeatedThisWave / target), 8);
    this.waveProgress.lineStyle(1, 0x57eaff, 0.55).strokeRect(x, 106, width, 8);
    this.waveProgressLabel?.setText(`THREATS  ${run.defeatedThisWave}/${target}`);
  }

  private drawParryTiming(run: RebuildRun, now: number): void {
    if (!this.parryTiming || !this.parryTimingLabel) return;
    const target = run.enemies
      .filter((enemy) => enemy.state === "attacking")
      .reduce<RebuildEnemy | null>((closest, enemy) => {
        if (!closest) return enemy;
        return enemy.nextAttackAt < closest.nextAttackAt ? enemy : closest;
      }, null);
    if (!target) {
      this.parryTiming.clear().setVisible(false);
      this.parryTimingLabel.setVisible(false);
      this.game.canvas.dataset.spacebladeParryTimingVisible = "false";
      delete this.game.canvas.dataset.spacebladeParryTiming;
      return;
    }
    const timeToImpact = target.nextAttackAt - now;
    if (timeToImpact > 420 || timeToImpact < -120) {
      this.parryTiming.clear().setVisible(false);
      this.parryTimingLabel.setVisible(false);
      this.game.canvas.dataset.spacebladeParryTimingVisible = "false";
      delete this.game.canvas.dataset.spacebladeParryTiming;
      return;
    }
    const signal = parryTimingSignal(timeToImpact);
    const labels = { tooEarly: "TOO EARLY", perfect: "PERFECT", tooLate: "TOO LATE" } as const;
    const colors = { tooEarly: 0xff3f62, perfect: 0x39f6b0, tooLate: 0xff3f62 } as const;
    const width = 360;
    const height = 9;
    const x = (SPACEBLADE_WIDTH - width) / 2;
    const y = 646;
    const progress = Math.max(0, Math.min(1, (420 - timeToImpact) / 540));
    this.parryTiming.clear();
    this.parryTiming.fillStyle(0x10243b, 0.96).fillRect(x, y, width, height);
    this.parryTiming.fillStyle(colors[signal], 1).fillRect(x + width * progress - 4, y - 3, 8, height + 6);
    this.parryTiming.lineStyle(1, colors[signal], 0.8).strokeRect(x, y, width, height);
    this.parryTiming.setVisible(true);
    this.parryTimingLabel
      .setText(`${labels.tooEarly}          ${labels.perfect}          ${labels.tooLate}`)
      .setColor(signal === "perfect" ? "#39f6b0" : "#ffda6a")
      .setVisible(true);
    this.game.canvas.dataset.spacebladeParryTimingVisible = "true";
    this.game.canvas.dataset.spacebladeParryTiming = signal;
  }
}
