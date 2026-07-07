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
import { createLocalStore } from "../state/persistence/localStorageStore";
import type { LocalStore } from "../state/persistence/localStorageStore";
import { createLeaderboardClient } from "../lib/firebase/leaderboardClient";
import {
  createLeaderboardService,
  localFriendsResult,
} from "../state/leaderboard/leaderboardService";
import type { SubmitOutcome } from "../state/leaderboard/leaderboardService";
import { createMainGameScene } from "../game/scenes/mainGameScene";
import type { MainGameScene } from "../game/scenes/mainGameScene";
import { toRunStats } from "../game/run/runState";
import type { RunState } from "../game/run/runState";

const CONFIRM_HOLD_MS = 450;

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
  finishRun(state: RunState): void;
  destroy(): void;
};

/** Touch-first / coarse-pointer device with no keyboard → show the warning first. */
function isMobileLike(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const noFinePointer =
    typeof window.matchMedia === "function" && !window.matchMedia("(pointer: fine)").matches;
  return touch && coarse && noFinePointer;
}

export function mountApp(host: HTMLElement, forcedScreen?: GameScreen): AppHandle {
  const root = createAppRoot(host);
  const store: LocalStore = createLocalStore();
  const leaderboard = createLeaderboardService(createLeaderboardClient());

  const initialScreen: GameScreen = forcedScreen ?? (isMobileLike() ? "mobileWarning" : "title");
  const screenState = createScreenState<GameScreen>(initialScreen);

  const settings: SettingsState = store.getSettings();
  let controller: SpaceMenuController | null = null;
  let scene: MainGameScene | null = null;
  let lastRunStats: RunStats | null = null;
  let submitOutcome: SubmitOutcome | null = null;
  let leaderboardView: LeaderboardView = { state: "disabled", tab: "global", entries: [], you: null };
  let highscoresReturnTo: GameScreen = "title";
  let tutorialFromPause = false;

  // --- Model + render ---

  function buildModel(): ScreenModel {
    return {
      screen: screenState.get(),
      focusedAction: controller?.getFocusedAction() ?? null,
      settings,
      bestScore: store.getBestScore(),
      bestWave: store.getBestWave(),
      hud: { hearts: 3, maxHearts: 3, hpPct: 1, wave: 1, score: 0, actionState: "Idle" },
      runStats: lastRunStats,
      leaderboard: leaderboardView,
      submitOutcome,
    };
  }

  function render(): void {
    renderShell(root.overlayRoot, buildModel());
  }

  // --- Game scene lifecycle ---

  function startFreshRun(): void {
    scene?.stop();
    lastRunStats = null;
    submitOutcome = null;
    scene = createMainGameScene(root.canvas, settings, {
      onEnd: (state) => finishRun(state),
      onPauseRequest: () => requestPause(),
    });
    screenState.set("playing");
    controller = null;
    removeMenuInput();
    render();
    scene.start();
  }

  function requestPause(): void {
    if (screenState.get() !== "playing" || !scene) return;
    scene.pause();
    goToMenu("paused");
  }

  function resumeRun(): void {
    if (!scene) {
      startFreshRun();
      return;
    }
    screenState.set("playing");
    controller = null;
    removeMenuInput();
    render();
    scene.resume();
  }

  function finishRun(state: RunState): void {
    scene?.stop();
    lastRunStats = toRunStats(state);
    submitOutcome = null;
    store.updateBestScore(state.score);
    store.updateBestWave(state.wave);
    goToMenu("gameOver");

    void leaderboard.submitRun(lastRunStats, store.getPlayerName()).then((outcome) => {
      submitOutcome = outcome;
      if (screenState.get() === "gameOver") render();
    });
  }

  // --- Menu navigation ---

  function goToMenu(next: GameScreen): void {
    screenState.set(next);
    const actions = SCREEN_ACTIONS[next];
    controller = actions.length > 0 ? createSpaceMenuController(actions, confirmAction) : null;
    addMenuInput();
    render();

    if (next === "highscores") void loadHighscores();
  }

  async function loadHighscores(): Promise<void> {
    const result = await leaderboard.loadTopScores();
    const you = lastRunStats
      ? {
          playerName: store.getPlayerName(),
          score: lastRunStats.score,
          wave: lastRunStats.wave,
          enemiesDefeated: lastRunStats.enemiesDefeated,
          parries: lastRunStats.parries,
          grade: lastRunStats.grade,
          createdAt: 0,
          clientRunId: "you",
        }
      : localFriendsResult(store.getBestScore(), store.getBestWave(), store.getPlayerName())
          .entries[0] ?? null;
    leaderboardView = { state: result.fetchState, tab: "global", entries: result.entries, you };
    if (screenState.get() === "highscores") render();
  }

  function confirmAction(action: string): void {
    const screen = screenState.get();
    switch (screen) {
      case "title":
        startRunFromTitle();
        break;
      case "tutorial":
        if (tutorialFromPause) {
          tutorialFromPause = false;
          goToMenu("paused");
        } else {
          store.setTutorialSeen(true);
          startFreshRun();
        }
        break;
      case "paused":
        if (action === "resume") resumeRun();
        else if (action === "settings") goToMenu("settings");
        else if (action === "howToPlay") {
          tutorialFromPause = true;
          goToMenu("tutorial");
        } else if (action === "restartRun") startFreshRun();
        else if (action === "quitToTitle") {
          scene?.stop();
          scene = null;
          goToMenu("title");
        }
        break;
      case "settings":
        if (action === "saveAndClose") {
          store.setSettings(settings);
          goToMenu(scene ? "paused" : "title");
        } else if (action === "screenShake") {
          settings.screenShakeEnabled = !settings.screenShakeEnabled;
          render();
        } else if (action === "reducedEffects") {
          settings.reducedEffectsEnabled = !settings.reducedEffectsEnabled;
          render();
        } else if (action === "volume") {
          settings.volume = settings.volume >= 1 ? 0 : Math.round((settings.volume + 0.1) * 10) / 10;
          render();
        }
        break;
      case "gameOver":
        if (action === "restart") startFreshRun();
        else if (action === "highscores") {
          highscoresReturnTo = "gameOver";
          goToMenu("highscores");
        } else if (action === "quitToTitle") goToMenu("title");
        break;
      case "highscores":
        goToMenu(highscoresReturnTo);
        highscoresReturnTo = "title";
        break;
      case "mobileWarning":
        goToMenu("title");
        break;
      default:
        break;
    }
  }

  function startRunFromTitle(): void {
    if (store.getTutorialSeen()) startFreshRun();
    else {
      tutorialFromPause = false;
      goToMenu("tutorial");
    }
  }

  // --- Space input entry points (keyboard + tests) ---

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
    requestPause();
  }

  // --- Menu keyboard listener (Space only). The game scene owns input while playing. ---

  let heldSince: number | null = null;
  let menuInputAttached = false;
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    e.preventDefault();
    if (heldSince !== null) return;
    heldSince = performance.now();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== "Space" || heldSince === null) return;
    e.preventDefault();
    const held = performance.now() - heldSince;
    heldSince = null;
    if (held >= CONFIRM_HOLD_MS) holdConfirmSpace();
    else tapSpace();
  };
  function addMenuInput(): void {
    if (menuInputAttached) return;
    menuInputAttached = true;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }
  function removeMenuInput(): void {
    if (!menuInputAttached) return;
    menuInputAttached = false;
    heldSince = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  // Boot: build the initial screen's controller and render.
  goToMenu(initialScreen);

  return {
    root,
    getScreen: () => screenState.get(),
    getFocusedAction: () => controller?.getFocusedAction() ?? null,
    tapSpace,
    holdConfirmSpace,
    holdPauseSpace,
    finishRun,
    destroy: () => {
      scene?.stop();
      removeMenuInput();
    },
  };
}
