"use client";

import {
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/shell/avatar";

export type Call = { title: string; avatarId: string; video: boolean };

function duration(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function CallOverlay({
  call,
  onEnd,
}: {
  call: Call;
  onEnd: () => void;
}) {
  const [seconds, setSeconds] = useState(-2);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(call.video);
  const [hand, setHand] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const controls = [
    {
      label: muted ? "Unmute" : "Mute",
      plain: !muted,
      icon: muted ? MicOff : Mic,
      toggle: () => setMuted((v) => !v),
    },
    {
      label: camera ? "Turn camera off" : "Turn camera on",
      plain: camera,
      icon: camera ? Video : VideoOff,
      toggle: () => setCamera((v) => !v),
    },
    {
      label: hand ? "Lower hand" : "Raise hand",
      plain: !hand,
      icon: Hand,
      toggle: () => setHand((v) => !v),
    },
    {
      label: sharing ? "Stop sharing" : "Share screen",
      plain: !sharing,
      icon: MonitorUp,
      toggle: () => setSharing((v) => !v),
    },
  ];

  return (
    <div className="animate-fade fixed inset-0 z-40 flex flex-col bg-[#1f1f1f] text-white">
      <header className="flex h-14 items-center justify-between px-5">
        <p className="truncate font-semibold">{call.title}</p>
        <p className="text-sm text-white/70 tabular-nums">
          {seconds < 0 ? "Connecting..." : duration(seconds)}
        </p>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="relative flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-4 rounded-xl bg-[#2b2b2b]">
          <span className={seconds < 0 ? "animate-pulse" : ""}>
            <span className="inline-flex scale-[2.5]">
              <Avatar id={call.avatarId} name={call.title} size="lg" />
            </span>
          </span>
          <p className="mt-10 text-sm text-white/70">
            {seconds < 0
              ? "Calling..."
              : sharing
                ? "You're sharing your screen"
                : "Connected"}
          </p>
          {hand && (
            <span className="absolute top-4 left-4 rounded-md bg-amber-400 px-2 py-1 text-xs font-semibold text-[#242424]">
              ✋ Your hand is raised
            </span>
          )}
          {camera && (
            <span className="absolute right-4 bottom-4 flex h-24 w-40 items-center justify-center rounded-lg bg-[#3a3a3a] text-xs text-white/60">
              Your camera
            </span>
          )}
        </div>
      </div>
      <footer className="flex items-center justify-center gap-3 pb-8">
        {controls.map(({ label, plain, icon: Icon, toggle }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={toggle}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${
              plain
                ? "bg-white/15 hover:bg-white/25"
                : "bg-white text-[#242424]"
            }`}
          >
            <Icon className="size-5" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onEnd}
          className="flex h-12 items-center gap-2 rounded-full bg-[#c4314b] px-5 font-semibold transition-colors hover:bg-[#a52a40]"
        >
          <PhoneOff className="size-5" /> Leave
        </button>
      </footer>
    </div>
  );
}
