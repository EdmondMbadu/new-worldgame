// Dev-only fixture. Never included by the production build; only demo emulator auth.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { api, useCommunity } from "../src/community";
import { checkpointHref } from "../src/journey";
import { freshSave, recordResult } from "../src/save";
import { MISSIONS } from "../src/missions";
import {
  Leaderboard,
  InviteFriends,
  RealProjectCard,
} from "../src/CommunityPanel";
import { ROAD_REVISION } from "../src/vehicle";
import "../src/style.css";
function QA() {
  const [chapter, setChapter] = useState(0),
    [error, setError] = useState(""),
    [narrow, setNarrow] = useState(false);
  const community = useCommunity();
  const emulator =
    import.meta.env.DEV && import.meta.env.VITE_LAST_LIGHT_EMULATORS === "1";
  const login = async () => {
    try {
      const a = await api();
      if (!emulator || !a.auth.emulatorConfig)
        throw Error("Demo emulator required");
      await signInWithEmailAndPassword(
        a.auth,
        "ui-player@last-light.test",
        "Emulator-only-pass-42",
      );
    } catch (e) {
      setError(String(e));
    }
  };
  const ending = () => {
    const result = {
      mission: chapter,
      mode: "standard" as const,
      variant: 0,
      revision: ROAD_REVISION,
      remaining: MISSIONS[chapter].seconds / 2,
      integrity: 100,
      clean: 5,
      encounters: 5,
      score: 1800,
      stars: 3,
      lives: MISSIONS[chapter].lives,
    };
    const save = recordResult(freshSave(), result);
    save.settings.sound = false;
    const href = checkpointHref({
      mission: chapter,
      variant: 0,
      mode: "standard",
      result,
      owner: community.player?.uid || null,
      save,
    });
    if (href) location.assign(href);
  };
  return (
    <main
      style={{ padding: 25, maxWidth: narrow ? 390 : 1000, margin: "auto" }}
    >
      <h1>Community verification</h1>
      <p>Development fixture · demo accounts only · {community.status}</p>
      <div className="community-actions">
        <label>
          Chapter{" "}
          <select
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
          >
            {MISSIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id + 1} · {m.title}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setNarrow((v) => !v)}>
          Toggle narrow preview
        </button>
        <button disabled={!emulator} onClick={() => void login()}>
          Use demo player
        </button>
        <button
          disabled={!emulator}
          onClick={() => void api().then((a) => signOut(a.auth))}
        >
          Use guest
        </button>
        <button onClick={ending}>Restore completed chapter</button>
      </div>
      {error && <p>{error}</p>}
      <Leaderboard mission={chapter} mode="standard" variant={0} />
      <InviteFriends
        mission={chapter}
        mode="standard"
        variant={0}
        score={1800}
      />
      <RealProjectCard />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<QA />);
