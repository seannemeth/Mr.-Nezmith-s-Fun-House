// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

// ...keep your existing types...

export default function RecruitingClient(props: Props) {
  // ✅ Defensive defaults so .find/.map never crashes if data hasn't loaded yet
  const anyProps = props as any;

  const recruits: any[] =
    anyProps.recruits ??
    anyProps.rows ??
    anyProps.recruitRows ??
    anyProps.initialRecruits ??
    anyProps.initialRows ??
    [];

  const offers: any[] = anyProps.offers ?? [];
  const pipelines: any[] = anyProps.pipelines ?? [];
  const teams: any[] = anyProps.teams ?? [];

  // If your code uses a `data` object like `state.data.recruits`, guard it too:
  const data = anyProps.data ?? {};
  const safeData = {
    ...data,
    recruits: Array.isArray(data.recruits) ? data.recruits : recruits,
    offers: Array.isArray(data.offers) ? data.offers : offers,
  };

  // ---- keep the rest of your component exactly as-is ----
  // IMPORTANT: wherever your code previously used the possibly-undefined array,
  // switch it to use `recruits` (the safe array) or `safeData.recruits`.
