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
import { rebuildPlayerVisualOffset } from "../rebuild/renderScene";
import { SPACEBLADE_HEIGHT, SPACEBLADE_WIDTH } from "./spacebladeConstants";
import { loadSpacebladeBest, loadSpacebladeSettings, saveSpacebladeBest, saveSpacebladeSettings, spacebladeMotionDefaults, type SpacebladeSettings } from "./spacebladePersistence";
import { createSoundBus, type SoundBus, type SoundCue } from "../game/audio/soundBus";
import { loadRebuildHighscores, submitRebuildRun, type RebuildHighscores } from "../rebuild/rebuildLeaderboard";
import { localFriendsResult } from "../state/leaderboard/leaderboardService";
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

const GROUND_Y = 552;
const PLAYER_X = SPACEBLADE_WIDTH / 2;
const VIEW_PLAYER_X = SPACEBLADE_WIDTH / 2;
const PLAYER_WALK_CROP_Y = 24;
const PLAYER_WALK_CROP_HEIGHT = 72;

const frameKey = (source: string): string => `spaceblade:${source}`;

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

type EngineScreen = "title" | "tutorial" | "playing" | "paused" | "settings" | "gameOver" | "highscores" | "mobileWarning";
type HighscoresTab = "global" | "friends";

export class SpacebladePlayScene extends Phaser.Scene {
  private run: RebuildRun | null = null;
  private playerView: Phaser.GameObjects.Image | null = null;
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly enemyViewPools = new Map<string, EnemyView[]>();
  private readonly projectileViews = new Map<string, Phaser.GameObjects.Graphics>();
  private readonly projectileViewPool: Phaser.GameObjects.Graphics[] = [];
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
  private runnerMotion: Phaser.GameObjects.Graphics | null = null;
  private waveBanner: Phaser.GameObjects.Text | null = null;
  private waveBannerUntil = 0;
  private lastSeenWave = 1;
  private bossWasPresent = false;
  private lastFxActionAt: number | null = null;
  private screen: EngineScreen = "title";
  private screenTitle: Phaser.GameObjects.Text | null = null;
  private screenBody: Phaser.GameObjects.Text | null = null;
  private screenHint: Phaser.GameObjects.Text | null = null;
  private screenBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private menuFocus = 0;
  private pauseTriggered = false;
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
  private playerHurtAt: number | null = null;
  private terminalAt: number | null = null;
  private combatCallout = "";
  private combatCalloutUntil = 0;
  private playerName = "Pilot";
  private highscores: RebuildHighscores | null = null;
  private highscoresTab: HighscoresTab = "global";
  private leaderboardLoading = false;
  private leaderboardSubmitted = false;
  private submitOutcome: "submitted" | "skipped" | "offline" | "disabled" | null = null;

  constructor() {
    super("spaceblade-play");
  }

  preload(): void {
    for (const source of allFrameSources()) this.load.image(frameKey(source), source);
  }

  create(): void {
    this.drawArena();
    this.soundBus = createSoundBus(() => this.settings.volume);
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
      color: "#f4fbff",
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setDepth(5);
    this.hudWave = this.add.text(SPACEBLADE_WIDTH / 2, 16, "", {
      color: "#f4fbff",
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(5);
    this.hudScore = this.add.text(SPACEBLADE_WIDTH - 20, 16, "", {
      color: "#f4fbff",
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(5);
    this.playerHpBar = this.add.graphics().setDepth(5);
    this.status = this.add.text(SPACEBLADE_WIDTH / 2, 70, "", {
      color: "#57eaff",
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
      color: "#9ab6ca",
      fontFamily: "monospace",
      fontSize: "13px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5);
    this.parryTiming = this.add.graphics().setDepth(5).setVisible(false);
    this.parryTimingLabel = this.add.text(SPACEBLADE_WIDTH / 2, 676, "", {
      color: "#9ab6ca",
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5).setVisible(false);
    this.skylineMotion = this.add.graphics().setDepth(0.5);
    this.waveBanner = this.add.text(SPACEBLADE_WIDTH / 2, 182, "", {
      color: "#ffda6a",
      fontFamily: "monospace",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#071322",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    this.screenBackdrop = this.add.rectangle(SPACEBLADE_WIDTH / 2, SPACEBLADE_HEIGHT / 2, SPACEBLADE_WIDTH, SPACEBLADE_HEIGHT, 0x050b18, 0.96)
      .setDepth(10);
    this.screenTitle = this.add.text(SPACEBLADE_WIDTH / 2, 190, "SPACEBLADE", {
      color: "#f4fbff",
      fontFamily: "monospace",
      fontSize: "58px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);
    this.screenBody = this.add.text(SPACEBLADE_WIDTH / 2, 350, "ONE KEY. ENDLESS RUN.\n\nAuto-run through Neon-Sector 04.\nCut down threats before they reach you.", {
      color: "#9ab6ca",
      fontFamily: "monospace",
      fontSize: "24px",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5).setDepth(11);
    this.screenHint = this.add.text(SPACEBLADE_WIDTH / 2, 590, "HOLD SPACE TO START", {
      color: "#57eaff",
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
  }

  update(): void {
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
      this.showWaveBanner(this.run.wave >= 15 ? "BOSS WAVE  ·  15" : `WAVE ${this.run.wave}`, now, 1800);
    }
    const bossPresent = this.run.enemies.some((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    if (bossPresent && !this.bossWasPresent) this.showWaveBanner("BOSS SIGNAL", now, 2200);
    if (bossPresent && !this.bossWasPresent) this.playSound("boss");
    this.bossWasPresent = bossPresent;
    if (this.spaceDownAt !== null && now - this.spaceDownAt >= 900 && this.run.player.animation === "charging") {
      this.pauseTriggered = true;
      this.setScreen("paused");
      return;
    }
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
      this.submitRunIfEligible();
      if (this.run.status === "gameOver") {
        this.terminalAt ??= now;
        this.syncViews(now);
        if (now - this.terminalAt < 360) return;
      }
      this.setScreen("gameOver");
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

  private handlePointerDown(): void {
    if (this.screen === "playing") this.handleSpaceDown();
  }

  private readonly handleVisibilityChange = (): void => {
    if (shouldPauseForVisibility(document.hidden, this.screen)) {
      // Browsers may drop the matching keyup/pointerup while a tab is hidden.
      // Clear the transient hold before pausing so the next input can recover.
      this.spaceDownAt = null;
      this.pauseTriggered = false;
      this.setScreen("paused");
    }
  };

  private readonly handleWindowBlur = (): void => {
    if (this.screen !== "playing") return;
    this.spaceDownAt = null;
    this.pauseTriggered = false;
  };

  private handleSpaceUp(): void {
    if (this.spaceDownAt === null) return;
    const now = this.time.now;
    const heldMs = now - this.spaceDownAt;
    this.spaceDownAt = null;
    if (this.screen !== "playing") {
      if (this.pauseTriggered) {
        this.pauseTriggered = false;
        return;
      }
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
    if (this.screen === "playing") {
      this.handleSpaceUp();
      return;
    }
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
      this.setScreen("title");
      return;
    }
    if (this.menuActions.length === 0) return;
    const lineHeight = 36;
    const bodyHeight = (this.menuActions.length - 1) * lineHeight;
    const firstLineY = 350 - bodyHeight / 2;
    const selected = Math.floor((pointer.y - firstLineY + lineHeight / 2) / lineHeight);
    this.menuFocus = Math.max(0, Math.min(this.menuActions.length - 1, selected));
    this.confirmMenuAction();
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
    this.lastDisplayedProjectileCount = 0;
    this.lastDisplayedShieldedCount = 0;
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

  private resetEnemyPresentation(): void {
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
    this.playerHpBar?.setVisible(inGameplay);
    this.status?.setVisible(inGameplay);
    this.combatFx?.setVisible(inGameplay);
    this.deathFx?.setVisible(inGameplay);
    this.enemyFx?.setVisible(inGameplay);
    for (const view of this.projectileViews.values()) view.setVisible(inGameplay);
    this.runnerMotion?.setVisible(inGameplay);
    this.waveProgress?.setVisible(inGameplay);
    this.waveProgressLabel?.setVisible(inGameplay);
    this.parryTiming?.setVisible(inGameplay);
    this.parryTimingLabel?.setVisible(inGameplay);
    this.skylineMotion?.setVisible(inGameplay);
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
    this.screenTitle?.setVisible(!inGameplay);
    this.screenBody?.setVisible(!inGameplay);
    this.screenHint?.setVisible(!inGameplay);
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
      this.screenHint.setText("HOLD SPACE TO START");
    } else if (this.screen === "mobileWarning") {
      this.screenTitle.setText("KEYBOARD RECOMMENDED");
      this.screenBody.setText("ONE BUTTON. SPACE OR TOUCH.\n\nROTATE TO LANDSCAPE FOR GAMEPLAY.");
      this.screenHint.setText("TAP TO CONTINUE");
    } else if (this.screen === "tutorial") {
      this.screenTitle.setText("HOW TO PLAY");
      this.screenBody.setText("TAP  -  SWORD SLASH\nHOLD + RELEASE  -  ENERGY SHOT\nDOUBLE TAP  -  DODGE\nPERFECT TIMING  -  PARRY\n\nThreats approach from ahead. Strike before contact.");
      this.screenHint.setText(this.tutorialReturnScreen === "paused" ? "HOLD SPACE TO RETURN" : "HOLD SPACE TO DEPLOY");
    } else if (this.screen === "paused") {
      this.screenTitle.setText("PAUSED");
      this.screenBody.setText(this.menuActions.map((action, index) => `${index === this.menuFocus ? ">" : " "} ${action === "resume" ? "RESUME" : action === "settings" ? "SETTINGS" : action === "tutorial" ? "HOW TO PLAY" : action === "restart" ? "RESTART RUN" : "QUIT TO TITLE"}`).join("\n"));
      this.screenHint.setText("TAP TO MOVE  ·  HOLD TO SELECT");
    } else if (this.screen === "settings") {
      this.screenTitle.setText("SETTINGS");
      this.screenBody.setText(this.menuActions.map((action, index) => {
        const label = action === "screenShake"
          ? `SCREEN SHAKE  ${this.settings.screenShakeEnabled ? "ON" : "OFF"}`
          : action === "volume"
            ? `VOLUME  ${Math.round(this.settings.volume * 100)}%`
          : action === "reducedEffects"
            ? `REDUCED EFFECTS  ${this.settings.reducedEffectsEnabled ? "ON" : "OFF"}`
          : action === "callsign"
            ? `CALLSIGN  ${this.playerName.toUpperCase()}`
            : "BACK";
        return `${index === this.menuFocus ? ">" : " "} ${label}`;
      }).join("\n"));
      this.screenHint.setText("TAP TO MOVE  ·  HOLD TO CHANGE");
    } else if (this.screen === "gameOver") {
      const title = run?.status === "victory" ? "SECTOR CLEARED" : "GAME OVER";
      this.screenTitle.setText(title);
      this.game.canvas.dataset.spacebladeScreenTitle = title;
      const submitLabel = this.submitOutcome === "submitted" ? "SCORE SUBMITTED" : this.submitOutcome === "offline" ? "SCORE SAVED LOCALLY  ·  OFFLINE" : this.submitOutcome === "disabled" ? "ONLINE SCORES DISABLED" : this.submitOutcome === "skipped" ? "SCORE BELOW ONLINE MINIMUM" : "";
      const grade = gradeForScore(run?.score ?? 0) ?? "UNRANKED";
      this.screenBody.setText(`SCORE  ${run?.score ?? 0}\nWAVE  ${run?.wave ?? 1}\nENEMIES DEFEATED  ${run?.defeated ?? 0}\nBEST COMBO  ${run?.bestCombo ?? 0}\nGRADE  ${grade}${submitLabel ? `\n${submitLabel}` : ""}\n\n${this.menuActions.map((action, index) => `${index === this.menuFocus ? ">" : " "} ${action === "restart" ? "RESTART" : action === "highscores" ? "HIGHSCORES" : "QUIT TO TITLE"}`).join("\n")}`);
      this.screenHint.setText("TAP TO MOVE  ·  HOLD TO SELECT");
    } else {
      this.screenTitle.setText("HIGHSCORES");
      this.game.canvas.dataset.spacebladeHighscoresTab = this.highscoresTab;
      this.game.canvas.dataset.spacebladeHighscoresState = this.leaderboardLoading
        ? "loading"
        : this.highscores?.fetchState ?? "unknown";
      this.game.canvas.dataset.spacebladeHighscoresCount = String(this.highscores?.entries.length ?? 0);
      const tabLine = this.menuActions.slice(0, 2).map((action, index) => `${index === this.menuFocus ? ">" : " "} ${action === this.highscoresTab ? action.toUpperCase() : action.toLowerCase()}`).join("     ");
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
      const actionLine = this.menuActions.map((action, index) => `${index === this.menuFocus ? ">" : " "} ${action === "global" ? "GLOBAL" : action === "friends" ? "FRIENDS" : "RETURN TO TITLE"}`).join("\n");
      this.screenBody.setText(`${tabLine}\n\n${content}\n\n${actionLine}`);
      this.screenHint.setText("TAP TO MOVE  ·  HOLD TO SELECT");
    }
  }

  private drawArena(): void {
    const graphics = this.add.graphics().setDepth(0);
    // Overscan keeps camera shake from exposing transparent canvas edges.
    const overscan = 96;
    graphics.fillStyle(0x071322, 1).fillRect(-overscan, -overscan, SPACEBLADE_WIDTH + overscan * 2, SPACEBLADE_HEIGHT + overscan * 2);
    graphics.fillStyle(0x0a1a30, 1);
    for (const [x, y, width, height] of [
      [0, 328, 72, 224], [80, 282, 92, 270], [180, 244, 120, 308],
      [310, 294, 92, 258], [420, 212, 140, 340], [570, 276, 96, 276],
      [690, 184, 128, 368], [830, 232, 118, 320], [960, 166, 144, 386],
      [1115, 220, 122, 332], [1245, 270, 60, 282],
    ]) graphics.fillRect(x, y, width, height);
    graphics.fillStyle(0x06101e, 1).fillRect(0, GROUND_Y, SPACEBLADE_WIDTH, SPACEBLADE_HEIGHT - GROUND_Y);
    graphics.fillStyle(0x2cb7d3, 1).fillRect(0, GROUND_Y, SPACEBLADE_WIDTH, 4);
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
    this.game.canvas.dataset.spacebladeGrade = gradeForScore(run.score) ?? "UNRANKED";
    this.game.canvas.dataset.spacebladeReducedEffects = String(this.settings.reducedEffectsEnabled);
    this.game.canvas.dataset.spacebladeRunStatus = run.status;
    this.game.canvas.dataset.spacebladePlayerX = String(VIEW_PLAYER_X);
    this.syncWaveBanner(now);
    const facing = facingFor(run);
    const playerVisualState = run.status === "gameOver"
      ? "dead"
      : run.player.hurtUntil > now
        ? "hurt"
        : run.player.animation;
    const playerAnimation = playerVisualState === "idle" && PLAYER_ANIMATION_KEYS.has("walk")
      ? "walk"
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
    this.playerView
      .setTexture(frameKey(playerFrame))
      .setPosition(VIEW_PLAYER_X + playerOffset.x, GROUND_Y + playerOffset.y)
      .setAlpha(1)
      .setFlipX(facing === "left");
    if (playerAnimation === "walk") {
      this.playerView.setCrop(0, PLAYER_WALK_CROP_Y, REBUILD_PLAYER.width, PLAYER_WALK_CROP_HEIGHT);
    } else {
      this.playerView.setCrop();
    }
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
    this.hudWave.setText(`WAVE ${run.wave}`);
    this.hudScore.setText(`SCORE ${run.score}${run.combo > 0 ? `  ·  COMBO x${run.combo}` : ""}`);
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x10243b, 0.96).fillRect(20, 48, 180, 8);
    this.playerHpBar.fillStyle(run.hearts > 0 ? 0xff3f62 : 0x5a2133, 1).fillRect(20, 48, 180 * Math.max(0, Math.min(1, run.hearts / 3)), 8);
    this.playerHpBar.lineStyle(1, 0xffda6a, 0.7).strokeRect(20, 48, 180, 8);
    this.drawWaveProgress(run);
    this.drawParryTiming(run, now);
    this.drawSkylineMotion(now);
    this.drawRunnerMotion(now, facing);
    const bossActive = run.enemies.some((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    const boss = run.enemies.find((enemy) => enemy.type === "boss" && enemy.state !== "dead");
    this.game.canvas.dataset.spacebladeBossActive = String(Boolean(boss));
    if (boss) this.game.canvas.dataset.spacebladeBossHp = String(boss.hp);
    const baseStatus = bossActive ? "BOSS SIGNAL  ·  READ THE TELEGRAPH  ·  SPACE TO SURVIVE" : run.status === "playing" ? "TAP: SWORD  ·  HOLD: ENERGY SHOT  ·  DOUBLE TAP: DODGE" : run.status === "victory" ? "SECTOR CLEARED  ·  PRESS SPACE TO RESTART" : "RUN OVER  ·  PRESS SPACE TO RESTART";
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

  private drawSkylineMotion(now: number): void {
    if (!this.skylineMotion) return;
    const offset = (now * 0.06) % 320;
    this.skylineMotion.clear();
    for (let index = -1; index < 7; index += 1) {
      const x = index * 320 - offset;
      const height = 92 + ((index + 3) % 3) * 38;
      this.skylineMotion.fillStyle(0x122744, 0.18).fillRect(x, GROUND_Y - height, 210, height);
      this.skylineMotion.fillStyle(0x1a3152, 0.12).fillRect(x + 78, GROUND_Y - height - 32, 108, 32);
    }
    this.game.canvas.dataset.spacebladeBackgroundOffset = String(Math.round(offset));
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
      this.combatFx.fillStyle(0xf4fbff, fade);
      this.combatFx.fillCircle(launchX, launchY, 11);
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
        view = this.projectileViewPool.pop() ?? this.add.graphics().setDepth(3);
        this.projectileViews.set(projectile.id, view);
      }
      const screenX = VIEW_PLAYER_X + (projectile.x - PLAYER_X);
      const age = now - projectile.startedAt;
      const pulse = 0.78 + Math.sin(age / 45) * 0.18;
      view.clear();
      view.lineStyle(5, 0x24d9ff, pulse);
      view.lineBetween(screenX - 58, GROUND_Y - 112, screenX - 8, GROUND_Y - 112);
      view.lineStyle(2, 0xe8feff, pulse);
      view.lineBetween(screenX - 38, GROUND_Y - 112, screenX + 10, GROUND_Y - 112);
      view.fillStyle(0xf4fbff, 1);
      view.fillCircle(screenX, GROUND_Y - 112, 9);
      view.fillStyle(0x24d9ff, 0.65);
      view.fillCircle(screenX - 12, GROUND_Y - 112, 15);
      view.setVisible(true);
    }
    for (const [id, view] of this.projectileViews) {
      if (activeIds.has(id)) continue;
      this.projectileViews.delete(id);
      view.clear().setVisible(false);
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
    if (shieldedCount < this.lastDisplayedShieldedCount && projectileImpact) {
      this.showCombatCallout("SHIELD BREAK", now, 720);
    } else if (projectileImpact) {
      this.showCombatCallout("ENERGY HIT", now, 620);
    }
    this.lastDisplayedProjectileCount = run.projectiles.length;
    this.lastDisplayedShieldedCount = shieldedCount;
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
      this.drawEnemyDeathFx(renderX, GROUND_Y - definition.height * definition.scale * 0.55, deathElapsed, definition.scale);
      if (!enemyDeathIsVisible(deathElapsed)) {
        this.retiredEnemyIds.add(enemy.id);
        view.sprite.setVisible(false).setAlpha(0);
        view.marker.setVisible(false);
        view.healthBar.setVisible(false);
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
