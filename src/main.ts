import "./engine/spacebladeStyles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    void navigator.serviceWorker.register("/sw.js")
      .then(async (registration) => {
        const activate = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        activate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") activate();
          });
        });
        await registration.update();
        activate();
      })
      .catch(() => {
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
