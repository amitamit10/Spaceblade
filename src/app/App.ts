import { createAppRoot } from "./createAppRoot";
import type { AppRoot } from "./createAppRoot";
import type { GameScreen, SettingsState, RunStats } from "./types";
import { createScreenState } from "../ui/screenState";
import { createSpaceMenuController } from "../ui/navigation/spaceMenuController";
import type { SpaceMenuController } from "../ui/navigation/spaceMenuController";
import { renderShell } from "../ui/renderShell";
import type { ScreenModel, LeaderboardView } from "../ui/renderShell";
import { PAUSE_ACTIONS } from "../ui/screens/pauseScreen";
import { SETTINGS_ACTIONS } from "../ui/screens/settingsScreen";
import { GAME_OVER_ACTIONS } from "../ui/screens/gameOverScreen";

const PAUSE_HOLD_MS = 900;
const CONFIRM_HOLD_MS = 450;

/** Actions per screen, in focus order. Empty for the pure-gameplay screen. */
const SCREEN_ACTIONS: Record<GameScreen, readonly string[]> = {
  title: ["start"],
  tutorial: ["continue"],
  playing: [],
  paused: PAUSE_ACTIONS,
  settings: SETTINGS_ACTIONS,
  gameOver: GAME_OVER_ACTIONS,
  highscores: ["return"],
  mobileWarning: ["continue"],
};

export type AppHandle = {
  root: AppRoot;
  getScreen(): GameScreen;
  getFocusedAction(): string | null;
  tapSpace(): void;
  holdConfirmSpace(): void;
  holdPauseSpace(): void;
  destroy(): void;
};

export function mountApp(host: HTMLElement, initialScreen: GameScreen = "title"): AppHandle {
  const root = createAppRoot(host);
  const screenState = createScreenState<GameScreen>(initialScreen);

  let tutorialSeen = false;
  let controller: SpaceMenuController | null = null;

  const settings: SettingsState = {
    volume: 0.8,
    screenShakeEnabled: true,
    reducedEffectsEnabled: false,
  };

  const sampleRunStats: RunStats = {
    score: 3450,
    wave: 12,
    hearts: 0,
    enemiesDefeated: 128,
    parries: 14,
    perfectParryStreak: 3,
    bestCombo: 22,
    grade: "A",
  };

  const leaderboard: LeaderboardView = {
    state: "disabled",
    tab: "global",
    entries: [
      { playerName: "NeoSlasher", score: 9870, wave: 15, enemiesDefeated: 240, parries: 60, grade: "SSS", createdAt: 0, clientRunId: "sample-1" },
      { playerName: "VoidReaper", score: 7650, wave: 14, enemiesDefeated: 210, parries: 44, grade: "SSS", createdAt: 0, clientRunId: "sample-2" },
      { playerName: "Starlight", score: 6120, wave: 13, enemiesDefeated: 180, parries: 38, grade: "SS", createdAt: 0, clientRunId: "sample-3" },
    ],
    you: { playerName: "You", score: 3450, wave: 12, enemiesDefeated: 128, parries: 14, grade: "A", createdAt: 0, clientRunId: "sample-you" },
  };

  function buildModel(): ScreenModel {
    return {
      screen: screenState.get(),
      focusedAction: controller?.getFocusedAction() ?? null,
      settings,
      bestScore: 0,
      bestWave: 0,
      hud: { hearts: 3, maxHearts: 3, hpPct: 0.7, wave: 12, score: 3450, actionState: "Idle" },
      runStats: screenState.get() === "gameOver" ? sampleRunStats : null,
      leaderboard,
      submitOutcome: null,
    };
  }

  function render(): void {
    renderShell(root.overlayRoot, buildModel());
  }

  function confirmAction(action: string): void {
    const screen = screenState.get();
    switch (screen) {
      case "title":
        goToScreen(tutorialSeen ? "playing" : "tutorial");
        break;
      case "tutorial":
        tutorialSeen = true;
        goToScreen("playing");
        break;
      case "paused":
        if (action === "resume" || action === "restartRun") goToScreen("playing");
        else if (action === "settings") goToScreen("settings");
        else if (action === "howToPlay") goToScreen("tutorial");
        else if (action === "quitToTitle") goToScreen("title");
        break;
      case "settings":
        if (action === "saveAndClose") goToScreen("paused");
        else if (action === "screenShake") { settings.screenShakeEnabled = !settings.screenShakeEnabled; render(); }
        else if (action === "reducedEffects") { settings.reducedEffectsEnabled = !settings.reducedEffectsEnabled; render(); }
        else if (action === "volume") { settings.volume = settings.volume >= 1 ? 0 : Math.round((settings.volume + 0.1) * 10) / 10; render(); }
        break;
      case "gameOver":
        if (action === "restart") goToScreen("playing");
        else if (action === "highscores") goToScreen("highscores");
        else if (action === "quitToTitle") goToScreen("title");
        break;
      case "highscores":
        goToScreen("title");
        break;
      case "mobileWarning":
        goToScreen("title");
        break;
      default:
        break;
    }
  }

  function goToScreen(next: GameScreen): void {
    screenState.set(next);
    const actions = SCREEN_ACTIONS[next];
    controller = actions.length > 0 ? createSpaceMenuController(actions, confirmAction) : null;
    render();
  }

  // --- Space input entry points (called by the keyboard listener and by tests) ---

  function tapSpace(): void {
    const screen = screenState.get();
    if (screen === "playing" || !controller) return;
    if (SCREEN_ACTIONS[screen].length > 1) {
      controller.onTap();
      render();
    } else if (screen !== "tutorial") {
      controller.onHoldConfirm();
    }
  }

  function holdConfirmSpace(): void {
    if (screenState.get() === "playing" || !controller) return;
    controller.onHoldConfirm();
  }

  function holdPauseSpace(): void {
    if (screenState.get() === "playing") goToScreen("paused");
  }

  // --- Real keyboard wiring: Space only, measures hold duration ---

  let heldSince: number | null = null;
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    if (heldSince !== null) return; // ignore auto-repeat
    heldSince = performance.now();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== "Space" || heldSince === null) return;
    e.preventDefault();
    const held = performance.now() - heldSince;
    heldSince = null;
    if (screenState.get() === "playing") {
      if (held >= PAUSE_HOLD_MS) holdPauseSpace();
      return;
    }
    if (held >= CONFIRM_HOLD_MS) holdConfirmSpace();
    else tapSpace();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // Initialize controller + first render for the starting screen.
  goToScreen(initialScreen);

  return {
    root,
    getScreen: () => screenState.get(),
    getFocusedAction: () => controller?.getFocusedAction() ?? null,
    tapSpace,
    holdConfirmSpace,
    holdPauseSpace,
    destroy: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
