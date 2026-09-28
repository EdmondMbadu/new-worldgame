import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Result } from "./engine";
import { CLINICS } from "./clinic-stories";
import { ROAD_REVISION } from "./vehicle";
import {
  api,
  identity,
  joinLeaderboard,
  refreshAccount,
  renamePlayer,
  setLeaderboardVisibility,
  useCommunity,
  errorMessage,
} from "./community";
import { challengeUrl, pendingRuns } from "./journey";
import "./community.css";
type Entry = {
  id: string;
  name: string;
  score: number;
  rank: number;
  chapters: number;
};
type Board = {
  entries: Entry[];
  own: Entry | null;
  total: number;
  nextCursor: string | null;
};
type Bracket = { mission: number | "all"; mode: string; variant: number };
export function RealProjectCard({
  beforeLeave,
  compact = false,
}: {
  beforeLeave?: () => boolean;
  compact?: boolean;
}) {
  if (compact) return <aside className="completion-team" aria-label="The real project">
    <a className="completion-team-photo" href="/campaigns/power-drc-clinics#team" target="_blank" rel="noopener noreferrer" aria-label="Meet the clinic electrification team (opens in a new tab)">
      <img src="/assets/campaigns/drc-clinics/team/team-portrait.jpg" alt="Members of the real DRC Health Clinic Electrification Team" width="1280" height="960" />
    </a>
    <div className="completion-team-copy">
      <span className="eyebrow">THE REAL PROJECT</span>
      <a className="completion-team-title" href="/campaigns/power-drc-clinics#team" target="_blank" rel="noopener noreferrer">Meet the team <span aria-hidden="true">↗</span></a>
      <a className="completion-link" href="/campaigns/power-drc-clinics#donate" target="_blank" rel="noopener noreferrer">Support the project <span aria-hidden="true">↗</span></a>
    </div>
  </aside>;
  return (
    <aside className="real-project">
      <img
        src="/assets/campaigns/drc-clinics/team/team-portrait.jpg"
        alt="Members of the real DRC Health Clinic Electrification Team"
        loading="lazy"
        width="1280"
        height="960"
      />
      <div>
        <span className="eyebrow">THE REAL PROJECT</span>
        <h3>Meet the people bringing the light.</h3>
        <p>
          Get to know the clinic electrification team and the work that inspired
          Last Light.
        </p>
        <div className="community-actions">
          <a
            href="/campaigns/power-drc-clinics#team"
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              if (beforeLeave && !beforeLeave()) e.preventDefault();
            }}
          >
            Meet the team ↗
          </a>
          <a
            href="/campaigns/power-drc-clinics#donate"
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              if (beforeLeave && !beforeLeave()) e.preventDefault();
            }}
          >
            Contribute to the real project ↗
          </a>
        </div>
        <small>
          Opens in a new tab; your game stays here. Game scores and real-world
          contributions are separate.
        </small>
      </div>
    </aside>
  );
}
type Local = { name: string; score: number; chapters: number; saved?: boolean } | null;
/** Your best local result for a board, shown until (or if) the server confirms it. */
export function localBest(bracket: Bracket): Local {
  const me = identity();
  if (me.hidden) return null;
  const best = new Map<number, number>();
  let saved = true;
  for (const p of pendingRuns()) {
    const r = p.result;
    if (!r || p.rejected || r.practice || r.revision !== ROAD_REVISION || r.mode !== bracket.mode || (r.variant || 0) !== bracket.variant) continue;
    if (bracket.mission !== "all" && r.mission !== bracket.mission) continue;
    if (r.score >= (best.get(r.mission) || 0)) saved = saved && !!p.published;
    best.set(r.mission, Math.max(best.get(r.mission) || 0, r.score));
  }
  if (!best.size) return null;
  return { name: me.name, score: [...best.values()].reduce((a, b) => a + b, 0), chapters: best.size, saved };
}
function Rows({ data, overall = false, local = null }: { data: Board; overall?: boolean; local?: Local }) {
  // Until the server has your row, show where your local best would place you.
  const pending = !data.own && local ? local : null;
  const at = pending ? data.entries.filter((e) => e.score >= pending.score).length : -1;
  const rows: (Entry & { pending?: boolean; saved?: boolean })[] = [...data.entries];
  if (pending && (at < data.entries.length || !data.nextCursor))
    rows.splice(at, 0, { id: "local", name: pending.name, score: pending.score, chapters: pending.chapters, rank: (data.entries[at - 1]?.rank ?? 0) + 1, pending: true, saved: pending.saved });
  return (
    <>
      <ol className="leaderboard-rows" aria-label="Player rankings">
        {rows.map((row) => (
          <li key={row.id} className={row.id === data.own?.id || row.pending ? "is-you" : ""}>
            <span className="board-rank" aria-label={`Rank ${row.rank}`}>
              {row.rank <= 3
                ? ["🥇", "🥈", "🥉"][row.rank - 1]
                : `#${row.rank}`}
            </span>
            <span>
              <strong>
                {row.name}
                {(row.id === data.own?.id || row.pending) && <small> YOU</small>}
              </strong>
              {row.pending && <small>{row.saved ? "Saved · refreshing rankings" : "Saving to the leaderboard…"}</small>}
              {overall && <small>{row.chapters}/5 chapters</small>}
            </span>
            <b>
              {row.score.toLocaleString()}
              <small>points</small>
            </b>
          </li>
        ))}
      </ol>
      {data.own && !data.entries.some((e) => e.id === data.own!.id) && (
        <div className="board-own">
          Your rank <strong>#{data.own.rank}</strong>
          <span>{data.own.score.toLocaleString()} points</span>
        </div>
      )}
      {!rows.length && (
        <p className="board-empty">
          {data.total
            ? "No players match this search."
            : "The road is open. Complete a delivery and you’ll appear here automatically."}
        </p>
      )}
    </>
  );
}
function useBoard(
  bracket: Bracket,
  limit: 5 | 20,
  search = "",
  cursor: string | null = null,
) {
  const community = useCommunity();
  const [data, setData] = useState<Board | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((x) => x + 1);
    window.addEventListener("last-light:board", refresh);
    return () => window.removeEventListener("last-light:board", refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    const timer = setTimeout(
      () => {
        void api()
          .then(async (a) => {
            await a.ready;
            return a.call<Board>("getLastLightLeaderboard", {
              ...bracket,
              deviceKey: identity().key,
              revision: ROAD_REVISION,
              limit,
              search,
              cursor,
            });
          })
          .then((value) => {
            if (active) setData(value);
          })
          .catch(() => {
            if (active)
              setError(
                "Rankings are unavailable right now. Your next delivery is ready.",
              );
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    bracket.mission,
    bracket.mode,
    bracket.variant,
    limit,
    search,
    cursor,
    revision,
    community.player?.uid,
  ]);
  return { data, error, loading, retry: () => setRevision((x) => x + 1) };
}
export function LeaderboardDialog({
  initial,
  onClose,
  onPublish,
}: {
  initial: Bracket;
  onClose: () => void;
  onPublish?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [bracket, setBracket] = useState(initial),
    [search, setSearch] = useState(""),
    [pages, setPages] = useState<(string | null)[]>([null]);
  const { data, error, loading, retry } = useBoard(
    bracket,
    20,
    search,
    pages[pages.length - 1],
  );
  const local = search ? null : localBest(bracket);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const change = (value: Partial<Bracket>) => {
    setBracket((b) => ({ ...b, ...value }));
    setPages([null]);
  };
  return createPortal(
    <dialog
      ref={dialog}
      className="leaderboard-dialog"
      aria-labelledby="board-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="board-dialog-content">
        <header>
          <div>
            <span className="eyebrow">LAST LIGHT · THE PLAYERS</span>
            <h2 id="board-title">Leading the way</h2>
          </div>
          <button
            className="board-close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            ×
          </button>
        </header>
        <p>
          One best score per player, per chapter. Overall adds your best scores
          across five chapters. Ties use a stable player order.
        </p>
        <div className="board-filters">
          <label>
            Leaderboard
            <select
              value={bracket.mission}
              onChange={(e) =>
                change({
                  mission:
                    e.target.value === "all" ? "all" : Number(e.target.value),
                })
              }
            >
              <option value="all">Overall · five chapters</option>
              {CLINICS.map((c, i) => (
                <option key={c.id} value={i}>
                  Chapter {i + 1} · {c.shortName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={bracket.mode}
              onChange={(e) => change({ mode: e.target.value })}
            >
              <option value="standard">Standard</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </label>
          <label>
            Route
            <select
              value={bracket.variant}
              onChange={(e) => change({ variant: Number(e.target.value) })}
            >
              <option value={0}>Original</option>
              <option value={1}>Alternate</option>
            </select>
          </label>
        </div>
        <label className="board-search">
          Find a player
          <input
            type="search"
            value={search}
            maxLength={28}
            placeholder="Start typing their player name"
            onChange={(e) => {
              setSearch(e.target.value);
              setPages([null]);
            }}
          />
        </label>
        <div className="board-body" aria-busy={loading}>
          {loading && <p role="status">Loading players…</p>}
          {error && (
            <p role="status">
              {error} <button onClick={retry}>Retry rankings</button>
            </p>
          )}
          {error && local && <Rows data={{ entries: [], own: null, total: 0, nextCursor: null }} local={local} overall={bracket.mission === "all"} />}
          {data && (
            <>
              <p className="board-count">
                {data.total.toLocaleString()} ranked{" "}
                {data.total === 1 ? "player" : "players"} · Road edition{" "}
                {ROAD_REVISION}
              </p>
              <Rows data={data} local={local} overall={bracket.mission === "all"} />
            </>
          )}
        </div>
        <footer className="board-pagination">
          <button
            disabled={pages.length === 1 || loading}
            onClick={() => setPages((p) => p.slice(0, -1))}
          >
            ← Previous
          </button>
          <span>Page {pages.length}</span>
          <button
            disabled={!data?.nextCursor || loading}
            onClick={() => setPages((p) => [...p, data!.nextCursor])}
          >
            Next →
          </button>
        </footer>
        <PlayerControls />
        {onPublish && <button className="board-publish" onClick={onPublish}>Keep your scores across devices</button>}
        <small>
          Every full delivery is ranked automatically under your player name.
          Practice drives and contributions do not affect rankings.
        </small>
      </div>
    </dialog>,
    document.body,
  );
}
export function Leaderboard({
  mission,
  mode,
  variant,
}: {
  mission: number;
  mode: string;
  variant: number;
}) {
  const bracket = { mission, mode, variant },
    { data, error, loading, retry } = useBoard(bracket, 5);
  const local = localBest(bracket);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <section className="community-board" aria-label="Chapter leaderboard">
      <div className="community-title">
        <div>
          <span className="eyebrow">
            CHAPTER {mission + 1} · {mode.toUpperCase()} ·{" "}
            {variant ? "ALTERNATE" : "ORIGINAL"}
          </span>
          <h3>Leading the way</h3>
        </div>
        <button ref={trigger} onClick={() => setOpen(true)}>
          All players ↗
        </button>
      </div>
      {loading && <p role="status">Loading the top five…</p>}
      {error && (
        <p role="status">
          {error} <button onClick={retry}>Retry</button>
        </p>
      )}
      {data && <Rows data={data} local={local} />}
      <small>
        Top five · best full deliveries · road edition {ROAD_REVISION}
      </small>
      {open && (
        <LeaderboardDialog
          initial={bracket}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </section>
  );
}
export function InviteFriends({
  mission,
  mode,
  variant,
  score,
  compact = false,
}: {
  mission: number;
  mode: string;
  variant: number;
  score?: number;
  compact?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const url = challengeUrl(mission, mode, variant),
    text = `Can you bring them the light? ${score ? `I scored ${score.toLocaleString()} points at ${CLINICS[mission].shortName}. ` : ""}Try this Last Light delivery and see how you do.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice("Challenge link copied. Share it with your friends.");
    } catch {
      setNotice("Copy this link from the field below.");
    }
  };
  return (
    <div className="invite-friends">
      {!compact && <><span className="eyebrow">A FRIENDLY CHALLENGE</span><h3>Who would you bring along?</h3></>}
      <p>
        Invite 5–10 friends to try this delivery. They can join the leaderboard
        after signing in and completing a full drive.
      </p>
      <div className="community-actions">
        <button onClick={() => void copy()}>Copy challenge link</button>
        {typeof navigator.share === "function" && (
          <button
            onClick={() =>
              void navigator
                .share({
                  title: "Last Light · a delivery challenge",
                  text,
                  url,
                })
                .catch((e) => {
                  if (e?.name !== "AbortError")
                    setNotice(
                      "Sharing is unavailable. Use Copy challenge link.",
                    );
                })
            }
          >
            Share…
          </button>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp ↗
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent("Can you beat my Last Light delivery?")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`}
        >
          Email ↗
        </a>
      </div>
      <label className="share-link-label">
        Challenge link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <small>Inviting is optional. You choose who receives the link.</small>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
export function CompletionAccount({
  result,
  onAuth,
}: {
  result: Result;
  onAuth: (page: "login" | "signup" | "verify-email") => void;
}) {
  const { status, player, message } = useCommunity(),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const runRecord = pendingRuns().find(
    (p) =>
      p.result?.mission === result.mission &&
      p.result?.mode === result.mode &&
      (p.result?.variant || 0) === (result.variant || 0) &&
      p.result?.score === result.score &&
      p.result?.remaining === result.remaining,
  );
  const offline = !runRecord?.ticket;
  const connectionIssue = /unavailable|Unable|Too many/i.test(error || message);
  return (
    <section className="community-account">
      {!player ? (
        <>
          <span className="eyebrow">KEEP YOUR JOURNEY</span>
          <h3>{identity().hidden ? "Your delivery is saved on this device." : `You’re on the leaderboard as ${identity().name}.`}</h3>
          <p>
            Create an account or log in to keep your scores across devices.
            You’ll return to this completed chapter.
          </p>
          <div className="community-actions">
            <button
              disabled={status === "loading"}
              onClick={() => onAuth("signup")}
            >
              Create an account
            </button>
            <button
              disabled={status === "loading"}
              onClick={() => onAuth("login")}
            >
              Log in
            </button>
          </div>
          <small>Continuing as a guest is always available.</small>
        </>
      ) : !player.verified ? (
        <>
          <h3>{identity().hidden ? "Your chapter is saved." : `You’re on the leaderboard as ${identity().name}.`}</h3>
          <p>
            Verify your email to rank under your account instead. Your
            chapter stays saved here.
          </p>
          <button onClick={() => onAuth("verify-email")}>
            Verify email
          </button>
        </>
      ) : !player.name ? (
        <>
          <h3>Choose your name on the road.</h3>
          <p>
            Your player name and scores will be public. Your email stays
            private.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              void joinLeaderboard(name)
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Public player name
              <input
                required
                minLength={2}
                maxLength={28}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your player name"
              />
            </label>
            <button disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Join the leaderboard"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h3>Welcome back, {player.name}.</h3>
          <p>
            {runRecord?.published
              ? "Your best eligible delivery is on the leaderboard."
              : "Your best full online deliveries count toward your ranking."}
          </p>
        </>
      )}
      {(error || message) && (
        <p role="status">
          {error || message}
          {player && connectionIssue && (
            <button onClick={() => void refreshAccount()}>
              Retry online saving
            </button>
          )}
        </p>
      )}
      {offline && (
        <small>
          This drive began without an online record. Your chapter progress
          is kept; complete a new online delivery to publish a score.
        </small>
      )}
    </section>
  );
}

/** Your public name, with rename and a one-tap opt-out. Nothing is required. */
export function PlayerControls() {
  const community = useCommunity();
  const me = identity();
  const account = community.player?.name && community.player.verified ? community.player.name : null;
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(me.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = (task: Promise<unknown>) => {
    setBusy(true);
    setError("");
    void task
      .then(() => setEditing(false))
      .catch((e) => setError(e instanceof Error && /^Use /.test(e.message) ? e.message : errorMessage(e)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="board-player">
      {me.hidden ? (
        <p>
          You’re hidden from the leaderboard. Your scores stay saved.{" "}
          <button className="board-link" disabled={busy} onClick={() => run(setLeaderboardVisibility(false))}>Show me again</button>
        </p>
      ) : editing && !account ? (
        <form onSubmit={(e) => { e.preventDefault(); run(renamePlayer(name)); }}>
          <label>
            Your public name
            <input value={name} maxLength={28} minLength={2} required autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
          </label>
          <button disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save name"}</button>
          <button type="button" className="board-link" onClick={() => { setEditing(false); setName(me.name); }}>Cancel</button>
        </form>
      ) : (
        <p>
          You appear as <strong>{account || me.name}</strong>.{" "}
          {!account && <button className="board-link" onClick={() => setEditing(true)}>Rename</button>}
          {!account && " · "}
          <button className="board-link" disabled={busy} onClick={() => run(setLeaderboardVisibility(true))}>Hide me from the leaderboard</button>
        </p>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
/** A compact “#3 of 12” for the completion screen. */
export function YourRank({ mission, mode, variant, practice = false }: { mission: number; mode: string; variant: number; practice?: boolean }) {
  const bracket = { mission, mode, variant };
  const { data } = useBoard(bracket, 5);
  if (practice || identity().hidden) return null;
  if (data?.own) return <span className="completion-rank">#{data.own.rank} of {data.total.toLocaleString()}</span>;
  return localBest(bracket) ? <span className="completion-rank completion-rank--pending">Saving to the leaderboard…</span> : null;
}
