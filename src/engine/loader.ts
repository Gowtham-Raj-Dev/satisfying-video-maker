import { EngineId, OverlayConfig, SimulationParams } from "@/types/simulation";
import { SimulationEngine } from "./types";

export async function createSimulationEngine(
  engineId: EngineId,
  canvas: HTMLCanvasElement,
  params: Partial<SimulationParams>,
  overlays?: OverlayConfig
): Promise<SimulationEngine> {
  switch (engineId) {
    case "bouncing-ball": {
      const { BouncingBallEngine } = await import("./simulations/bouncingBallEngine");
      return new BouncingBallEngine(canvas, params, overlays);
    }
    case "ring-escape": {
      const { RingEscapeEngine } = await import("./simulations/ringEscapeEngine");
      return new RingEscapeEngine(canvas, params, overlays);
    }
    case "marble-race": {
      const { MarbleRaceEngine } = await import("./simulations/marbleRaceEngine");
      return new MarbleRaceEngine(canvas, params, overlays);
    }
    case "hydraulic-press": {
      const { HydraulicPressEngine } = await import("./simulations/hydraulicPressEngine");
      return new HydraulicPressEngine(canvas, params, overlays);
    }
    case "kinetic-sand": {
      const { KineticSandEngine } = await import("./simulations/kineticSandEngine");
      return new KineticSandEngine(canvas, params, overlays);
    }
    case "fluid-swirl": {
      const { FluidSwirlEngine } = await import("./simulations/fluidSwirlEngine");
      return new FluidSwirlEngine(canvas, params, overlays);
    }
    case "orbital-gravity": {
      const { OrbitalGravityEngine } = await import("./simulations/orbitalGravityEngine");
      return new OrbitalGravityEngine(canvas, params, overlays);
    }
    case "three-space": {
      const { ThreeSpaceEngine } = await import("./simulations/threeSpaceEngine");
      return new ThreeSpaceEngine(canvas, params, overlays);
    }
    case "matter-ball-pit": {
      const { MatterBallPitEngine } = await import("./simulations/matterBallPitEngine");
      return new MatterBallPitEngine(canvas, params, overlays);
    }
    case "domino-chain": {
      const { DominoChainEngine } = await import("./simulations/dominoChainEngine");
      return new DominoChainEngine(canvas, params, overlays);
    }
    case "pendulum-wave": {
      const { PendulumWaveEngine } = await import("./simulations/pendulumWaveEngine");
      return new PendulumWaveEngine(canvas, params, overlays);
    }
    case "gear-clockwork": {
      const { GearClockworkEngine } = await import("./simulations/gearClockworkEngine");
      return new GearClockworkEngine(canvas, params, overlays);
    }
    case "magnetic-attractor": {
      const { MagneticAttractorEngine } = await import("./simulations/magneticAttractorEngine");
      return new MagneticAttractorEngine(canvas, params, overlays);
    }
    case "color-sorter": {
      const { ColorSorterEngine } = await import("./simulations/colorSorterEngine");
      return new ColorSorterEngine(canvas, params, overlays);
    }
    case "geometric-pattern": {
      const { GeometricPatternEngine } = await import("./simulations/geometricPatternEngine");
      return new GeometricPatternEngine(canvas, params, overlays);
    }
    case "bubble-pop": {
      const { BubblePopEngine } = await import("./simulations/bubblePopEngine");
      return new BubblePopEngine(canvas, params, overlays);
    }
    case "particle-wonder": {
      const { ParticleWonderEngine } = await import("./simulations/particleWonderEngine");
      return new ParticleWonderEngine(canvas, params, overlays);
    }
    case "kinetic-art": {
      const { KineticArtEngine } = await import("./simulations/kineticArtEngine");
      return new KineticArtEngine(canvas, params, overlays);
    }
    default: {
      const { BouncingBallEngine } = await import("./simulations/bouncingBallEngine");
      return new BouncingBallEngine(canvas, params, overlays);
    }
  }
}
