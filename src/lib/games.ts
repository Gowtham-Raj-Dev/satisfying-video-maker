import { Sparkles, Trophy, Hourglass, Hammer, ShieldAlert, Orbit, type LucideIcon } from "lucide-react";

export interface GameItem {
  id: "ball" | "marble" | "breaker" | "crusher" | "sand" | "vortex";
  label: string;
  icon: LucideIcon;
  tag: string;
  desc: string;
}

export const GAMES_LIST: GameItem[] = [
  {
    id: "ball",
    label: "Bouncing Ball",
    icon: Sparkles,
    tag: "ASMR Loop",
    desc: "Ball bouncing inside rotating shapes with musical pentatonic chimes & speed multiplier.",
  },
  {
    id: "breaker",
    label: "Ring Escape",
    icon: ShieldAlert,
    tag: "Viral 10M+",
    desc: "Ball breaking concentric neon barriers to escape. The highest retention format on TikTok.",
  },
  {
    id: "marble",
    label: "Marble Race",
    icon: Trophy,
    tag: "Country Battle",
    desc: "Country flag marbles racing down ramps, spinners & Plinko pegs with live rankings.",
  },
  {
    id: "crusher",
    label: "Hydraulic Press",
    icon: Hammer,
    tag: "Crush ASMR",
    desc: "100-ton steel hydraulic press crushing squishy shapes into exploding pieces.",
  },
  {
    id: "sand",
    label: "Sand Waterfall",
    icon: Hourglass,
    tag: "Relaxing Flow",
    desc: "Thousands of rainbow kinetic sand particles cascading smoothly through an oscillating maze.",
  },
  {
    id: "vortex",
    label: "Cosmic Vortex",
    icon: Orbit,
    tag: "Hypnotic Space",
    desc: "Swirling gravity black hole pulling neon star particles in mathematical spirals.",
  },
];
