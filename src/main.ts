import "./engine/spacebladeStyles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is an enhancement; gameplay must still boot normally.
    });
  }, { once: true });
}

const host = document.querySelector<HTMLElement>("#app");
if (!host) {
  throw new Error("Missing #app root element");
}

void import("./engine/spacebladeConfig")
  .then(({ mountSpacebladeGame }) => mountSpacebladeGame(host))
  .catch((error: unknown) => {
    host.textContent = error instanceof Error ? error.message : "Unable to load Spaceblade";
  });
