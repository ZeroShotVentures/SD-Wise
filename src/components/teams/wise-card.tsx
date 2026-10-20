import { Lightbulb, Network } from "lucide-react";
import Link from "next/link";
import { RequestMore } from "@/components/graph/ask-result";
import { SOURCES } from "@/lib/graph/meta";
import type { WiseReply } from "./data";

// Styled like an Adaptive Card, which is how a Teams app replies.
export function WiseCard({ reply }: { reply: WiseReply }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-md border border-[#e0e0e0] bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4">
        {reply.text && (
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
              <Lightbulb className="size-3.5" /> From what you know
            </h3>
            <p className="mt-2 text-sm leading-relaxed">{reply.text}</p>
            {reply.facts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reply.facts.map((fact) => (
                  <span
                    key={fact.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e0e0e0] px-2 py-0.5 text-xs text-[#616161]"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: SOURCES[fact.source].color }}
                    />
                    {fact.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {reply.moreAvailable && <RequestMore question={reply.question} />}

        {!reply.text && !reply.moreAvailable && (
          <p className="text-sm text-[#616161]">
            Nobody in the company brain seems to know this yet. Try other words.
          </p>
        )}
      </div>
      <Link
        href="/graph"
        className="flex items-center justify-center gap-1.5 border-t border-[#e0e0e0] py-2 text-xs font-semibold text-[#5b5fc7] hover:bg-[#f5f5f5]"
      >
        <Network className="size-3.5" /> Open in SD Wise
      </Link>
    </div>
  );
}
