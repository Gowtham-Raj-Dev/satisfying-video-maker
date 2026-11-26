"use client";

import React, { useState } from "react";
import {
  Sliders, Palette, Volume2, Type, RotateCcw, Shuffle, Undo2, Redo2,
  Save, Play, Plus, Trash2, BookmarkCheck
} from "lucide-react";
import { COLOR_PALETTES } from "@/lib/palettes";
import { EXTRA_COUNTRY_MARBLES } from "@/lib/defaults";
import { AMBIENT_PRESETS, SOUND_CATEGORIES, SOUND_PRESETS, soundEngine } from "@/engine/audio";
import {
  AmbientPresetId,
  AudioConfig,
  GameDefinition,
  OverlayAnimation,
  OverlayBackground,
  OverlayConfig,
  OverlayFont,
  SavedPresetRecord,
  SimulationParams,
  SoundCategoryId,
  SoundPresetId,
} from "@/types/simulation";
import CustomSelect from "./CustomSelect";

export type InspectorTab = "controls" | "visuals" | "audio" | "overlays" | "presets";

interface InspectorPanelsProps {
  game: GameDefinition;
  params: SimulationParams;
  audio: AudioConfig;
  overlays: OverlayConfig;
  savedPresets: SavedPresetRecord[];
  canUndo: boolean;
  canRedo: boolean;
  showOverlaysTab?: boolean;
  compactStudio?: boolean;
  onChangeParams: (patch: Partial<SimulationParams>) => void;
  onChangeAudio: (patch: Partial<AudioConfig>) => void;
  onChangeOverlays: (next: OverlayConfig) => void;
  onResetDefaults: () => void;
  onRandomize: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: SavedPresetRecord) => void;
  onDeletePreset: (id: string) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#A1A1AA] truncate">{label}</span>
        <span className="font-mono-tabular text-[#F5F5F5] font-medium shrink-0 ml-1">
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

export default function InspectorPanels({
  game,
  params,
  audio,
  overlays,
  savedPresets,
  canUndo,
  canRedo,
  showOverlaysTab = true,
  compactStudio = false,
  onChangeParams,
  onChangeAudio,
  onChangeOverlays,
  onResetDefaults,
  onRandomize,
  onUndo,
  onRedo,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: InspectorPanelsProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("controls");
  const [soundCategory, setSoundCategory] = useState<SoundCategoryId>("crystal");
  const [presetName, setPresetName] = useState(`${game.name} Setup`);
  const [newMarbleName, setNewMarbleName] = useState("");
  const [newMarbleColor, setNewMarbleColor] = useState("#C4FF2E");

  const has = (section: string) => game.sections.includes(section as never);

  const tabs: { id: InspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "controls", label: "Physics", icon: Sliders },
    { id: "visuals", label: "Visuals", icon: Palette },
    { id: "audio", label: "Audio", icon: Volume2 },
    ...(showOverlaysTab ? [{ id: "overlays" as const, label: "Text", icon: Type }] : []),
    { id: "presets", label: "Presets", icon: BookmarkCheck },
  ];

  return (
    <div className="flex flex-col h-full bg-[#141416] border border-[#29292D] rounded-lg overflow-hidden">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-[#29292D] bg-[#1B1B1E] shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo last change"
            className="p-1.5 rounded bg-[#141416] border border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5] disabled:opacity-35 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo change"
            className="p-1.5 rounded bg-[#141416] border border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5] disabled:opacity-35 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRandomize}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141416] border border-[#29292D] hover:border-[#3F3F46] text-xs font-medium text-[#F5F5F5] transition-colors"
          >
            <Shuffle className="w-3 h-3 text-[#C4FF2E]" />
            Randomize
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141416] border border-[#29292D] hover:border-[#3F3F46] text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[#29292D] bg-[#141416] px-2 pt-1.5 gap-1 overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[60px] inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors ${
                active
                  ? "border-[#C4FF2E] text-[#F5F5F5] bg-[#1B1B1E]"
                  : "border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area — compact vertical spacing keeps Studio zero-scroll */}
      <div
        className={`overflow-y-auto panel-scroll flex-1 min-h-0 ${
          compactStudio ? "p-2.5 space-y-2.5 lg:max-h-full" : "p-3.5 space-y-4 max-h-[640px] lg:max-h-full"
        }`}
      >
        {/* ==================== CONTROLS TAB ==================== */}
        {activeTab === "controls" && (
          <div className={compactStudio ? "space-y-2.5" : "space-y-4"}>
            <div className={compactStudio ? "space-y-1.5" : "space-y-2.5"}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                General Motion
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <SliderRow
                  label="Speed"
                  value={params.speed}
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  suffix="x"
                  onChange={(v) => onChangeParams({ speed: v })}
                />
                <SliderRow
                  label="Object Size"
                  value={params.objectSize}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  suffix="x"
                  onChange={(v) => onChangeParams({ objectSize: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#A1A1AA]">Random Seed</span>
                <input
                  type="number"
                  value={params.seed}
                  onChange={(e) => onChangeParams({ seed: Number(e.target.value) || 1 })}
                  className="w-24 bg-[#0B0B0C] border border-[#29292D] rounded px-2 py-0.5 text-xs font-mono-tabular text-[#F5F5F5]"
                  aria-label="Random Seed"
                />
              </div>
            </div>

            {has("physics") && (
              <div className={compactStudio ? "space-y-2 pt-2 border-t border-[#29292D]" : "space-y-3 pt-3 border-t border-[#29292D]"}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Physics Parameters
                </div>
                {game.engineId === "bouncing-ball" && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] text-[#A1A1AA] block">
                        Container Shape (Asks Start)
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {(["circle", "hexagon", "octagon", "triangle", "star"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onChangeParams({ containerShape: s })}
                            className={`py-1 rounded text-[11px] font-medium capitalize border transition-colors ${
                              params.containerShape === s
                                ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                                : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#A1A1AA] block">Ball Multiply Rule</span>
                        <CustomSelect
                          ariaLabel="Ball Multiply Rule"
                          value={params.multiplyMode || "none"}
                          options={[
                            { value: "none", label: "Classic Bounce" },
                            { value: "wall", label: "Wall Hit -> 2 Balls" },
                            { value: "ball", label: "Ball Collision -> 2x" },
                            { value: "both", label: "Wall & Ball -> 2x" },
                          ]}
                          onChange={(val) =>
                            onChangeParams({
                              multiplyMode: val as SimulationParams["multiplyMode"],
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-[#A1A1AA] block">Arena Layout</span>
                        <CustomSelect
                          ariaLabel="Arena Layout"
                          value={params.arenaLayout || "clean"}
                          options={[
                            { value: "clean", label: "Open Shape" },
                            { value: "center-bumper", label: "Center Core" },
                            { value: "peg-field", label: "Peg Ring" },
                            { value: "split-gate", label: "Split Gate" },
                            { value: "dual-chamber", label: "Dual Funnel" },
                          ]}
                          onChange={(val) =>
                            onChangeParams({
                              arenaLayout: val as SimulationParams["arenaLayout"],
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <SliderRow
                    label="Object Count"
                    value={params.objectCount}
                    min={1}
                    max={12}
                    step={1}
                    onChange={(v) => onChangeParams({ objectCount: v })}
                  />
                  <SliderRow
                    label="Gravity"
                    value={params.gravity}
                    min={0}
                    max={2}
                    step={0.05}
                    suffix="x"
                    onChange={(v) => onChangeParams({ gravity: v })}
                  />
                  <SliderRow
                    label="Bounce"
                    value={params.bounce}
                    min={0.4}
                    max={1.06}
                    step={0.01}
                    onChange={(v) => onChangeParams({ bounce: v })}
                  />
                  <SliderRow
                    label="Rotation"
                    value={params.rotationSpeed}
                    min={-4}
                    max={4}
                    step={0.1}
                    onChange={(v) => onChangeParams({ rotationSpeed: v })}
                  />
                </div>
                {game.engineId === "bouncing-ball" && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <SliderRow
                      label="Speedup / Bounce"
                      value={params.speedIncrement}
                      min={0}
                      max={2}
                      step={0.05}
                      suffix="%"
                      onChange={(v) => onChangeParams({ speedIncrement: v })}
                    />
                    {params.multiplyMode && params.multiplyMode !== "none" ? (
                      <SliderRow
                        label="Fill Capacity"
                        value={params.maxMultiplyBalls || 96}
                        min={16}
                        max={128}
                        step={8}
                        onChange={(v) => onChangeParams({ maxMultiplyBalls: v })}
                      />
                    ) : (
                      <SliderRow
                        label="Trail Length"
                        value={params.trailLength}
                        min={0}
                        max={32}
                        step={2}
                        onChange={(v) => onChangeParams({ trailLength: v })}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {has("ring") && (
              <div className="space-y-3 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Ring Escape Mechanics
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "gap-escape", label: "Rotating Gaps" },
                    { id: "breakable", label: "Breakable Walls" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeParams({ variant: m.id })}
                      className={`py-1.5 px-2 rounded text-xs font-medium border ${
                        params.variant === m.id
                          ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E]"
                          : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <SliderRow
                    label="Rings"
                    value={params.ringCount}
                    min={3}
                    max={14}
                    step={1}
                    onChange={(v) => onChangeParams({ ringCount: v })}
                  />
                  <SliderRow
                    label="Thickness"
                    value={params.ringThickness}
                    min={4}
                    max={24}
                    step={1}
                    suffix="px"
                    onChange={(v) => onChangeParams({ ringThickness: v })}
                  />
                  <SliderRow
                    label="Gap Size"
                    value={params.gapSize}
                    min={0.2}
                    max={1.8}
                    step={0.05}
                    suffix=" rad"
                    onChange={(v) => onChangeParams({ gapSize: v })}
                  />
                  <SliderRow
                    label="Ball Count"
                    value={params.objectCount}
                    min={1}
                    max={8}
                    step={1}
                    onChange={(v) => onChangeParams({ objectCount: v })}
                  />
                </div>
                <SliderRow
                  label="Ring Rotation"
                  value={params.rotationSpeed}
                  min={-4}
                  max={4}
                  step={0.1}
                  onChange={(v) => onChangeParams({ rotationSpeed: v })}
                />
              </div>
            )}

            {has("marble") && (
              <div className="space-y-3 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Marble Race Setup
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA] block">Track Style</span>
                    <CustomSelect
                      ariaLabel="Track Style"
                      value={params.trackStyle}
                      options={[
                        { value: "mixed", label: "Mixed" },
                        { value: "spiral", label: "Spiral" },
                        { value: "plinko", label: "Plinko" },
                        { value: "obstacle", label: "Obstacle" },
                        { value: "elimination", label: "Elimination" },
                        { value: "team", label: "Team vs Team" },
                        { value: "infinite", label: "Infinite Drop" },
                        { value: "duel", label: "1v1 Champion Duel" },
                        { value: "funnel", label: "Multi-Funnel Cyclone" },
                        { value: "pinball", label: "Pinball Gauntlet" },
                        { value: "pyramid", label: "Pyramid Split" },
                      ]}
                      onChange={(v) => onChangeParams({ trackStyle: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA] block">Difficulty</span>
                    <CustomSelect
                      ariaLabel="Track Difficulty"
                      value={params.trackDifficulty}
                      options={[
                        { value: "chill", label: "Chill" },
                        { value: "balanced", label: "Balanced" },
                        { value: "chaotic", label: "Chaotic" },
                      ]}
                      onChange={(v) => onChangeParams({ trackDifficulty: v })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.showLeaderboard}
                      onChange={(e) => onChangeParams({ showLeaderboard: e.target.checked })}
                      className="accent-[#C4FF2E]"
                    />
                    <span className="text-[#F5F5F5]">Leaderboard</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.confettiEnabled}
                      onChange={(e) => onChangeParams({ confettiEnabled: e.target.checked })}
                      className="accent-[#C4FF2E]"
                    />
                    <span className="text-[#F5F5F5]">Confetti</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#A1A1AA]">
                      Participants ({params.marbles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const pool = EXTRA_COUNTRY_MARBLES.find(
                          (ex) => !params.marbles.some((m) => m.id === ex.id)
                        );
                        if (pool) onChangeParams({ marbles: [...params.marbles, pool] });
                      }}
                      className="text-[11px] text-[#C4FF2E] hover:underline"
                    >
                      + Add Country
                    </button>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto panel-scroll pr-1">
                    {params.marbles.map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 bg-[#1B1B1E] border border-[#29292D] rounded px-2 py-1"
                      >
                        <input
                          type="color"
                          value={m.color}
                          onChange={(e) => {
                            const updated = params.marbles.map((item, i) =>
                              i === idx ? { ...item, color: e.target.value } : item
                            );
                            onChangeParams({ marbles: updated });
                          }}
                          className="w-4 h-4 rounded border-0 bg-transparent"
                          aria-label={`Color for ${m.name}`}
                        />
                        <span className="text-xs">{m.flag}</span>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const updated = params.marbles.map((item, i) =>
                              i === idx ? { ...item, name: e.target.value } : item
                            );
                            onChangeParams({ marbles: updated });
                          }}
                          className="flex-1 min-w-0 bg-transparent text-xs text-[#F5F5F5] focus:outline-none"
                          aria-label={`Name for participant ${idx + 1}`}
                        />
                        <button
                          type="button"
                          disabled={params.marbles.length <= 2}
                          onClick={() =>
                            onChangeParams({
                              marbles: params.marbles.filter((_, i) => i !== idx),
                            })
                          }
                          className="text-[#A1A1AA] hover:text-red-400 disabled:opacity-30"
                          aria-label={`Remove ${m.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="color"
                      value={newMarbleColor}
                      onChange={(e) => setNewMarbleColor(e.target.value)}
                      className="w-7 h-7 rounded border border-[#29292D] bg-[#0B0B0C]"
                      aria-label="New marble color"
                    />
                    <input
                      type="text"
                      placeholder="Custom marble name..."
                      value={newMarbleName}
                      onChange={(e) => setNewMarbleName(e.target.value)}
                      className="flex-1 bg-[#0B0B0C] border border-[#29292D] rounded px-2 text-xs text-[#F5F5F5]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = newMarbleName.trim();
                        if (!clean) return;
                        onChangeParams({
                          marbles: [
                            ...params.marbles,
                            {
                              id: `custom-${Date.now()}`,
                              name: clean,
                              flag: "",
                              color: newMarbleColor,
                            },
                          ],
                        });
                        setNewMarbleName("");
                      }}
                      className="px-2.5 py-1 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#C4FF2E] text-xs text-[#F5F5F5]"
                      aria-label="Add custom marble"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {has("press") && (
              <div className="space-y-3 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Hydraulic Press
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA] block">Shape</span>
                    <CustomSelect
                      ariaLabel="Press Object Shape"
                      value={params.pressShape}
                      options={[
                        { value: "cube", label: "Cube" },
                        { value: "sphere", label: "Sphere" },
                        { value: "can", label: "Can" },
                        { value: "pyramid", label: "Pyramid" },
                        { value: "stack", label: "Stack" },
                      ]}
                      onChange={(v) => onChangeParams({ pressShape: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA] block">Material</span>
                    <CustomSelect
                      ariaLabel="Press Material"
                      value={params.pressMaterial}
                      options={[
                        { value: "gel", label: "Soft Gel" },
                        { value: "clay", label: "Clay" },
                        { value: "metal", label: "Metal" },
                        { value: "glass", label: "Glass" },
                        { value: "foam", label: "Foam" },
                        { value: "layered", label: "Layered" },
                      ]}
                      onChange={(v) => onChangeParams({ pressMaterial: v })}
                    />
                  </div>
                </div>
                <SliderRow
                  label="Compression Speed"
                  value={params.pressSpeed}
                  min={0.4}
                  max={2.2}
                  step={0.05}
                  suffix="x"
                  onChange={(v) => onChangeParams({ pressSpeed: v })}
                />
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.fractureEffects}
                    onChange={(e) => onChangeParams({ fractureEffects: e.target.checked })}
                    className="accent-[#C4FF2E]"
                  />
                  <span className="text-[#F5F5F5]">Fracture &amp; Shatter Shards</span>
                </label>
              </div>
            )}

            {has("sand") && (
              <div className="space-y-3 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Kinetic Sand Controls
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <SliderRow
                    label="Flow Rate"
                    value={params.sandFlowSpeed}
                    min={1}
                    max={14}
                    step={1}
                    onChange={(v) => onChangeParams({ sandFlowSpeed: v })}
                  />
                  <SliderRow
                    label="Nozzle Width"
                    value={params.sandNozzleWidth}
                    min={8}
                    max={80}
                    step={2}
                    suffix="px"
                    onChange={(v) => onChangeParams({ sandNozzleWidth: v })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] block">Jar</span>
                    <CustomSelect
                      ariaLabel="Jar Shape"
                      value={params.jarShape}
                      options={[
                        { value: "rectangle", label: "Box" },
                        { value: "hourglass", label: "Hourglass" },
                        { value: "flask", label: "Flask" },
                      ]}
                      onChange={(v) => onChangeParams({ jarShape: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] block">Pegs</span>
                    <CustomSelect
                      ariaLabel="Peg Layout"
                      value={params.pegLayout}
                      options={[
                        { value: "staggered", label: "Staggered" },
                        { value: "grid", label: "Grid" },
                        { value: "funnel", label: "Funnel" },
                        { value: "none", label: "None" },
                      ]}
                      onChange={(v) => onChangeParams({ pegLayout: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] block">Pattern</span>
                    <CustomSelect
                      ariaLabel="Layer Pattern"
                      value={params.sandLayerPattern}
                      options={[
                        { value: "rainbow", label: "Rainbow" },
                        { value: "bands", label: "Bands" },
                        { value: "dual", label: "Dual" },
                      ]}
                      onChange={(v) => onChangeParams({ sandLayerPattern: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {has("space") && (
              <div className="space-y-2.5 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Gravity &amp; Orbital Mechanics
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <SliderRow
                    label="Particles"
                    value={params.particleCount}
                    min={150}
                    max={1100}
                    step={25}
                    onChange={(v) => onChangeParams({ particleCount: v })}
                  />
                  <SliderRow
                    label="Gravity"
                    value={params.gravityStrength}
                    min={0.3}
                    max={2.4}
                    step={0.05}
                    suffix="x"
                    onChange={(v) => onChangeParams({ gravityStrength: v })}
                  />
                  <SliderRow
                    label="Spiral Speed"
                    value={params.spiralSpeed}
                    min={0.2}
                    max={2.8}
                    step={0.05}
                    suffix="x"
                    onChange={(v) => onChangeParams({ spiralSpeed: v })}
                  />
                  <SliderRow
                    label="Orbit Radius"
                    value={params.orbitRadius}
                    min={0.5}
                    max={1.4}
                    step={0.05}
                    suffix="x"
                    onChange={(v) => onChangeParams({ orbitRadius: v })}
                  />
                </div>
                <SliderRow
                  label="Event Horizon Size"
                  value={params.eventHorizonSize}
                  min={0.4}
                  max={2.2}
                  step={0.05}
                  suffix="x"
                  onChange={(v) => onChangeParams({ eventHorizonSize: v })}
                />
              </div>
            )}

            {has("camera3d") && (
              <div className="space-y-2.5 pt-3 border-t border-[#29292D]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C4FF2E]">
                  3D Camera Perspective
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <SliderRow
                    label="Distance"
                    value={params.camera3D.distance}
                    min={4}
                    max={20}
                    step={0.5}
                    onChange={(v) =>
                      onChangeParams({ camera3D: { ...params.camera3D, distance: v } })
                    }
                  />
                  <SliderRow
                    label="Tilt"
                    value={params.camera3D.tilt}
                    min={-1.1}
                    max={1.1}
                    step={0.05}
                    onChange={(v) =>
                      onChangeParams({ camera3D: { ...params.camera3D, tilt: v } })
                    }
                  />
                  <SliderRow
                    label="FOV"
                    value={params.camera3D.fov}
                    min={35}
                    max={85}
                    step={1}
                    suffix="°"
                    onChange={(v) =>
                      onChangeParams({ camera3D: { ...params.camera3D, fov: v } })
                    }
                  />
                  <SliderRow
                    label="Auto Orbit"
                    value={params.camera3D.autoOrbit}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v) =>
                      onChangeParams({ camera3D: { ...params.camera3D, autoOrbit: v } })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VISUALS TAB ==================== */}
        {activeTab === "visuals" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Color Palettes
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_PALETTES.map((pal) => {
                  const active = params.paletteId === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() =>
                        onChangeParams({
                          paletteId: pal.id,
                          colors: pal.isCustom ? params.colors : [...pal.colors],
                          bgColor: pal.isCustom ? params.bgColor : pal.bg,
                        })
                      }
                      className={`p-2 rounded border text-left transition-colors ${
                        active
                          ? "bg-[#1B1B1E] border-[#C4FF2E]"
                          : "bg-[#0B0B0C] border-[#29292D] hover:border-[#3F3F46]"
                      }`}
                    >
                      <div className="text-[11px] font-medium text-[#F5F5F5] mb-1">{pal.name}</div>
                      <div className="flex gap-1">
                        {(pal.isCustom ? params.colors : pal.colors).slice(0, 6).map((c, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-sm border border-white/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#29292D]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#A1A1AA]">BG</span>
                <input
                  type="color"
                  value={params.bgColor}
                  onChange={(e) => onChangeParams({ bgColor: e.target.value, paletteId: "custom" })}
                  className="w-6 h-6 rounded border border-[#29292D] bg-transparent"
                  aria-label="Background Color"
                />
              </div>
              <div className="flex items-center gap-1">
                {params.colors.slice(0, 6).map((c, idx) => (
                  <input
                    key={idx}
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const next = [...params.colors];
                      next[idx] = e.target.value;
                      onChangeParams({ colors: next, paletteId: "custom" });
                    }}
                    className="w-6 h-6 rounded border border-[#29292D] bg-transparent"
                    aria-label={`Color swatch ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#29292D]">
              <div className="space-y-1">
                <span className="text-[11px] text-[#A1A1AA] block">BG Style</span>
                <CustomSelect
                  ariaLabel="Background Style"
                  value={params.bgStyle}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "radial", label: "Radial" },
                    { value: "grid", label: "Grid" },
                    { value: "dots", label: "Dots" },
                  ]}
                  onChange={(v) => onChangeParams({ bgStyle: v })}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-[#A1A1AA] block">Quality</span>
                <CustomSelect
                  ariaLabel="Performance Quality"
                  value={params.performance}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "balanced", label: "Balanced" },
                    { value: "high", label: "High" },
                  ]}
                  onChange={(v) => onChangeParams({ performance: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.neonEffects}
                  onChange={(e) => onChangeParams({ neonEffects: e.target.checked })}
                  className="accent-[#C4FF2E]"
                />
                <span>Glow / Neon</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.particleEffects}
                  onChange={(e) => onChangeParams({ particleEffects: e.target.checked })}
                  className="accent-[#C4FF2E]"
                />
                <span>Impact Sparks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.trailEffects}
                  onChange={(e) => onChangeParams({ trailEffects: e.target.checked })}
                  className="accent-[#C4FF2E]"
                />
                <span>Motion Trails</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.shadows}
                  onChange={(e) => onChangeParams({ shadows: e.target.checked })}
                  className="accent-[#C4FF2E]"
                />
                <span>Soft Lighting</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <SliderRow
                label="Glow"
                value={params.glowIntensity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onChangeParams({ glowIntensity: v })}
              />
              <SliderRow
                label="Trails"
                value={params.trailLength}
                min={0}
                max={40}
                step={2}
                onChange={(v) => onChangeParams({ trailLength: v })}
              />
            </div>
          </div>
        )}

        {/* ==================== AUDIO STUDIO TAB ==================== */}
        {activeTab === "audio" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#F5F5F5]">Synthesized ASMR Audio</span>
              <button
                type="button"
                onClick={() => onChangeAudio({ enabled: !audio.enabled })}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  audio.enabled
                    ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E]"
                    : "bg-[#1B1B1E] text-[#A1A1AA] border-[#29292D]"
                }`}
              >
                {audio.enabled ? "Audio On" : "Muted"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {SOUND_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSoundCategory(cat.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border ${
                    soundCategory === cat.id
                      ? "bg-[#1B1B1E] border-[#C4FF2E] text-[#C4FF2E]"
                      : "bg-[#0B0B0C] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {soundCategory === "ambient" ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {AMBIENT_PRESETS.map((ap) => (
                    <button
                      key={ap.id}
                      type="button"
                      onClick={() => {
                        soundEngine.init();
                        onChangeAudio({ ambientPreset: ap.id as AmbientPresetId });
                      }}
                      className={`py-1.5 px-2.5 rounded text-xs font-medium border text-left ${
                        audio.ambientPreset === ap.id
                          ? "bg-[#1B1B1E] border-[#C4FF2E] text-[#F5F5F5]"
                          : "bg-[#0B0B0C] border-[#29292D] text-[#A1A1AA]"
                      }`}
                    >
                      {ap.label}
                    </button>
                  ))}
                </div>
                <SliderRow
                  label="Ambient Level"
                  value={audio.ambientVolume}
                  min={0}
                  max={0.5}
                  step={0.02}
                  onChange={(v) => onChangeAudio({ ambientVolume: v })}
                />
              </div>
            ) : (
              <div className="space-y-1">
                {SOUND_PRESETS.filter((p) => p.category === soundCategory).map((preset) => {
                  const selected = audio.preset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded border ${
                        selected
                          ? "bg-[#1B1B1E] border-[#C4FF2E]"
                          : "bg-[#0B0B0C] border-[#29292D]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.init();
                          onChangeAudio({ preset: preset.id as SoundPresetId, enabled: true });
                          soundEngine.previewPreset(preset.id);
                        }}
                        className="flex-1 text-left text-xs font-medium text-[#F5F5F5]"
                      >
                        {preset.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => soundEngine.previewPreset(preset.id)}
                        className="p-1 rounded bg-[#141416] border border-[#29292D] hover:border-[#C4FF2E] text-[#A1A1AA] hover:text-[#C4FF2E]"
                        aria-label={`Preview ${preset.label}`}
                        title="Preview sound"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-2.5 border-t border-[#29292D]">
              <SliderRow
                label="Volume"
                value={audio.volume}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => onChangeAudio({ volume: v })}
              />
              <SliderRow
                label="Pitch"
                value={audio.pitch}
                min={0.5}
                max={2.0}
                step={0.05}
                suffix="x"
                onChange={(v) => onChangeAudio({ pitch: v })}
              />
              <SliderRow
                label="Pitch Var."
                value={audio.pitchVariation}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(v) => onChangeAudio({ pitchVariation: v })}
              />
              <SliderRow
                label="Reverb"
                value={audio.reverbMix}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onChangeAudio({ reverbMix: v })}
              />
              <SliderRow
                label="Delay"
                value={audio.delayMix}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onChangeAudio({ delayMix: v })}
              />
              <SliderRow
                label="Stereo Pan"
                value={audio.stereoPanDepth}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onChangeAudio({ stereoPanDepth: v })}
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#A1A1AA] block">Collision Mapping</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["all", "major", "subtle"] as const).map((cm) => (
                  <button
                    key={cm}
                    type="button"
                    onClick={() => onChangeAudio({ collisionMode: cm })}
                    className={`py-1 rounded text-xs font-medium capitalize border ${
                      audio.collisionMode === cm
                        ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E]"
                        : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA]"
                    }`}
                  >
                    {cm}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TEXT OVERLAYS TAB ==================== */}
        {activeTab === "overlays" && (
          <div className="space-y-4">
            {(["top", "bottom"] as const).map((slot) => {
              const layer = overlays[slot];
              const updateLayer = (patch: Partial<typeof layer>) => {
                onChangeOverlays({
                  ...overlays,
                  [slot]: { ...layer, ...patch },
                });
              };
              return (
                <div key={slot} className="space-y-2.5 pb-3 border-b border-[#29292D] last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                      {slot === "top" ? "Top Hook" : "Bottom CTA"}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layer.shadow}
                          onChange={(e) => updateLayer({ shadow: e.target.checked })}
                          className="accent-[#C4FF2E]"
                        />
                        <span className="text-[#A1A1AA]">Shadow</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layer.enabled}
                          onChange={(e) => updateLayer({ enabled: e.target.checked })}
                          className="accent-[#C4FF2E]"
                        />
                        <span className="text-[#F5F5F5]">Show</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={layer.text}
                      onChange={(e) => updateLayer({ text: e.target.value })}
                      placeholder={slot === "top" ? "Wait for the end 😱" : "Relaxing ASMR 🎧"}
                      className="flex-1 bg-[#0B0B0C] border border-[#29292D] rounded px-2.5 py-1.5 text-xs text-[#F5F5F5]"
                    />
                    <input
                      type="color"
                      value={layer.color}
                      onChange={(e) => updateLayer({ color: e.target.value })}
                      className="w-7 h-7 rounded border border-[#29292D] bg-transparent shrink-0"
                      aria-label={`${slot} caption color`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <CustomSelect
                      ariaLabel={`${slot} Font`}
                      value={layer.font}
                      options={[
                        { value: "Inter", label: "Inter" },
                        { value: "Impact", label: "Bold" },
                        { value: "Mono", label: "Mono" },
                        { value: "Georgia", label: "Serif" },
                      ]}
                      onChange={(v) => updateLayer({ font: v as OverlayFont })}
                    />
                    <CustomSelect
                      ariaLabel={`${slot} Background`}
                      value={layer.background}
                      options={[
                        { value: "pill", label: "Pill" },
                        { value: "bar", label: "Bar" },
                        { value: "none", label: "None" },
                      ]}
                      onChange={(v) => updateLayer({ background: v as OverlayBackground })}
                    />
                    <CustomSelect
                      ariaLabel={`${slot} Animation`}
                      value={layer.animation}
                      options={[
                        { value: "fade", label: "Fade" },
                        { value: "slide", label: "Slide" },
                        { value: "none", label: "Static" },
                      ]}
                      onChange={(v) => updateLayer({ animation: v as OverlayAnimation })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3">
                    <SliderRow
                      label="Size"
                      value={layer.fontSize}
                      min={20}
                      max={72}
                      step={2}
                      suffix="px"
                      onChange={(v) => updateLayer({ fontSize: v })}
                    />
                    <SliderRow
                      label="Y Offset"
                      value={layer.yOffsetPct}
                      min={4}
                      max={95}
                      step={1}
                      suffix="%"
                      onChange={(v) => updateLayer({ yOffsetPct: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== PRESETS TAB ==================== */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Save Current Configuration
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 bg-[#0B0B0C] border border-[#29292D] rounded px-2.5 py-1.5 text-xs text-[#F5F5F5]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (presetName.trim()) onSavePreset(presetName.trim());
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#29292D]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Saved Presets ({savedPresets.length})
              </div>
              {savedPresets.length === 0 ? (
                <div className="p-4 rounded border border-dashed border-[#29292D] text-center text-xs text-[#A1A1AA]">
                  No saved presets yet. Save your physics, colors, and audio settings to reuse them anytime.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {savedPresets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded bg-[#1B1B1E] border border-[#29292D]"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F5F5F5] truncate">{p.name}</div>
                        <div className="text-[11px] text-[#A1A1AA]">
                          {p.gameName} · {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadPreset(p)}
                          className="px-2 py-1 rounded bg-[#141416] border border-[#29292D] hover:border-[#C4FF2E] text-[11px] text-[#F5F5F5]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePreset(p.id)}
                          className="p-1 text-[#A1A1AA] hover:text-red-400"
                          aria-label={`Delete preset ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
