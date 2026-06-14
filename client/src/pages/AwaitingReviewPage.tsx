// v6.69 Phase 8 — Awaiting Review surface.
//
// Lists every scene across the user's projects whose approvalStatus is
// "pending_review" so reviewers don't have to drill into each project to find
// their queue. Pure read.

import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function AwaitingReviewPage() {
  const q = trpc.review.listAwaiting.useQuery();
  const items: any[] = (q.data as any) ?? [];
  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1 text-gold-shimmer">Awaiting your review</h1>
      <p className="text-sm text-zinc-400 mb-4">
        Scenes across all of your projects that are ready for review. Open a
        scene to approve or send it back with notes.
      </p>
      {q.isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : q.error ? (
        <div className="text-sm text-rose-300">{q.error.message}</div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900/60 border border-amber-500/20 rounded p-6 text-center text-sm text-zinc-400">
          You're all caught up. Nothing is waiting for review.
        </div>
      ) : (
        <ul className="bg-zinc-900/60 border border-amber-500/20 rounded divide-y divide-zinc-800">
          {items.map((it) => (
            <li key={it.id} className="p-3 hover:bg-amber-500/10">
              <Link href={`/projects/${it.projectId}/scenes`}>
                <a className="block">
                  <div className="text-xs text-zinc-500">
                    {it.projectTitle ?? `Project #${it.projectId}`} · Scene {it.sceneNumber ?? it.id}
                  </div>
                  <div className="text-sm text-zinc-100 font-medium truncate">
                    {it.title ?? "Untitled scene"}
                  </div>
                  {it.description && (
                    <div className="text-xs text-zinc-400 line-clamp-2">{it.description}</div>
                  )}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
        </div>
  </div>
  );
}
