(() => {
  "use strict";

  const presets = {
    player: { width: 96, height: 96, columns: 6, rows: 9 },
    grunt: { width: 64, height: 64, columns: 4, rows: 6 },
    runner: { width: 64, height: 64, columns: 6, rows: 6 },
    shield: { width: 80, height: 80, columns: 4, rows: 6 },
    tank: { width: 96, height: 96, columns: 4, rows: 6 },
    glitch: { width: 80, height: 80, columns: 6, rows: 6 },
    boss: { width: 160, height: 160, columns: 5, rows: 7 },
  };

  const $ = (id) => document.getElementById(id);
  const sourceFile = $("source-file");
  const preset = $("preset");
  const sourceCanvas = $("sheet-canvas");
  const previewCanvas = $("preview-canvas");
  const sourceContext = sourceCanvas.getContext("2d");
  const previewContext = previewCanvas.getContext("2d");
  const emptyState = $("empty-state");
  const sheetName = $("sheet-name");
  const selectionLabel = $("selection-label");
  const selectionData = $("selection-data");
  const downloadSelected = $("download-selected");
  const downloadAll = $("download-all");
  const exportManifest = $("export-manifest");
  const fields = ["frame-width", "frame-height", "columns", "rows", "origin-x", "origin-y", "gap-x", "gap-y"];
  let image = null;
  let imageUrl = null;
  let mode = "grid";
  let selection = null;
  let dragStart = null;
  let manifest = [];

  for (const field of fields) $(field).addEventListener("input", render);

  preset.addEventListener("change", () => {
    const values = presets[preset.value];
    if (values) {
      $("frame-width").value = values.width;
      $("frame-height").value = values.height;
      $("columns").value = values.columns;
      $("rows").value = values.rows;
      $("origin-x").value = 0;
      $("origin-y").value = 0;
      $("gap-x").value = 0;
      $("gap-y").value = 0;
    }
    render();
  });

  sourceFile.addEventListener("change", () => {
    const file = sourceFile.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = URL.createObjectURL(file);
    image = new Image();
    image.onload = () => {
      sheetName.textContent = `${file.name} · ${image.naturalWidth} × ${image.naturalHeight}`;
      emptyState.hidden = true;
      selection = null;
      render();
    };
    image.src = imageUrl;
  });

  for (const button of document.querySelectorAll(".mode-button")) {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      for (const candidate of document.querySelectorAll(".mode-button")) candidate.classList.toggle("active", candidate === button);
      $("canvas-help").textContent = mode === "grid"
        ? "Click a grid cell to select it. Adjust origin and gap if the sheet has padding."
        : "Drag around one complete frame. The rectangle is exported exactly as selected.";
      selection = null;
      render();
    });
  }

  sourceCanvas.addEventListener("click", (event) => {
    if (!image || mode !== "grid") return;
    const point = canvasPoint(event);
    const values = settings();
    const col = Math.floor((point.x - values.originX) / (values.width + values.gapX));
    const row = Math.floor((point.y - values.originY) / (values.height + values.gapY));
    if (col < 0 || row < 0 || col >= values.columns || row >= values.rows) return;
    const x = values.originX + col * (values.width + values.gapX);
    const y = values.originY + row * (values.height + values.gapY);
    if (x + values.width > image.naturalWidth || y + values.height > image.naturalHeight) return;
    selection = { x, y, width: values.width, height: values.height, row, col, label: `row-${String(row).padStart(2, "0")}-frame-${String(col).padStart(2, "0")}` };
    render();
  });

  sourceCanvas.addEventListener("pointerdown", (event) => {
    if (!image || mode !== "manual") return;
    sourceCanvas.setPointerCapture(event.pointerId);
    dragStart = canvasPoint(event);
  });
  sourceCanvas.addEventListener("pointerup", (event) => {
    if (!image || mode !== "manual" || !dragStart) return;
    const point = canvasPoint(event);
    const x = Math.max(0, Math.min(dragStart.x, point.x));
    const y = Math.max(0, Math.min(dragStart.y, point.y));
    const right = Math.min(image.naturalWidth, Math.max(dragStart.x, point.x));
    const bottom = Math.min(image.naturalHeight, Math.max(dragStart.y, point.y));
    if (right - x > 1 && bottom - y > 1) {
      selection = { x: Math.round(x), y: Math.round(y), width: Math.round(right - x), height: Math.round(bottom - y), label: "manual-frame" };
    }
    dragStart = null;
    render();
  });

  downloadSelected.addEventListener("click", () => {
    if (selection) downloadFrame(selection, selection.label || "frame");
  });
  downloadAll.addEventListener("click", () => {
    for (const frame of manifest) downloadFrame(frame, frame.label);
  });
  exportManifest.addEventListener("click", () => {
    const payload = { source: sheetName.textContent, frameSize: { width: settings().width, height: settings().height }, frames: manifest };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    triggerDownload(URL.createObjectURL(blob), "sprite-frames.json");
  });

  function settings() {
    return {
      width: number("frame-width"), height: number("frame-height"), columns: number("columns"), rows: number("rows"),
      originX: number("origin-x"), originY: number("origin-y"), gapX: number("gap-x"), gapY: number("gap-y"),
    };
  }
  function number(id) { return Math.max(0, Number($(id).value) || 0); }
  function canvasPoint(event) {
    const bounds = sourceCanvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * sourceCanvas.width / bounds.width, y: (event.clientY - bounds.top) * sourceCanvas.height / bounds.height };
  }
  function gridFrames() {
    if (!image) return [];
    const values = settings();
    const frames = [];
    for (let row = 0; row < values.rows; row += 1) {
      for (let col = 0; col < values.columns; col += 1) {
        const x = values.originX + col * (values.width + values.gapX);
        const y = values.originY + row * (values.height + values.gapY);
        if (x + values.width <= image.naturalWidth && y + values.height <= image.naturalHeight) frames.push({ x, y, width: values.width, height: values.height, row, col, label: `row-${String(row).padStart(2, "0")}-frame-${String(col).padStart(2, "0")}` });
      }
    }
    return frames;
  }
  function render() {
    if (!image) return;
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    sourceContext.imageSmoothingEnabled = false;
    sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceContext.drawImage(image, 0, 0);
    manifest = mode === "grid" ? gridFrames() : selection ? [selection] : [];
    sourceContext.lineWidth = Math.max(1, Math.round(Math.min(sourceCanvas.width, sourceCanvas.height) / 300));
    if (mode === "grid") {
      for (const frame of manifest) {
        sourceContext.strokeStyle = selection && sameFrame(frame, selection) ? "#ffb45c" : "rgba(71,232,255,.7)";
        sourceContext.strokeRect(frame.x + .5, frame.y + .5, frame.width - 1, frame.height - 1);
      }
    }
    if (selection) {
      sourceContext.strokeStyle = "#ffb45c";
      sourceContext.lineWidth = Math.max(2, sourceContext.lineWidth + 1);
      sourceContext.strokeRect(selection.x + .5, selection.y + .5, selection.width - 1, selection.height - 1);
      drawPreview(selection);
      selectionLabel.textContent = selection.label || "manual-frame";
      selectionData.textContent = `x ${selection.x} · y ${selection.y} · ${selection.width} × ${selection.height}`;
    } else {
      previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      selectionLabel.textContent = "None";
      selectionData.textContent = "Upload a sheet, then choose a frame.";
    }
    const ready = Boolean(selection);
    downloadSelected.disabled = !ready;
    downloadAll.disabled = mode !== "grid" || manifest.length === 0;
    exportManifest.disabled = manifest.length === 0;
  }
  function sameFrame(a, b) { return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height; }
  function drawPreview(frame) {
    const scale = Math.min(previewCanvas.width / frame.width, previewCanvas.height / frame.height);
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.imageSmoothingEnabled = false;
    previewContext.drawImage(image, frame.x, frame.y, frame.width, frame.height, (previewCanvas.width - frame.width * scale) / 2, (previewCanvas.height - frame.height * scale) / 2, frame.width * scale, frame.height * scale);
  }
  function downloadFrame(frame, label) {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
    canvas.toBlob((blob) => { if (blob) triggerDownload(URL.createObjectURL(blob), `${label}.png`); }, "image/png");
  }
  function triggerDownload(url, name) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
