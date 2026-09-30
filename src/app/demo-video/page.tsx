import type { Metadata } from "next";

export const metadata: Metadata = { title: "Demo" };

const videos = ["/demo/sd-wise-film-julien.mp4", "/demo/sdwise.mp4"] as const;

export default function DemoVideoPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {videos.map((src) => (
          // Marketing films ship without a caption track.
          // oxlint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={src}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-xl bg-navy"
            src={src}
          />
        ))}
      </div>
    </main>
  );
}
