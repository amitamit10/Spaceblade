import { REBUILD_ENEMIES, REBUILD_PLAYER, REBUILD_SPRITES } from "./assets/frameManifest";
import { loadRebuildFrames, type LoadedFrames } from "./frameLoader";
import { advanceRebuildRun, createRebuildRun, releaseChargeRebuildRun, startChargeRebuildRun, tapRebuildRun, type RebuildRun } from "./rebuildGame";
import { REBUILD_HEIGHT, REBUILD_WIDTH, renderRebuildScene, type Actor } from "./renderScene";
import { createLocalStore } from "../state/persistence/localStorageStore";
import { loadRebuildHighscores, submitRebuildRun, type RebuildHighscores } from "./rebuildLeaderboard";

type Screen = "title" | "tutorial" | "playing" | "paused" | "settings" | "highscores" | "mobileWarning";

const create = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

export function mountRebuildApp(host: HTMLElement): void {
  const root = create("main", "rebuild-app");
  const canvas = create("canvas", "rebuild-canvas");
  canvas.width = REBUILD_WIDTH;
  canvas.height = REBUILD_HEIGHT;
  const overlay = create("div", "rebuild-overlay");
  root.append(canvas, overlay);
  host.replaceChildren(root);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is required");
  const drawContext: CanvasRenderingContext2D = ctx;

  let screen: Screen = window.matchMedia("(pointer: coarse)").matches ? "mobileWarning" : "title";
  let frames: LoadedFrames | null = null;
  let loadError: Error | null = null;
  let animationId = 0;
  let run: RebuildRun | null = null;
  let lastHudKey = "";
  let spaceDownAt: number | null = null;
  let lastTapAt = Number.NEGATIVE_INFINITY;
  const localStore = createLocalStore();
  let settings = localStore.getSettings();
  let bestScore = localStore.getBestScore();
  let bestWave = localStore.getBestWave();
  let tutorialSeen = localStore.getTutorialSeen();
  let lastRunStatus: RebuildRun["status"] | null = null;
  let pauseFocus = 0;
  let settingsFocus = 0;
  let highscores: RebuildHighscores | null = null;
  let leaderboardLoading = false;
  let leaderboardSubmitted = false;
  const pauseItems = ["Resume", "Highscores", "Settings", "Quit Run"];
  const settingsItems = ["Volume", "Screen Shake", "Reduced Effects", "Back"];

  function playerFacing(currentRun: RebuildRun): "left" | "right" {
    const nearest = currentRun.enemies
      .filter((enemy) => enemy.state !== "dead")
      .reduce<RebuildRun["enemies"][number] | null>((closest, enemy) => {
        if (!closest) return enemy;
        const distance = Math.abs(enemy.x - 640);
        const closestDistance = Math.abs(closest.x - 640);
        return distance < closestDistance || (distance === closestDistance && enemy.x > closest.x) ? enemy : closest;
      }, null);
    return nearest && nearest.x < 640 ? "left" : "right";
  }

  const actorForPlayer = (currentRun: RebuildRun): Actor => ({
    sprite: REBUILD_PLAYER,
    animation: currentRun.player.animation === "slash" ? "slash" : "idle",
    x: 640,
    facing: playerFacing(currentRun),
    startedAt: currentRun.player.actionStartedAt,
    kind: "player",
    playerAction: currentRun.player.animation,
  });

  const actorsForEnemies = (currentRun: RebuildRun): readonly Actor[] => currentRun.enemies.map((enemy) => ({
    sprite: REBUILD_ENEMIES.find((candidate) => candidate.id === enemy.type) ?? REBUILD_ENEMIES[0],
    animation: "walk",
    x: enemy.x,
    facing: enemy.side === "left" ? "right" : "left",
    startedAt: enemy.startedAt,
    kind: "enemy",
    enemyType: enemy.type,
    enemyState: enemy.state,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    shielded: enemy.shielded,
    nextAttackAt: enemy.nextAttackAt,
  }));

  function renderOverlay(): void {
    overlay.replaceChildren();
    if (screen === "playing" && run?.status === "gameOver") {
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Run Over"), create("p", "rebuild-copy", `Score ${run.score} · Wave ${run.wave}`), create("p", "rebuild-copy", `Best ${bestScore} · Wave ${bestWave}`), create("p", "rebuild-hint", "Press Space To Restart"));
      overlay.append(panel);
      return;
    }
    if (screen === "playing" && run?.status === "victory") {
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Sector Cleared"), create("p", "rebuild-copy", `Score ${run.score} · Wave 15`), create("p", "rebuild-copy", `Best ${bestScore} · Wave ${bestWave}`), create("p", "rebuild-hint", "Press Space To Restart"));
      overlay.append(panel);
      return;
    }
    if (screen === "paused") {
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Paused"));
      panel.append(...pauseItems.map((item, index) => create("p", index === pauseFocus ? "rebuild-menu-item rebuild-menu-item-active" : "rebuild-menu-item", `${index === pauseFocus ? "> " : "  "}${item}`)));
      panel.append(create("p", "rebuild-hint", "Tap Space To Select · Hold Space To Confirm"));
      overlay.append(panel);
      return;
    }
    if (screen === "settings") {
      const values = [`${Math.round(settings.volume * 100)}%`, settings.screenShakeEnabled ? "On" : "Off", settings.reducedEffectsEnabled ? "On" : "Off", "Return"];
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Settings"));
      panel.append(...settingsItems.map((item, index) => create("p", index === settingsFocus ? "rebuild-menu-item rebuild-menu-item-active" : "rebuild-menu-item", `${index === settingsFocus ? "> " : "  "}${item}: ${values[index]}`)));
      panel.append(create("p", "rebuild-hint", "Tap Space To Move · Hold Space To Change"));
      overlay.append(panel);
      return;
    }
    if (screen === "highscores") {
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Highscores"));
      if (leaderboardLoading) panel.append(create("p", "rebuild-copy", "Loading sector records..."));
      else if (!highscores || highscores.entries.length === 0) panel.append(create("p", "rebuild-copy", highscores?.fetchState === "disabled" ? "Online records are disabled. Play a run to create a local best." : highscores?.fetchState === "offline" ? "Online records are temporarily offline." : "No records yet."));
      else {
        const stateLabel = highscores.fetchState === "online" ? "GLOBAL RECORDS" : "LOCAL RECORD";
        panel.append(create("p", "rebuild-subtitle", stateLabel));
        panel.append(...highscores.entries.slice(0, 10).map((entry, index) => create("p", "rebuild-menu-item", `${String(index + 1).padStart(2, "0")}  ${entry.playerName.padEnd(16, " ")}  ${String(entry.score).padStart(6, " ")}  W${entry.wave}`)));
      }
      panel.append(create("p", "rebuild-hint", "Press Space To Return"));
      overlay.append(panel);
      return;
    }
    if (screen === "mobileWarning") {
      const panel = create("section", "rebuild-panel");
      panel.append(create("h2", "rebuild-heading", "Keyboard Recommended"), create("p", "rebuild-copy", "Spaceblade is built around one precise key. Connect a keyboard for the full experience."), create("p", "rebuild-hint", "Press Space To Continue"));
      overlay.append(panel);
      return;
    }
    if (screen === "playing" && run) {
      const hud = create("div", "rebuild-hud");
      hud.append(create("span", "rebuild-hp", `HP ${"♥".repeat(run.hearts)}${"♡".repeat(3 - run.hearts)}`), create("span", "rebuild-wave", `WAVE ${run.wave}`), create("span", "rebuild-score", `SCORE ${run.score}`));
      overlay.append(hud);
      return;
    }

    const panel = create("section", "rebuild-panel");
    if (screen === "title") {
      panel.append(create("h1", "rebuild-title", "Spaceblade"), create("p", "rebuild-subtitle", "ONE KEY. ENDLESS FIGHT."), create("p", "rebuild-copy", `BEST ${bestScore.toLocaleString()} · WAVE ${bestWave}`), create("p", "rebuild-hint", "Press Space To Start"));
    } else if (loadError) {
      panel.append(create("h2", "rebuild-heading", "Asset Load Failed"), create("p", "rebuild-copy", loadError.message), create("p", "rebuild-hint", "Refresh to retry"));
    } else {
      panel.append(
        create("h2", "rebuild-heading", "How To Play"),
        create("p", "rebuild-copy", "Move, strike, and survive the wave."),
        create("p", "rebuild-copy", "Tap Space: slash · Hold: heavy · Double tap: dodge."),
        create("p", "rebuild-hint", frames ? "Hold Space To Continue" : "Loading frames..."),
      );
    }
    overlay.append(panel);
  }

  function frame(now: number): void {
    if ((screen === "playing" || screen === "paused" || screen === "settings" || screen === "highscores") && frames && run) {
      if (screen !== "playing") {
        renderRebuildScene(drawContext, frames, actorForPlayer(run), actorsForEnemies(run), now, settings);
        animationId = requestAnimationFrame(frame);
        return;
      }
      run = advanceRebuildRun(run, now);
      if (spaceDownAt !== null && now - spaceDownAt >= 850) {
        screen = "paused";
        pauseFocus = 0;
        spaceDownAt = null;
        renderOverlay();
      }
      if (run.status !== lastRunStatus) {
        lastRunStatus = run.status;
        if (run.status !== "playing") {
          bestScore = localStore.updateBestScore(run.score);
          bestWave = localStore.updateBestWave(run.wave);
          if (!leaderboardSubmitted) {
            leaderboardSubmitted = true;
            void submitRebuildRun(run, localStore.getPlayerName());
          }
          renderOverlay();
        }
      }
      if (spaceDownAt !== null && run.player.animation === "idle" && now - spaceDownAt >= 220) {
        run = startChargeRebuildRun(run, now);
      }
      renderRebuildScene(drawContext, frames, actorForPlayer(run), actorsForEnemies(run), now, settings);
      const hudKey = `${run.status}:${run.wave}:${run.score}:${run.hearts}`;
      if (hudKey !== lastHudKey) {
        lastHudKey = hudKey;
        renderOverlay();
      }
    } else {
      drawContext.fillStyle = "#071322";
      drawContext.fillRect(0, 0, REBUILD_WIDTH, REBUILD_HEIGHT);
    }
    animationId = requestAnimationFrame(frame);
  }

  function beginPlaying(): void {
    if (!frames) return;
    screen = "playing";
    run = createRebuildRun(performance.now());
    spaceDownAt = null;
    highscores = null;
    leaderboardLoading = false;
    leaderboardSubmitted = false;
    lastTapAt = Number.NEGATIVE_INFINITY;
    lastRunStatus = run.status;
    lastHudKey = "";
    renderOverlay();
  }

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();
    if (screen === "mobileWarning") {
      screen = "title";
      renderOverlay();
      return;
    }
    if (screen === "title") {
      if (tutorialSeen) beginPlaying();
      else {
        screen = "tutorial";
        renderOverlay();
      }
    } else if (screen === "tutorial") {
      tutorialSeen = true;
      localStore.setTutorialSeen(true);
      beginPlaying();
    }
    else if (screen === "playing" && frames && run) {
      if (run.status !== "playing") beginPlaying();
      else spaceDownAt = performance.now();
    } else if (screen === "paused" || screen === "settings" || screen === "highscores") spaceDownAt = performance.now();
  });

  window.addEventListener("keyup", (event) => {
    if (event.code !== "Space") return;
    event.preventDefault();
    if (spaceDownAt === null) return;
    const now = performance.now();
    const heldMs = now - spaceDownAt;
    spaceDownAt = null;
    if (screen === "highscores") {
      screen = "paused";
      renderOverlay();
      return;
    }
    if (screen === "paused" && run) {
      if (heldMs >= 450) {
        if (pauseFocus === 0) screen = "playing";
        else if (pauseFocus === 1) {
          screen = "highscores";
          highscores = null;
          leaderboardLoading = true;
          renderOverlay();
          void loadRebuildHighscores(bestScore, bestWave, localStore.getPlayerName()).then((result) => {
            highscores = result;
            leaderboardLoading = false;
            if (screen === "highscores") renderOverlay();
          });
        }
        else if (pauseFocus === 2) screen = "settings";
        else {
          screen = "title";
          run = null;
        }
      } else pauseFocus = (pauseFocus + 1) % pauseItems.length;
      renderOverlay();
      return;
    }
    if (screen === "settings" && run) {
      if (heldMs >= 450) {
        if (settingsFocus === 0) settings = { ...settings, volume: settings.volume > 0 ? 0 : 0.8 };
        else if (settingsFocus === 1) settings = { ...settings, screenShakeEnabled: !settings.screenShakeEnabled };
        else if (settingsFocus === 2) settings = { ...settings, reducedEffectsEnabled: !settings.reducedEffectsEnabled };
        else screen = "paused";
        localStore.setSettings(settings);
      } else settingsFocus = (settingsFocus + 1) % settingsItems.length;
      renderOverlay();
      return;
    }
    if (screen !== "playing" || !frames || !run) return;
    if (run.status !== "playing") {
      beginPlaying();
      return;
    }
    if (heldMs >= 220) run = releaseChargeRebuildRun(run, now, heldMs);
    else {
      const isDoubleTap = now - lastTapAt <= 300;
      run = tapRebuildRun(run, now, isDoubleTap);
      lastTapAt = now;
    }
    renderOverlay();
  });

  renderOverlay();
  void loadRebuildFrames(REBUILD_SPRITES)
    .then((loaded) => {
      frames = loaded;
      if (screen === "tutorial") renderOverlay();
    })
    .catch((error: unknown) => {
      loadError = error instanceof Error ? error : new Error("Unknown frame loading error");
      renderOverlay();
    });
  animationId = requestAnimationFrame(frame);
  void animationId;
}
