"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Trash2, Play, Film, Bookmark, X, AlertCircle, Sliders } from "lucide-react";
import { downloadVideo } from "@/engine/recorder";
import {
  clearAllCreations,
  deleteCreation,
  deletePreset,
  listCreations,
  listPresets,
} from "@/lib/storage";
import { CreationRecord, SavedPresetRecord } from "@/types/simulation";

export default function CreationsLibrary() {
  const [creations, setCreations] = useState<CreationRecord[]>([]);
  const [presets, setPresets] = useState<SavedPresetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<{ record: CreationRecord; url: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cList, pList] = await Promise.all([listCreations(), listPresets()]);
    setCreations(cList);
    setPresets(pList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (previewItem?.url) URL.revokeObjectURL(previewItem.url);
    };
  }, [previewItem]);

  const openPreview = (rec: CreationRecord) => {
    if (!rec.videoBlob) return;
    if (previewItem?.url) URL.revokeObjectURL(previewItem.url);
    const url = URL.createObjectURL(rec.videoBlob);
    setPreviewItem({ record: rec, url });
  };

  const closePreview = () => {
    if (previewItem?.url) URL.revokeObjectURL(previewItem.url);
    setPreviewItem(null);
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#A1A1AA]">Loading local creations...</div>;
  }

  return (
    <div className="space-y-10">
      {/* Honest Browser Storage Notice */}
      <div className="p-3.5 rounded-lg bg-[#141416] border border-[#29292D] flex items-start gap-3 text-xs text-[#A1A1AA]">
        <AlertCircle className="w-4 h-4 text-[#C4FF2E] shrink-0 mt-0.5" />
        <p>
          Exports and presets are stored strictly in your browser&apos;s local IndexedDB database. Nothing is uploaded to a server. If you clear your browser&apos;s site data or exceed local storage quota, locally cached video files will no longer be recoverable here.
        </p>
      </div>

      {/* Recent Exports */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#C4FF2E]" />
            <h2 className="text-lg font-semibold text-[#F5F5F5]">
              Recent Exports ({creations.length})
            </h2>
          </div>
          {creations.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await clearAllCreations();
                loadData();
              }}
              className="text-xs text-[#A1A1AA] hover:text-red-400 transition-colors"
            >
              Clear export history
            </button>
          )}
        </div>

        {creations.length === 0 ? (
          <div className="p-10 rounded-lg bg-[#141416] border border-dashed border-[#29292D] text-center space-y-3">
            <div className="text-sm font-medium text-[#F5F5F5]">No local video exports yet</div>
            <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
              Open the Video Studio or any simulation player, click Record, and your finished MP4 files will appear here for quick replay and re-download.
            </p>
            <Link
              href="/studio/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold"
            >
              Open Video Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creations.map((c) => (
              <div
                key={c.id}
                className="bg-[#141416] border border-[#29292D] rounded-lg overflow-hidden flex flex-col"
              >
                <div className="relative aspect-video bg-[#0B0B0C] border-b border-[#29292D] flex items-center justify-center overflow-hidden">
                  {c.thumbnailDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailDataUrl}
                      alt={c.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Film className="w-8 h-8 text-[#29292D]" />
                  )}
                  {c.hasVideoBlob && c.videoBlob && (
                    <button
                      type="button"
                      onClick={() => openPreview(c)}
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                      aria-label={`Play ${c.title}`}
                    >
                      <span className="p-3 rounded-full bg-[#C4FF2E] text-[#0B0B0C]">
                        <Play className="w-4 h-4 fill-[#0B0B0C]" />
                      </span>
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[#F5F5F5] truncate">{c.gameName}</div>
                    <div className="text-[11px] font-mono-tabular text-[#A1A1AA]">
                      {c.width}×{c.height} · {c.fps} FPS · {c.durationSeconds}s ·{" "}
                      {(c.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="text-[11px] text-[#A1A1AA]">
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#29292D]">
                    {c.hasVideoBlob && c.videoBlob ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPreview(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] text-xs text-[#F5F5F5]"
                        >
                          <Play className="w-3 h-3" />
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadVideo(c.videoBlob!, `${c.gameId}-${c.width}x${c.height}.${c.ext}`)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#A1A1AA]">
                        Metadata only (file cleared/quota exceeded)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCreation(c.id);
                        loadData();
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-red-400"
                      aria-label={`Delete ${c.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Presets */}
      <section className="space-y-4 pt-6 border-t border-[#29292D]">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#C4FF2E]" />
          <h2 className="text-lg font-semibold text-[#F5F5F5]">
            Saved Simulation Presets ({presets.length})
          </h2>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#141416] border border-dashed border-[#29292D] text-center text-xs text-[#A1A1AA]">
            No custom presets saved yet. Use the Presets tab inside any simulation player or the Studio to save your favorite physics and audio setups.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-lg bg-[#141416] border border-[#29292D] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-[#F5F5F5]">{p.name}</div>
                  <div className="text-xs text-[#A1A1AA] mt-0.5">
                    {p.gameName} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#29292D]">
                  <Link
                    href={`/studio/?game=${p.gameId}&preset=${p.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1B1B1E] hover:border-[#C4FF2E] border border-[#29292D] text-xs font-medium text-[#F5F5F5]"
                  >
                    <Sliders className="w-3 h-3 text-[#C4FF2E]" />
                    <span>Open in Studio</span>
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await deletePreset(p.id);
                      loadData();
                    }}
                    className="p-1.5 text-[#A1A1AA] hover:text-red-400"
                    aria-label={`Delete preset ${p.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Video Playback Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewItem.record.title}`}
        >
          <div className="bg-[#141416] border border-[#29292D] rounded-lg max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#29292D]">
              <span className="text-sm font-semibold text-[#F5F5F5]">{previewItem.record.title}</span>
              <button
                type="button"
                onClick={closePreview}
                className="p-1 text-[#A1A1AA] hover:text-[#F5F5F5]"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#0B0B0C] flex items-center justify-center max-h-[70vh]">
              <video src={previewItem.url} controls autoPlay className="max-h-[70vh] w-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
