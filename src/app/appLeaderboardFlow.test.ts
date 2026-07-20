import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRunController } from "../game/run/runState";

type AppHandle = {
  getScreen(): string;
  getFocusedAction(): string | null;
  tapSpace(): void;
  holdConfirmSpace(): void;
  finishRun(state: ReturnType<typeof createRunController>["state"]): void;
  destroy(): void;
};

const loadLeaderboardService = vi.fn();
const loadTopScores = vi.fn();
const submitRun = vi.fn();

vi.mock("../state/leaderboard/loadLeaderboardService", () => ({
  loadLeaderboardService,
}));

describe("mountApp leaderboard timing", () => {
  let host: HTMLElement;
  let app: AppHandle | null;

  beforeEach(() => {
    vi.resetModules();
    loadLeaderboardService.mockReset();
    loadTopScores.mockReset();
    submitRun.mockReset();
    loadTopScores.mockResolvedValue({ fetchState: "online", entries: [] });
    submitRun.mockResolvedValue("submitted");
    loadLeaderboardService.mockResolvedValue({ loadTopScores, submitRun });

    localStorage.clear();
    host = document.createElement("div");
    host.id = "app";
    document.body.appendChild(host);
    app = null;
  });

  afterEach(() => {
    app?.destroy();
    host.remove();
  });

  async function mount(): Promise<AppHandle> {
    const mod = await import("./App");
    return mod.mountApp(host) as unknown as AppHandle;
  }

  it("does not request the leaderboard loader on mount or when starting a run", async () => {
    app = await mount();
    expect(loadLeaderboardService).not.toHaveBeenCalled();

    app.tapSpace();
    app.holdConfirmSpace();

    expect(app.getScreen()).toBe("playing");
    expect(loadLeaderboardService).not.toHaveBeenCalled();
  });

  it("requests the leaderboard loader when entering highscores", async () => {
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const rc = createRunController(0);
    rc.state.score = 99;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    app.tapSpace();
    app.holdConfirmSpace();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getScreen()).toBe("highscores");
    expect(loadLeaderboardService).toHaveBeenCalledTimes(1);
    expect(loadTopScores).toHaveBeenCalledTimes(1);
  });

  it("does not request the loader for ineligible scores but does for eligible scores", async () => {
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const low = createRunController(0);
    low.state.score = 99;
    low.state.wave = 2;
    low.state.status = "gameOver";
    app.finishRun(low.state);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loadLeaderboardService).not.toHaveBeenCalled();
    expect(submitRun).not.toHaveBeenCalled();

    const high = createRunController(0);
    high.state.score = 300;
    high.state.wave = 3;
    high.state.status = "gameOver";
    app.finishRun(high.state);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadLeaderboardService).toHaveBeenCalledTimes(1);
    expect(submitRun).toHaveBeenCalledTimes(1);
    expect(submitRun).toHaveBeenCalledWith(
      expect.objectContaining({ score: 300, wave: 3 }),
      expect.any(String),
    );
  });

  it("shows offline when the lazy loader itself rejects", async () => {
    loadLeaderboardService.mockRejectedValueOnce(new Error("chunk failed"));
    app = await mount();
    app.tapSpace();
    app.holdConfirmSpace();

    const rc = createRunController(0);
    rc.state.score = 99;
    rc.state.wave = 6;
    rc.state.status = "gameOver";
    app.finishRun(rc.state);

    app.tapSpace();
    app.holdConfirmSpace();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getScreen()).toBe("highscores");
    expect(host.textContent).toContain("Offline");
    expect(host.textContent).toContain("showing local results");
  });
});
