import { describe, it, expect, vi } from "vitest";
import { createScreenState } from "./screenState";
import type { GameScreen } from "../app/types";

describe("createScreenState", () => {
  it("returns the initial value from get", () => {
    const state = createScreenState<GameScreen>("title");
    expect(state.get()).toBe("title");
  });

  it("transitions to a new screen on set", () => {
    const state = createScreenState<GameScreen>("title");
    state.set("tutorial");
    expect(state.get()).toBe("tutorial");
  });

  it("notifies subscribers on change", () => {
    const state = createScreenState<GameScreen>("title");
    const listener = vi.fn();
    state.subscribe(listener);
    state.set("playing");
    expect(listener).toHaveBeenCalledWith("playing");
  });

  it("does not notify when the value is unchanged", () => {
    const state = createScreenState<GameScreen>("title");
    const listener = vi.fn();
    state.subscribe(listener);
    state.set("title");
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const state = createScreenState<GameScreen>("title");
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);
    unsubscribe();
    state.set("gameOver");
    expect(listener).not.toHaveBeenCalled();
  });
});
