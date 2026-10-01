import { formatText } from './locale';
import { shareChallenge, challengeCard } from './sharing';
import { t, getLocale, campaignHref, useLanguage } from './locale';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Result } from "./engine";
import { CLINICS } from "./clinic-stories";
import { ROAD_REVISION } from "./vehicle";
import {
  online,
  currentPlayer,
  playerDisplayName,
  leaderboardHidden,
  pendingVisibility,
  identity,
  refreshAccount,
  renamePlayer,
  resetLeaderboardName,
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
      <aside className="completion-team" aria-label={t("The real project")}>
        <a
          className="completion-team-photo"
          href={campaignHref("team")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Meet the clinic electrification team (opens in a new tab)")}
        >
          <img
            src="/assets/campaigns/drc-clinics/team/team-portrait.jpg"
            alt={t("Members of the real DRC Health Clinic Electrification Team")}
            width="1280"
            height="960"
          />
        </a>
        <div className="completion-team-copy">
          <span className="eyebrow">{t("THE REAL PROJECT")}</span>
          <a
            className="completion-team-title"
            href={campaignHref("team")}
            target="_blank"
            rel="noopener noreferrer"
          >{t(" Meet the team ")}<span aria-hidden="true">↗</span>
          </a>
          <a
            className="completion-contribute"
            href={campaignHref()}
            target="_blank"
            rel="noopener noreferrer"
          >{t("Contribute $10")}<span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>
    );
  return (
    <aside className="real-project">
      <img
        src="/assets/campaigns/drc-clinics/team/team-portrait.jpg"
        alt={t("Members of the real DRC Health Clinic Electrification Team")}
        loading="lazy"
        width="1280"
        height="960"
      />
      <div>
        <span className="eyebrow">{t("THE REAL PROJECT")}</span>
        <h3>{t("Meet the people bringing the light.")}</h3>
        <p>{t(" Get to know the clinic electrification team and the work that inspired Last Light. ")}</p>
        <div className="community-actions">
          <a
            href={campaignHref("team")}
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              if (beforeLeave && !beforeLeave()) e.preventDefault();
            }}
          >{t(" Meet the team ↗ ")}</a>
          <a
            href={campaignHref()}
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              if (beforeLeave && !beforeLeave()) e.preventDefault();
            }}
          >{t("Contribute $10")}</a>
        </div>
        <small>{t(" Opens in a new tab; your game stays here. Game scores and real-world contributions are separate. ")}</small>
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
    ? { name: playerDisplayName(player), ...best }
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
            {you && <small className="lb-you-tag">{t("YOU")}</small>}
            <small className="lb-mobile-clinics">
              {t(overall ? `${row.chapters} / 5 clinics` : "Full delivery")}
            </small>
          </span>
        </div>
      </td>
      {overall && <td className="lb-clinics">{row.chapters} / 5</td>}
      <td className="lb-points">
        {t(row.score.toLocaleString(getLocale()))} <small>{t("pts")}</small>
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
        <caption className="sr-only">{t("Confirmed player rankings")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("Rank")}</th>
            <th scope="col">{t("Player")}</th>
            {overall && (
              <th scope="col" className="lb-clinics">{t(" Clinics ")}</th>
            )}
            <th scope="col">{t(overall ? "Best total" : "Best score")}</th>
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
          {t(data.total
            ? "No players match this search."
            : "No ranked deliveries here yet. Your first full delivery can open the road.")}
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
    <div className="lb-own" aria-label={t("Your record")}>
      <span className="lb-own-rank">{t(own ? own.rank : "—")}</span>
      <span className="lb-avatar" aria-hidden="true">
        {(playerDisplayName(player))[0]}
      </span>
      <div className="lb-own-copy">
        <strong>
          {playerDisplayName(player)}{t(" ")}
          <small className="lb-you-tag">{t("YOU")}</small>
        </strong>
        <small>
          {t(own ? "Confirmed rank" : label)}
          {t(loading && own ? " · refreshing" : "")}
          {t(latest
            ? ` · Last delivery: ${latest.result.score.toLocaleString(getLocale())} pts`
            : "")}
        </small>
        {own && best && best.score > own.score && (
          <small>{t(" Personal best: ")}{t(best.score.toLocaleString(getLocale()))}{t(" pts · includes unranked history ")}</small>
        )}
      </div>
      {bracket.mission === "all" && (
        <span className="lb-clinics">
          {own?.chapters ?? best?.chapters ?? 0} / 5
        </span>
      )}
      <span className="lb-points">
        {t((own?.score ?? best?.score)?.toLocaleString(getLocale()) || "—")}{t(" ")}
        <small>{t("pts")}</small>
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
    <section className="lb-history" aria-label={t("Your private drive history")}>
      <div className="lb-history-summary">
        <span>{t(" Personal-best total ")}<strong>{t(best.score.toLocaleString(getLocale()))}{t(" pts")}</strong>
          <small>{t("Best score at each clinic · ")}{best.chapters}/5</small>
        </span>
        <span>{t(" Best complete journey")}{t(" ")}
          <strong>
            {t(single ? `${single.toLocaleString(getLocale())} pts` : "Not completed yet")}
          </strong>
          <small>{t("Five clinics in one playthrough")}</small>
        </span>
      </div>
      <label className="lb-history-filter">{t(" Show")}{t(" ")}
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "current" | "all")}
        >
          <option value="current">{t("Current road & difficulty")}</option>
          <option value="all">{t("All my drives · includes older editions")}</option>
        </select>
      </label>
      <p className="lb-history-note">{t(" Every delivery stays here. Replays improve your best only when you score higher. ")}</p>
      {busy && <p role="status">{t("Refreshing your drives…")}</p>}
      {t(error && (
        <p role="status">
          {t(error)} <button onClick={() => void fetchPage()}>{t("Retry")}</button>
        </p>
      ))}
      <ol className="lb-drive-list">
        {records.map((d) => (
          <li key={d.id}>
            <span>
              <strong>{t(CLINICS[d.result.mission].shortName)}</strong>
              <small>
                {t(d.completedAt
                  ? new Date(d.completedAt).toLocaleString(getLocale(), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Earlier personal best")}{t(" ")}
                · {t(d.result.mode)} ·{t(" ")}
                {t(d.result.variant ? "Alternate" : "Original")}{t(" · Edition")}{t(" ")}
                {d.result.revision || 1}
              </small>
              <small>
                {t(d.result.practice
                  ? "Practice · unranked"
                  : d.eligible
                    ? "Verified delivery"
                    : "Personal history · unranked")}{t(" ")}
                ·{t(" ")}
                {t(d.saved
                  ? "Saved to account"
                  : uid
                    ? "Waiting to sync"
                    : "On this device")}
              </small>
            </span>
            <b>
              {t(d.result.score.toLocaleString(getLocale()))} <small>{t("pts")}</small>
            </b>
          </li>
        ))}
      </ol>
      {!records.length && (
        <p className="board-empty">{t("No completed drives in this view yet.")}</p>
      )}
      {t(uid && (!page.loaded || page.cursor) && (
        <button
          disabled={busy}
          onClick={() =>
            void fetchPage(page.owner === uid ? page.cursor : null)
          }
        >
          {t(page.loaded ? "Load earlier drives" : "Refresh history")}
        </button>
      ))}
      <small>{t("Private history is visible only to you.")}</small>
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
  const name = playerDisplayName(community.player),
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
          <span className="eyebrow">{t("LAST LIGHT · THE PLAYERS")}</span>
          <h2 id="leaderboard-title">{t("Leaderboard")}</h2>
          <p>{t("Every delivery counts. Your best stays with you.")}</p>
          <button
            className="board-close"
            onClick={onClose}
            aria-label={t("Close leaderboard")}
          >
            ×
          </button>
        </header>
        <div className="lb-account-strip">
          <span className="lb-avatar" aria-hidden="true">
            {t(name[0])}
          </span>
          <div>
            <strong>{t(name)}</strong>
            <small>
              {t(community.player
                ? "Signed in to your profile"
                : "Playing on this device")}
            </small>
          </div>
          <span className="lb-sync">
            {t(community.player
              ? community.synced && !pending
                ? "✓ Records synced"
                : "○ Sync pending"
              : "Local records")}
            <button
              className="board-link"
              onClick={() => void refreshAccount()}
            >{t(" Refresh ")}</button>
          </span>
        </div>
        <div className="lb-toolbar">
          <div className="lb-tabs" role="group" aria-label={t("Leaderboard view")}>
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
                {t(label)}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="lb-road">{t(" Difficulty and route ")}</label>
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
                  {t(m === "standard" ? "Standard" : "Relaxed")} ·{t(" ")}
                  {t(v ? "Alternate" : "Original")}{t(" route ")}</option>
              )),
            )}
          </select>
          {tab !== "history" && (
            <input
              type="search"
              aria-label={t("Find a player")}
              placeholder={t("Find player")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
            />
          )}
        </div>
        {tab === "clinic" && (
          <label className="lb-clinic-filter">{t(" Clinic")}{t(" ")}
            <select
              value={mission}
              onChange={(e) => {
                setMission(Number(e.target.value));
                reset();
              }}
            >
              {CLINICS.map((c, i) => (
                <option key={c.id} value={i}>
                  {i + 1} · {t(c.shortName)}
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
                  {t(data ? "Refreshing rankings…" : "Connecting to rankings…")}
                </p>
              )}
              {t(error && (
                <p className="lb-status" role="status">
                  {t(error)}{t(" ")}
                  <button className="board-link" onClick={retry}>{t(" Retry rankings ")}</button>
                  {data && updatedAt && (
                    <small>{t(" Last updated")}{t(" ")}
                      {t(new Date(updatedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      }))}
                    </small>
                  )}
                </p>
              ))}
              {data &&
                (expanded ? (
                  <div
                    className="lb-ranked-list"
                    role="region"
                    aria-label={t("Ranked players")}
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
                <div className="lb-shared">{t(" Shared score · ")}{data.featured.name} · #{data.featured.rank} ·{t(" ")}
                  {t(data.featured.score.toLocaleString(getLocale()))}{t(" pts ")}</div>
              )}
            </div>
            <footer className="lb-board-footer">
              <small>
                {t(bracket.mission === "all"
                  ? "Overall adds your personal best at each clinic."
                  : "One best full delivery per player at this clinic.")}
              </small>
              {!expanded ? (
                <button
                  className="board-link"
                  onClick={() => {
                    setExpanded(true);
                    reset();
                  }}
                >{t(" View all ")}{t(data?.total.toLocaleString(getLocale()) || "")}{t(" players → ")}</button>
              ) : (
                <div className="lb-page-controls">
                  <button
                    disabled={pages.length === 1 || loading}
                    onClick={() => setPages((p) => p.slice(0, -1))}
                  >{t(" ← Previous ")}</button>
                  <span>{t("Page ")}{pages.length}</span>
                  <button
                    disabled={!data?.nextCursor || loading}
                    onClick={() => setPages((p) => [...p, data!.nextCursor])}
                  >{t(" Next → ")}</button>
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
          >{t(" Share my score ↗ ")}</button>
        </div>
        {t(shareNotice && (
          <div className="lb-share-notice">
            <p role="status">{t(shareNotice)}</p>
            <label>{t(" Public score link ")}<input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
          </div>
        ))}
        {onPublish && !community.player && (
          <button className="board-link" onClick={onPublish}>{t(" Keep these records across devices · sign in ")}</button>
        )}
        <details className="lb-rules">
          <summary>{t("How scoring works")}</summary>
          <p>{t(" Each clinic keeps your highest verified score. Overall combines those five personal bests; it is not a single playthrough. My drives shows each attempt and your best complete journey. Difficulty, route and road edition stay separate. Tied scores use a stable player order. Practice and unverifiable deliveries remain private and unranked. Edition ")}{ROAD_REVISION}.
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
    <section className="community-board" aria-label={t("Chapter leaderboard")}>
      <div className="community-title">
        <div>
          <span className="eyebrow">{t(" CHAPTER ")}{mission + 1} · {t(mode.toUpperCase())}
          </span>
          <h3>{t("Leading the way")}</h3>
        </div>
        <button ref={trigger} onClick={() => setOpen(true)}>{t(" Leaderboard ↗ ")}</button>
      </div>
      {loading && <p role="status">{t("Refreshing the top five…")}</p>}
      {t(error && (
        <p role="status">
          {t(error)} <button onClick={retry}>{t("Retry")}</button>
        </p>
      ))}
      {data && <Rows data={data} />}
      <small>{t(" Top five · best full deliveries · road edition ")}{ROAD_REVISION}
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
export function InviteFriends({ mission, mode, variant, score, compact = false }: {
  mission: number; mode: string; variant: number; score?: number; compact?: boolean;
}) {
  const language = useLanguage();
  const [notice, setNotice] = useState('');
  const [social, setSocial] = useState<string | null>(null);
  const [card, setCard] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState('');
  useEffect(() => {
    if (!card) { setCardUrl(''); return; }
    const url = URL.createObjectURL(card); setCardUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [card]);
  const [cardError, setCardError] = useState(false);
  const [cardAttempt, setCardAttempt] = useState(0);
  const challenge = shareChallenge(mission, mode, variant, score);
  useEffect(() => {
    let active = true; setCard(null); setCardError(false);
    void challengeCard(mission, score).then(blob => { if(active) setCard(blob); }).catch(() => { if(active) setCardError(true); });
    return () => { active = false; };
  }, [mission, score, language, cardAttempt]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${challenge.text}\n${challenge.url}`); setNotice('Invitation copied. Paste it with the image in your social app.'); }
    catch { setNotice('Copy this link from the field below.'); }
  };
  const download = () => {
    if (!card) return;
    const url = URL.createObjectURL(card), link = document.createElement('a');
    link.href = url; link.download = `last-light-${CLINICS[mission].id}-${language}.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setNotice('Story image downloaded. Add it in your social app, then paste the challenge link.');
  };
  const share = (withCard = false) => {
    const data: ShareData = { title: challenge.title, text: challenge.text, url: challenge.url };
    if (withCard && card) {
      const files = [new File([card], 'last-light-challenge.png', { type: 'image/png' })];
      if (navigator.canShare?.({ files })) data.files = files;
      else { download(); return; }
    }
    void navigator.share(data).catch(e => { if(e?.name !== 'AbortError') setNotice('Sharing is unavailable. Use Copy challenge link.'); });
  };
  return <div className="invite-friends">
    {!compact && <span className="eyebrow">{t('A FRIENDLY CHALLENGE')}</span>}
    <h3>{t('Invite 10 friends')}</h3>
    <p>{t('Bring 10 friends on this journey. They can play as guests or sign in to keep their progress.')}</p>
    <div className="social-share-grid">
      {Object.entries(challenge.links).filter(([name]) => name !== 'Email').map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer">{name} ↗</a>)}
      {['Instagram', 'TikTok'].map(name => <button key={name} aria-expanded={social === name} onClick={() => setSocial(social === name ? null : name)}>{name} ↗</button>)}
    </div>
    {social && <div className="social-story-help" role="region" aria-label={social}>
      <strong>{social}</strong><p>{t('Download the story image, add it in your social app, and paste the challenge link. You choose who receives it.')}</p>
      <div className="community-actions">
        <button onClick={download} disabled={!card}>{t(card ? 'Download story image' : cardError ? 'Image unavailable' : 'Preparing story image…')}</button>
        {cardError && <button onClick={() => setCardAttempt(n => n+1)}>{t('Retry')}</button>}
        {card && typeof navigator.share === 'function' && <button onClick={() => share(true)}>{t('Share image…')}</button>}
        <button onClick={() => void copy()}>{t('Copy invitation')}</button>
      </div>
    </div>}
    <div className="community-actions">
      <button onClick={() => void copy()}>{t('Copy invitation')}</button>
      <button onClick={download} disabled={!card}>{t(card ? 'Download image' : cardError ? 'Image unavailable' : 'Preparing image…')}</button>
      {cardError && <button onClick={() => setCardAttempt(n => n + 1)}>{t('Retry')}</button>}
      {typeof navigator.share === 'function' && <button onClick={() => share(true)} disabled={!card}>{t('Share image')}</button>}
      {typeof navigator.share === 'function' && <button onClick={() => share()}>{t('Share invitation')}</button>}
      <a href={challenge.links.Email}>{t('Email ↗')}</a>
    </div>
    {cardUrl && <img className="share-image-preview" src={cardUrl} alt={t('Share preview')} loading="lazy" />}
    <p className="share-invitation">{challenge.text}</p>
    <label className="share-link-label">{t('Challenge link')}<input readOnly aria-label={t('Challenge link')} value={challenge.url} onFocus={e => e.currentTarget.select()} /></label>
    <small>{t('Inviting is optional. You choose who receives the link.')}</small>
    {notice && <p role="status">{t(notice)}</p>}
  </div>;
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
          ? formatText("Your delivery, {0}.", player.name || t("saved"))
          : t("Keep your journey.")}
      </h3>
      <p>
        {t(record?.published && !leaderboardHidden()
          ? "Your best eligible score is on the leaderboard."
          : record?.saved && player
            ? "This delivery is saved to your account."
            : "This delivery is saved on this device.")}
      </p>
      {!player && (
        <>
          <p>{t('Create a free account to continue to the other four clinics. Verify your email to join the leaderboard.')}</p>
          <div className="community-actions">
            <button
              disabled={status === "loading"}
              onClick={() => onAuth("signup")}
            >{t(" Create an account ")}</button>
            <button
              disabled={status === "loading"}
              onClick={() => onAuth("login")}
            >{t(" Log in ")}</button>
          </div>
        </>
      )}
      {player && !player.verified && (
        <>
          <p>{t(" Your scores are saved privately. Verify your email to appear in the rankings. ")}</p>
          <button onClick={() => onAuth("verify-email")}>{t("Verify email")}</button>
        </>
      )}
      {t(message && <p role="status">{t(message)}</p>)}
      <button className="board-link" onClick={() => void refreshAccount()}>{t(" Retry online saving ")}</button>
    </section>
  );
}
export function PlayerControls() {
  const community = useCommunity(),
    actual = leaderboardHidden(),
    pending = pendingVisibility();
  const publicName = playerDisplayName(community.player);
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
          aria-label={t("Show me on the leaderboard")}
          className="lb-switch"
          disabled={busy || community.status === "loading"}
          onClick={() => run(setLeaderboardVisibility(!(pending ?? actual)))}
        >
          <span />
        </button>
        <div>
          <strong>{t("Show me on the leaderboard")}</strong>
          <small>
            {t(pending !== null
              ? "Visibility change pending · public visibility is not confirmed yet."
              : actual
                ? "Hidden. Your private scores stay saved."
                : `Shown publicly as: ${publicName}`)}
          </small>
        </div>
      </div>
      <div className="lb-name-actions">
        <button
          className="board-link"
          disabled={busy}
          onClick={() => {
            setName(
              community.player?.nameSource === "account" ? "" : publicName,
            );
            setEditing(!editing);
          }}
        >{t(" Change leaderboard name ")}</button>
        {community.player &&
        (community.player.nameSource !== "account") ? (
          <button
            className="board-link"
            disabled={busy}
            onClick={() => run(resetLeaderboardName())}
          >
            {t("Use account name")}
          </button>
        ) : community.player?.nameSource === "account" ? (
          <span>{t("Using account name")}</span>
        ) : null}
      </div>
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(renamePlayer(name));
          }}
        >
          <label>{t(" Leaderboard nickname ")}<input
              required
              minLength={2}
              maxLength={28}
              autoComplete="nickname"
              placeholder={t("Choose a name for the leaderboard")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button disabled={busy}>{t("Save")}</button>
          <button
            type="button"
            className="board-link"
            onClick={() => setEditing(false)}
          >{t(" Cancel ")}</button>
        </form>
      )}
      {editing && (
        <p className="lb-name-help">{t(" This nickname is only for the leaderboard. Your account name stays unchanged. ")}</p>
      )}
      {t(error && (
        <p role="status">
          {t(error)}
          {pending !== null && (
            <button onClick={() => run(setLeaderboardVisibility(pending))}>{t(" Retry visibility change ")}</button>
          )}
        </p>
      ))}
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
        #{data.own.rank}{t(" of ")}{t(data.total.toLocaleString(getLocale()))}
      </span>
    );
  return null;
}
