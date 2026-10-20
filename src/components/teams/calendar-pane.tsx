"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { useState } from "react";
import type { Call } from "./call-overlay";
import { MEETINGS } from "./data";
import { TeamsAvatar } from "./teams-avatar";
import { IconButton } from "./ui";

const FIRST_HOUR = 8;
const HOURS = Array.from({ length: 10 }, (_, i) => i + FIRST_HOUR);
const ROW = 56;
const START = FIRST_HOUR * 60;

function minutes(time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

export function CalendarPane({
  nameOf,
  onJoin,
}: {
  nameOf: (id: string) => string;
  onJoin: (call: Call) => void;
}) {
  // Only today has meetings; other days show an empty grid.
  const [offset, setOffset] = useState(0);
  const day = new Date();
  day.setDate(day.getDate() + offset);
  const label = day.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e0e0e0] px-3 sm:px-5">
        <CalendarDays className="size-5 text-[#5b5fc7]" />
        <h1 className="mr-2 text-lg font-bold">Calendar</h1>
        <button
          type="button"
          onClick={() => setOffset(0)}
          disabled={offset === 0}
          className="rounded-md border border-[#d1d1d1] px-2.5 py-1 text-sm transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
        >
          Today
        </button>
        <IconButton
          label="Previous day"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton label="Next day" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight className="size-4" />
        </IconButton>
        <span
          suppressHydrationWarning
          className="hidden truncate text-sm font-semibold sm:inline"
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() =>
            onJoin({ title: "Meet now", avatarId: "meet-now", video: true })
          }
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md bg-[#5b5fc7] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f52b2]"
        >
          <Video className="size-4" /> Meet now
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative mx-3 my-4 sm:mx-5"
          style={{ height: HOURS.length * ROW }}
        >
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute inset-x-0 flex border-t border-[#f0f0f0]"
              style={{ top: i * ROW }}
            >
              <span className="-mt-2 w-14 bg-white pr-2 text-right text-xs text-[#616161]">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
          {offset === 0 &&
            MEETINGS.map((m) => {
              const top = ((minutes(m.start) - START) / 60) * ROW;
              const height = Math.max(
                ((minutes(m.end) - minutes(m.start)) / 60) * ROW - 2,
                22,
              );
              return (
                <div
                  key={m.id}
                  className="group absolute right-0 left-16 flex items-center gap-2 overflow-hidden rounded-md border-l-4 border-[#5b5fc7] bg-[#e8ebfa] px-3 text-xs"
                  style={{ top, height }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.title}</p>
                    {height > 30 && (
                      <p className="truncate text-[#616161]">
                        {m.start} – {m.end} · {nameOf(m.organizerId)}
                      </p>
                    )}
                  </div>
                  {height > 40 && (
                    <TeamsAvatar
                      id={m.organizerId}
                      name={nameOf(m.organizerId)}
                      size="sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onJoin({
                        title: m.title,
                        avatarId: m.organizerId,
                        video: true,
                      })
                    }
                    className="shrink-0 rounded-md bg-[#5b5fc7] px-2.5 py-1 font-semibold text-white transition-colors hover:bg-[#4f52b2]"
                  >
                    Join
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
