import Phaser from "phaser";
import { SpacebladePlayScene } from "./spacebladeScene";
export { SPACEBLADE_HEIGHT, SPACEBLADE_WIDTH } from "./spacebladeConstants";
import { SPACEBLADE_HEIGHT, SPACEBLADE_WIDTH } from "./spacebladeConstants";

export function createSpacebladeGameConfig(options: { readonly parent: string | HTMLElement }): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: SPACEBLADE_WIDTH,
    height: SPACEBLADE_HEIGHT,
    parent: options.parent,
    backgroundColor: "#071322",
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      target: 30,
      forceSetTimeOut: true,
    },
    scene: [SpacebladePlayScene],
  };
}

export function mountSpacebladeGame(parent: string | HTMLElement): Phaser.Game {
  return new Phaser.Game(createSpacebladeGameConfig({ parent }));
}
