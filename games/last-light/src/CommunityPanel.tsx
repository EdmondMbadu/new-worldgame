import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Result } from "./engine";
import { CLINICS } from "./clinic-stories";
import { ROAD_REVISION } from "./vehicle";
import {
  online,
  currentPlayer,
  leaderboardHidden,
  pendingVisibility,
  identity,
  refreshAccount,
  renamePlayer,
  setLeaderboardVisibility,
  useCommunity,
  errorMessage,
  deadline,
} from "./community";
import { challengeUrl, pendingRuns, load, persist } from "./journey";
import {
  bestJourney,
  driveHistory,
  personalBest,
  rememberDrive,
  type DriveRecord,
} from "./records";
import "./community.css";
import "./leaderboard.css";
export type Entry = {
  id: string;
  name: string;
  score: number;
  rank: number;
  chapters: number;
};
export type Board = {
  entries: Entry[];
  own: Entry | null;
  total: number;
  nextCursor: string | null;
  featured?: Entry | null;
};
export type Bracket = {
  mission: number | "all";
  mode: string;
  variant: number;
};
export function RealProjectCard({
  beforeLeave,
  compact = false,
}: {
  beforeLeave?: () => boolean;
  compact?: boolean;
}) {
  if (compact)
    return (
      <aside className="completion-team" aria-label="The real project">
        <a
          className="completion-team-photo"
          href="/campaigns/power-drc-clinics#team"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Meet the clinic electrification team (opens in a new tab)"
        >
          <img
            src="/assets/campaigns/drc-clinics/team/team-portrait.jpg"
            alt="Members of the real DRC Health Clinic Electrification Team"
            width="1280"
            height="960"
          />
        </a>
        <div className="completion-team-copy">
          <span className="eyebrow">THE REAL PROJECT</span>
          <a
            className="completion-team-title"
            href="/campaigns/power-drc-clinics#team"
            target="_blank"
            rel="noopener noreferrer"
          >
            Meet the team <span aria-hidden="true">↗</span>
          </a>
          <a
            className="completion-link"
            href="/campaigns/power-drc-clinics#donate"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support the project <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>
    );
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
type Local = {
  name: string;
  score: number;
  chapters: number;
  saved?: boolean;
} | null;
export function localBest(bracket: Bracket): Local {
  const player = currentPlayer(),
    best = personalBest(
      player?.uid || null,
      bracket.mode,
      bracket.variant,
      ROAD_REVISION,
      bracket.mission,
      player?.best,
    );
  return best.chapters
    ? { name: player?.name || identity().name, ...best }
    : null;
}
function useRecords() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const fn = () => setRevision((n) => n + 1);
    window.addEventListener("last-light:records", fn);
    return () => window.removeEventListener("last-light:records", fn);
  }, []);
  return revision;
}
export function useBoard(
  bracket: Bracket,
  limit: 5 | 20,
  search = "",
  cursor: string | null = null,
) {
  const community = useCommunity(),
    owner = community.player?.uid || "guest";
  const focus =
    typeof location === "undefined"
      ? null
      : new URLSearchParams(location.search).get("player");
  const ownKey = `last-light.own-cache.${JSON.stringify([owner, bracket.mission, bracket.mode, bracket.variant, community.player?.hidden ?? identity().hidden])}`;
  const key = JSON.stringify([
    owner,
    bracket.mission,
    bracket.mode,
    bracket.variant,
    limit,
    search,
    cursor,
    focus,
    community.player?.hidden ?? identity().hidden,
  ]);
  const [answer, setAnswer] = useState<{
      key: string;
      data: Board;
      at: number;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const cached = load<{ key: string; data: Board; at: number } | null>(
    `last-light.board-cache.${owner}`,
    null,
  );
  const current =
    answer?.key === key ? answer : cached?.key === key ? cached : null;
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("last-light:board", refresh);
    return () => window.removeEventListener("last-light:board", refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () => {
        void online<Board>("getLastLightLeaderboard", {
          ...bracket,
          revision: ROAD_REVISION,
          deviceKey: identity().key,
          limit,
          search,
          cursor,
          focus,
        })
          .then((data) => {
            if (active) {
              const value = { key, data, at: Date.now() };
              persist(ownKey, { ...data, entries: [] });
              setAnswer(value);
              persist(`last-light.board-cache.${owner}`, value);
            }
          })
          .catch(() => {
            if (active)
              setError(
                "Live rankings are unavailable. Your personal records are kept.",
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
  }, [key, revision]);
  return {
    data: current?.data || null,
    yourData: current?.data || load<Board | null>(ownKey, null),
    updatedAt: current?.at,
    error,
    loading,
    retry: () => setRevision((n) => n + 1),
  };
}
function PlayerRow({
  row,
  you = false,
  overall = false,
}: {
  row: Entry;
  you?: boolean;
  overall?: boolean;
}) {
  return (
    <tr className={you ? "is-you" : ""}>
      <td className="board-rank">{row.rank}</td>
      <td>
        <div className="lb-person">
          <span className="lb-avatar" aria-hidden="true">
            {row.name[0]}
          </span>
          <span>
            {row.name}
            {you && <small className="lb-you-tag">YOU</small>}
            <small className="lb-mobile-clinics">
              {overall ? `${row.chapters} / 5 clinics` : "Full delivery"}
            </small>
          </span>
        </div>
      </td>
      {overall && <td className="lb-clinics">{row.chapters} / 5</td>}
      <td className="lb-points">
        {row.score.toLocaleString()} <small>pts</small>
      </td>
    </tr>
  );
}
function Rows({
  data,
  overall = false,
}: {
  data: Board;
  overall?: boolean;
  local?: Local;
}) {
  return (
    <>
      <table className="lb-table">
        <caption className="sr-only">Confirmed player rankings</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            {overall && (
              <th scope="col" className="lb-clinics">
                Clinics
              </th>
            )}
            <th scope="col">{overall ? "Best total" : "Best score"}</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((row) => (
            <PlayerRow
              key={row.id}
              row={row}
              overall={overall}
              you={row.id === data.own?.id}
            />
          ))}
        </tbody>
      </table>
      {!data.entries.length && (
        <p className="board-empty">
          {data.total
            ? "No players match this search."
            : "No ranked deliveries here yet. Your first full delivery can open the road."}
        </p>
      )}
    </>
  );
}
function YourRecord({
  bracket,
  data,
  loading,
}: {
  bracket: Bracket;
  data: Board | null;
  loading: boolean;
}) {
  const { player } = useCommunity();
  useRecords();
  const owner = player?.uid || null,
    best = localBest(bracket),
    own = data?.own;
  const records = driveHistory(owner).filter(
    (d) =>
      d.result.mode === bracket.mode &&
      (d.result.variant || 0) === bracket.variant &&
      d.result.revision === ROAD_REVISION &&
      (bracket.mission === "all" || d.result.mission === bracket.mission),
  );
  const latest = records[0],
    pending = pendingRuns().some(
      (p) =>
        p.owner === owner &&
        p.result &&
        !p.result.practice &&
        p.ticket &&
        !p.saved &&
        !p.rejected,
    );
  const label =
    pendingVisibility() !== null
      ? "Visibility change pending"
      : leaderboardHidden()
        ? "Private · only you can see this"
        : player && !player.verified
          ? "Verify email to rank"
          : pending
            ? "Waiting to sync"
            : best
              ? "Personal record · not ranked"
              : "No delivery here yet";
  return (
    <div className="lb-own" aria-label="Your record">
      <span className="lb-own-rank">{own ? own.rank : "—"}</span>
      <span className="lb-avatar" aria-hidden="true">
        {(player?.name || identity().name)[0]}
      </span>
      <div className="lb-own-copy">
        <strong>
          {player?.name || identity().name}{" "}
          <small className="lb-you-tag">YOU</small>
        </strong>
        <small>
          {own ? "Confirmed rank" : label}
          {loading && own ? " · refreshing" : ""}
          {latest
            ? ` · Last delivery: ${latest.result.score.toLocaleString()} pts`
            : ""}
        </small>
        {own && best && best.score > own.score && (
          <small>
            Personal best: {best.score.toLocaleString()} pts · includes unranked
            history
          </small>
        )}
      </div>
      {bracket.mission === "all" && (
        <span className="lb-clinics">
          {own?.chapters ?? best?.chapters ?? 0} / 5
        </span>
      )}
      <span className="lb-points">
        {(own?.score ?? best?.score)?.toLocaleString() || "—"}{" "}
        <small>pts</small>
      </span>
    </div>
  );
}
function MyDrives({ bracket }: { bracket: Bracket }) {
  const { player } = useCommunity();
  useRecords();
  const uid = player?.uid || null,
    [page, setPage] = useState<{
      owner: string | null;
      cursor: string | null;
      loaded: boolean;
    }>({ owner: uid, cursor: null, loaded: false }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [scope, setScope] = useState<"current" | "all">("current");
  const fetchPage = async (cursor: string | null = null) => {
    if (!uid) return;
    setBusy(true);
    setError("");
    try {
      const p = await online<{
        drives: DriveRecord[];
        nextCursor: string | null;
      }>("getLastLightDrives", { accountUid: uid, cursor });
      if (currentPlayer()?.uid !== uid) return;
      p.drives.forEach((d) => rememberDrive({ ...d, owner: uid, saved: true }));
      setPage({ owner: uid, cursor: p.nextCursor, loaded: true });
    } catch {
      setError("History could not refresh. Saved local drives are shown.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setPage({ owner: uid, cursor: null, loaded: false });
    void fetchPage();
  }, [uid]);
  const records = driveHistory(uid).filter(
    (d) =>
      scope === "all" ||
      (d.result.revision === ROAD_REVISION &&
        d.result.mode === bracket.mode &&
        (d.result.variant || 0) === bracket.variant),
  );
  const best = personalBest(
      uid,
      bracket.mode,
      bracket.variant,
      ROAD_REVISION,
      "all",
      player?.best,
    ),
    single = Math.max(
      bestJourney(uid, bracket.mode, bracket.variant, ROAD_REVISION),
      player?.bestJourneys?.[
        `r${ROAD_REVISION}-v${bracket.variant}-${bracket.mode}-all`
      ]?.score || 0,
    );
  return (
    <section className="lb-history" aria-label="Your private drive history">
      <div className="lb-history-summary">
        <span>
          Personal-best total <strong>{best.score.toLocaleString()} pts</strong>
          <small>Best score at each clinic · {best.chapters}/5</small>
        </span>
        <span>
          Best complete journey{" "}
          <strong>
            {single ? `${single.toLocaleString()} pts` : "Not completed yet"}
          </strong>
          <small>Five clinics in one playthrough</small>
        </span>
      </div>
      <label className="lb-history-filter">
        Show{" "}
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "current" | "all")}
        >
          <option value="current">Current road & difficulty</option>
          <option value="all">All my drives · includes older editions</option>
        </select>
      </label>
      <p className="lb-history-note">
        Every delivery stays here. Replays improve your best only when you score
        higher.
      </p>
      {busy && <p role="status">Refreshing your drives…</p>}
      {error && (
        <p role="status">
          {error} <button onClick={() => void fetchPage()}>Retry</button>
        </p>
      )}
      <ol className="lb-drive-list">
        {records.map((d) => (
          <li key={d.id}>
            <span>
              <strong>{CLINICS[d.result.mission].shortName}</strong>
              <small>
                {d.completedAt
                  ? new Date(d.completedAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Earlier personal best"}{" "}
                · {d.result.mode} ·{" "}
                {d.result.variant ? "Alternate" : "Original"} · Edition{" "}
                {d.result.revision || 1}
              </small>
              <small>
                {d.result.practice
                  ? "Practice · unranked"
                  : d.eligible
                    ? "Verified delivery"
                    : "Personal history · unranked"}{" "}
                ·{" "}
                {d.saved
                  ? "Saved to account"
                  : uid
                    ? "Waiting to sync"
                    : "On this device"}
              </small>
            </span>
            <b>
              {d.result.score.toLocaleString()} <small>pts</small>
            </b>
          </li>
        ))}
      </ol>
      {!records.length && (
        <p className="board-empty">No completed drives in this view yet.</p>
      )}
      {uid && (!page.loaded || page.cursor) && (
        <button
          disabled={busy}
          onClick={() =>
            void fetchPage(page.owner === uid ? page.cursor : null)
          }
        >
          {page.loaded ? "Load earlier drives" : "Refresh history"}
        </button>
      )}
      <small>Private history is visible only to you.</small>
    </section>
  );
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
  const dialog = useRef<HTMLDialogElement>(null),
    community = useCommunity();
  useRecords();
  const [tab, setTab] = useState<"all" | "clinic" | "history">(() =>
      new URLSearchParams(location.search).get("leaderboard") === "1" &&
      typeof initial.mission === "number"
        ? "clinic"
        : "all",
    ),
    [mode, setMode] = useState(initial.mode),
    [variant, setVariant] = useState(initial.variant),
    [mission, setMission] = useState(
      typeof initial.mission === "number" ? initial.mission : 0,
    ),
    [search, setSearch] = useState(""),
    [pages, setPages] = useState<(string | null)[]>([null]),
    [expanded, setExpanded] = useState(false),
    [shareNotice, setShareNotice] = useState(""),
    [shareUrl, setShareUrl] = useState("");
  const bracket: Bracket = {
      mission: tab === "clinic" ? mission : "all",
      mode,
      variant,
    },
    { data, yourData, error, loading, retry, updatedAt } = useBoard(
      bracket,
      expanded ? 20 : 5,
      search,
      pages.at(-1),
    );
  const name = community.player?.name || identity().name,
    pending = driveHistory(community.player?.uid || null).some((d) => !d.saved),
    reset = () => setPages([null]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      previous?.focus?.();
    };
  }, []);
  const share = async () => {
    const id = yourData?.own?.id;
    if (!id) return;
    const url = `${location.origin}/games/last-light/?${new URLSearchParams({ leaderboard: "1", player: id, chapter: String(bracket.mission), mode, variant: String(variant), revision: String(ROAD_REVISION) })}`;
    setShareUrl(url);
    setShareNotice("Copy this public link to share your score.");
    try {
      await deadline(navigator.clipboard.writeText(url), 2000);
      setShareNotice("Your public score link is copied.");
    } catch {
      // The selectable link is already available if clipboard access is denied.
    }
  };
  return createPortal(
    <dialog
      ref={dialog}
      className="leaderboard-dialog lb-dialog"
      aria-labelledby="leaderboard-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lb-shell">
        <header className="lb-heading">
          <span className="eyebrow">LAST LIGHT · THE PLAYERS</span>
          <h2 id="leaderboard-title">Leaderboard</h2>
          <p>Every delivery counts. Your best stays with you.</p>
          <button
            className="board-close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            ×
          </button>
        </header>
        <div className="lb-account-strip">
          <span className="lb-avatar" aria-hidden="true">
            {name[0]}
          </span>
          <div>
            <strong>{name}</strong>
            <small>
              {community.player
                ? "Signed in to your profile"
                : "Playing on this device"}
            </small>
          </div>
          <span className="lb-sync">
            {community.player
              ? community.synced && !pending
                ? "✓ Records synced"
                : "○ Sync pending"
              : "Local records"}
            <button
              className="board-link"
              onClick={() => void refreshAccount()}
            >
              Refresh
            </button>
          </span>
        </div>
        <div className="lb-toolbar">
          <div className="lb-tabs" role="group" aria-label="Leaderboard view">
            {(
              [
                ["all", "Overall"],
                ["clinic", "This clinic"],
                ["history", "My drives"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  reset();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="lb-road">
            Difficulty and route
          </label>
          <select
            id="lb-road"
            value={`${mode}:${variant}`}
            onChange={(e) => {
              const [m, v] = e.target.value.split(":");
              setMode(m);
              setVariant(Number(v));
              reset();
            }}
          >
            {["standard", "relaxed"].flatMap((m) =>
              [0, 1].map((v) => (
                <option key={`${m}:${v}`} value={`${m}:${v}`}>
                  {m === "standard" ? "Standard" : "Relaxed"} ·{" "}
                  {v ? "Alternate" : "Original"} route
                </option>
              )),
            )}
          </select>
          {tab !== "history" && (
            <input
              type="search"
              aria-label="Find a player"
              placeholder="Find player"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
            />
          )}
        </div>
        {tab === "clinic" && (
          <label className="lb-clinic-filter">
            Clinic{" "}
            <select
              value={mission}
              onChange={(e) => {
                setMission(Number(e.target.value));
                reset();
              }}
            >
              {CLINICS.map((c, i) => (
                <option key={c.id} value={i}>
                  {i + 1} · {c.shortName}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "history" ? (
          <MyDrives bracket={bracket} />
        ) : (
          <>
            <div className="lb-results" aria-busy={loading}>
              {loading && (
                <p className="lb-status" role="status">
                  {data ? "Refreshing rankings…" : "Connecting to rankings…"}
                </p>
              )}
              {error && (
                <p className="lb-status" role="status">
                  {error}{" "}
                  <button className="board-link" onClick={retry}>
                    Retry rankings
                  </button>
                  {data && updatedAt && (
                    <small>
                      Last updated{" "}
                      {new Date(updatedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </small>
                  )}
                </p>
              )}
              {data &&
                (expanded ? (
                  <div
                    className="lb-ranked-list"
                    role="region"
                    aria-label="Ranked players"
                    tabIndex={0}
                    key={pages[pages.length - 1] || "first"}
                  >
                    <Rows data={data} overall={bracket.mission === "all"} />
                  </div>
                ) : (
                  <Rows data={data} overall={bracket.mission === "all"} />
                ))}
              <YourRecord bracket={bracket} data={yourData} loading={loading} />
              {data?.featured && data.featured.id !== data.own?.id && (
                <div className="lb-shared">
                  Shared score · {data.featured.name} · #{data.featured.rank} ·{" "}
                  {data.featured.score.toLocaleString()} pts
                </div>
              )}
            </div>
            <footer className="lb-board-footer">
              <small>
                {bracket.mission === "all"
                  ? "Overall adds your personal best at each clinic."
                  : "One best full delivery per player at this clinic."}
              </small>
              {!expanded ? (
                <button
                  className="board-link"
                  onClick={() => {
                    setExpanded(true);
                    reset();
                  }}
                >
                  View all {data?.total.toLocaleString() || ""} players →
                </button>
              ) : (
                <div className="lb-page-controls">
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
                </div>
              )}
            </footer>
          </>
        )}
        <div className="lb-bottom">
          <PlayerControls />
          <button
            className="lb-share"
            disabled={
              !yourData?.own ||
              leaderboardHidden() ||
              pendingVisibility() === true
            }
            onClick={() => void share()}
          >
            Share my score ↗
          </button>
        </div>
        {shareNotice && (
          <div className="lb-share-notice">
            <p role="status">{shareNotice}</p>
            <label>
              Public score link
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
          </div>
        )}
        {onPublish && !community.player && (
          <button className="board-link" onClick={onPublish}>
            Keep these records across devices · sign in
          </button>
        )}
        <details className="lb-rules">
          <summary>How scoring works</summary>
          <p>
            Each clinic keeps your highest verified score. Overall combines
            those five personal bests; it is not a single playthrough. My drives
            shows each attempt and your best complete journey. Difficulty, route
            and road edition stay separate. Tied scores use a stable player
            order. Practice and unverifiable deliveries remain private and
            unranked. Edition {ROAD_REVISION}.
          </p>
        </details>
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
  const [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null);
  return (
    <section className="community-board" aria-label="Chapter leaderboard">
      <div className="community-title">
        <div>
          <span className="eyebrow">
            CHAPTER {mission + 1} · {mode.toUpperCase()}
          </span>
          <h3>Leading the way</h3>
        </div>
        <button ref={trigger} onClick={() => setOpen(true)}>
          Leaderboard ↗
        </button>
      </div>
      {loading && <p role="status">Refreshing the top five…</p>}
      {error && (
        <p role="status">
          {error} <button onClick={retry}>Retry</button>
        </p>
      )}
      {data && <Rows data={data} />}
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
      {!compact && (
        <>
          <span className="eyebrow">A FRIENDLY CHALLENGE</span>
          <h3>Who would you bring along?</h3>
        </>
      )}
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
  const { status, player, message } = useCommunity();
  useRecords();
  const record = driveHistory(player?.uid || null).find(
    (d) =>
      d.result.mission === result.mission &&
      d.result.score === result.score &&
      d.result.remaining === result.remaining,
  );
  return (
    <section className="community-account">
      <h3>
        {player
          ? `Your delivery, ${player.name || "saved"}.`
          : "Keep your journey."}
      </h3>
      <p>
        {record?.published && !leaderboardHidden()
          ? "Your best eligible score is on the leaderboard."
          : record?.saved && player
            ? "This delivery is saved to your account."
            : "This delivery is saved on this device."}
      </p>
      {!player && (
        <>
          <p>
            Sign in to keep your scores and unfinished journey across devices.
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
        </>
      )}
      {player && !player.verified && (
        <>
          <p>
            Your scores are saved privately. Verify your email to appear in the
            rankings.
          </p>
          <button onClick={() => onAuth("verify-email")}>Verify email</button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <button className="board-link" onClick={() => void refreshAccount()}>
        Retry online saving
      </button>
    </section>
  );
}
export function PlayerControls() {
  const community = useCommunity(),
    actual = leaderboardHidden(),
    pending = pendingVisibility();
  const publicName = community.player?.name || identity().name;
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(publicName),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = (task: Promise<unknown>) => {
    setBusy(true);
    setError("");
    void task
      .then(() => setEditing(false))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="board-player lb-privacy">
      <div className="lb-visibility-row">
        <button
          role="switch"
          aria-checked={!(pending ?? actual)}
          aria-label="Show me on the leaderboard"
          className="lb-switch"
          disabled={busy || community.status === "loading"}
          onClick={() => run(setLeaderboardVisibility(!(pending ?? actual)))}
        >
          <span />
        </button>
        <div>
          <strong>Show me on the leaderboard</strong>
          <small>
            {pending !== null
              ? "Visibility change pending · public visibility is not confirmed yet."
              : actual
                ? "Hidden. Your private scores stay saved."
                : "Public player name and eligible scores only. Hide anytime."}
          </small>
        </div>
      </div>
      <button
        className="board-link lb-rename"
        onClick={() => {
          setName(publicName);
          setEditing(!editing);
        }}
      >
        Edit public name
      </button>
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(renamePlayer(name));
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
            />
          </label>
          <button disabled={busy}>Save</button>
          <button
            type="button"
            className="board-link"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {error && (
        <p role="status">
          {error}
          {pending !== null && (
            <button onClick={() => run(setLeaderboardVisibility(pending))}>
              Retry visibility change
            </button>
          )}
        </p>
      )}
    </div>
  );
}
export function YourRank({
  mission,
  mode,
  variant,
  practice = false,
}: {
  mission: number;
  mode: string;
  variant: number;
  practice?: boolean;
}) {
  const { data } = useBoard({ mission, mode, variant }, 5);
  if (practice || leaderboardHidden()) return null;
  if (data?.own)
    return (
      <span className="completion-rank">
        #{data.own.rank} of {data.total.toLocaleString()}
      </span>
    );
  return null;
}
