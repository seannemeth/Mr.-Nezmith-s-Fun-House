"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { advanceRecruitingWeekAction } from "./actions";

export default function AdvanceWeekButton({
  leagueId,
}: {
  leagueId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onAdvance() {
    setPending(true);
    setError(null);

    try {
      await advanceRecruitingWeekAction(leagueId);
      // refresh the page so server components re-fetch updated week/interest/commits
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to advance recruiting week.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onAdvance}
        disabled={pending}
        className="px-3 py-2 rounded-md border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Processing..." : "Advance Week"}
      </button>

      {error ? (
        <div className="text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
