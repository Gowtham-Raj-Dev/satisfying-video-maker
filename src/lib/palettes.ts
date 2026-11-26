import { ColorPalette } from "@/types/simulation";

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "cyber",
    name: "Cyber Neon",
    colors: ["#00F5FF", "#FF007F", "#8B5CF6", "#C4FF2E", "#FFE600", "#FF3366"],
    bg: "#0B0B0C",
  },
  {
    id: "candy",
    name: "Rainbow Candy",
    colors: ["#FF4D6D", "#00D9C0", "#FF9B71", "#FFD166", "#70C1B3", "#B185DB"],
    bg: "#0F1016",
  },
  {
    id: "sunset",
    name: "Sunset Gold",
    colors: ["#FF5E36", "#FFAE33", "#FF2A6D", "#9B5DE5", "#F15BB5", "#FEE440"],
    bg: "#120B18",
  },
  {
    id: "matrix",
    name: "Acid Matrix",
    colors: ["#C4FF2E", "#39FF14", "#00FFCC", "#A3E635", "#22C55E", "#EAB308"],
    bg: "#080E09",
  },
  {
    id: "galaxy",
    name: "Deep Galaxy",
    colors: ["#A855F7", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#06B6D4"],
    bg: "#080914",
  },
  {
    id: "pastel",
    name: "Chill Pastel",
    colors: ["#F9A8D4", "#C4B5FD", "#7DD3FC", "#86EFAC", "#FDBA74", "#FDE68A"],
    bg: "#121318",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: ["#F5F5F5", "#D4D4D8", "#A1A1AA", "#71717A", "#E4E4E7", "#FFFFFF"],
    bg: "#0B0B0C",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    colors: ["#38BDF8", "#0EA5E9", "#06B6D4", "#2DD4BF", "#60A5FA", "#818CF8"],
    bg: "#081018",
  },
  {
    id: "fire-ice",
    name: "Fire and Ice",
    colors: ["#FF4500", "#FF8C00", "#FFD700", "#00E5FF", "#38BDF8", "#6366F1"],
    bg: "#0C0C10",
  },
  {
    id: "custom",
    name: "Custom Palette",
    colors: ["#C4FF2E", "#38BDF8", "#F43F5E", "#FACC15", "#A855F7", "#2DD4BF"],
    bg: "#0B0B0C",
    isCustom: true,
  },
];
