// GET /api/espn/league?league_id=...&espn_s2=...&swid=...&week=1&year=2026
//
// ESPN has no public fantasy API and no real login flow for outside apps.
// This uses ESPN's private/internal fantasy endpoint (the same one
// fantasy.espn.com itself calls), authenticated with two cookies
// (espn_s2, SWID) copied out of a real logged-in ESPN browser session via
// the bookmarklet. This is NOT an official/documented API - ESPN could
// change its shape without notice, unlike Sleeper's public API.
//
// Team/position/pro-team ID numbers below are well-established in the
// open-source ESPN fantasy community (every hobby ESPN API wrapper uses the
// same table), but ESPN has never officially published them - worth
// spot-checking against a real roster once this is live.

const PRO_TEAM_MAP = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
  9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN",
  17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC",
  25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};
const POSITION_MAP = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
// Starting lineup slot IDs only - anything else (bench, IR, etc) falls
// through to bench.
const LINEUP_SLOT_MAP = { 0: "QB", 2: "RB", 4: "WR", 6: "TE", 16: "DST", 17: "K", 23: "FLX" };
// Reading order for starters - matches how every other league in the app
// already displays (QB, RBs, WRs, TE, FLEX, DST, K).
const POS_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3, FLX: 4, DST: 5, K: 6 };

function normalizeSwid(v) {
  return decodeURIComponent(v || "")
    .replace(/[{}]/g, "")
    .toLowerCase();
}

function getPlayerStatsForWeek(player, week) {
  const stats = player.stats || [];
  const actual = stats.find((s) => s.scoringPeriodId === Number(week) && s.statSourceId === 0);
  const projected = stats.find((s) => s.scoringPeriodId === Number(week) && s.statSourceId === 1);
  return {
    pts: +(actual?.appliedTotal || 0).toFixed(1),
    // ESPN actually has real weekly projections (statSourceId 1) - unlike
    // Sleeper, this is a genuine projection, not a derived average.
    proj: +(projected?.appliedTotal ?? actual?.appliedTotal ?? 0).toFixed(1),
    rawStats: actual?.stats || null, // numeric-stat-id -> value, e.g. {"3": 250, "4": 2}
  };
}

// ESPN's raw stat breakdown is keyed by numeric stat IDs rather than names.
// These specific numbers are well-established in the open-source ESPN
// fantasy community (same ones espn-api and similar projects use), but like
// everything else in this file, ESPN has never officially published them -
// worth checking against a real box score once this is live. Kickers and
// D/ST use a much less standardized bucket of stat IDs (field goals by
// distance range, points-allowed tiers, etc), so those two positions are
// left on the client's fake fallback rather than risk showing confidently
// wrong real-looking numbers.
const STAT_IDS = { passYds: 3, passTD: 4, passInt: 20, rushYds: 24, rushTD: 25, recYds: 42, recTD: 43, rec: 53, targets: 58 };
// rushYds=24 and rushTD=25 confirmed/adjusted from a real player's raw stat
// object (rushYds matched a real 102-yard game exactly; rushTD is the
// adjacent id following the same attempts(23)->yards(24) pattern, but
// wasn't itself confirmed by a nonzero example yet - worth rechecking
// against a player who actually scored a rushing TD.

function realBoxScore(pos, rawStats) {
  if (!rawStats) return null;
  const num = (id) => Math.round(rawStats[id] || 0);
  if (pos === "QB") {
    return [
      { label: "PASS YDS", value: num(STAT_IDS.passYds) },
      { label: "PASS TD", value: num(STAT_IDS.passTD) },
      { label: "INT", value: num(STAT_IDS.passInt) },
      { label: "RUSH YDS", value: num(STAT_IDS.rushYds) },
      { label: "RUSH TD", value: num(STAT_IDS.rushTD) },
    ];
  }
  if (pos === "RB") {
    return [
      { label: "RUSH YDS", value: num(STAT_IDS.rushYds) },
      { label: "RUSH TD", value: num(STAT_IDS.rushTD) },
      { label: "REC", value: num(STAT_IDS.rec) },
      { label: "REC YDS", value: num(STAT_IDS.recYds) },
      { label: "REC TD", value: num(STAT_IDS.recTD) },
    ];
  }
  if (pos === "WR" || pos === "TE") {
    return [
      { label: "REC", value: num(STAT_IDS.rec) },
      { label: "REC YDS", value: num(STAT_IDS.recYds) },
      { label: "REC TD", value: num(STAT_IDS.recTD) },
      { label: "TARGETS", value: num(STAT_IDS.targets) },
    ];
  }
  return null; // K/DST - see note above
}

// Sleeper's names come through as "F. Last" (first initial + last name).
// ESPN gives full names by default, which breaks Help Me Root's cross-
// platform matching (it compares names as strings to catch the same real
// player rostered on two platforms). This matches ESPN's format to
// Sleeper's so that matching works. Defenses stay as their full team name
// on both platforms, matching what Sleeper already does.
function formatPlayerName(player) {
  if (player.defaultPositionId === 16) return player.fullName; // D/ST - keep full team name
  const last = player.lastName || player.fullName;
  return player.firstName ? `${player.firstName[0]}. ${last}` : last;
}

function buildTeam(team, week) {
  const entries = team.roster?.entries || [];
  const wins = team.record?.overall?.wins ?? 0;
  const losses = team.record?.overall?.losses ?? 0;
  const ties = team.record?.overall?.ties ?? 0;
  const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
  const teamName = team.name || `${team.location || ""} ${team.nickname || ""}`.trim() || "Unnamed Team";

  const starters = [];
  const bench = [];
  entries.forEach((entry) => {
    const player = entry.playerPoolEntry?.player;
    if (!player) return;
    const { pts, proj, rawStats } = getPlayerStatsForWeek(player, week);
    const realPos = POSITION_MAP[player.defaultPositionId] || "FLX";
    const proTeam = PRO_TEAM_MAP[player.proTeamId] || null;
    const slotLabel = LINEUP_SLOT_MAP[entry.lineupSlotId];
    const row = {
      pos: slotLabel || realPos,
      name: formatPlayerName(player),
      pts,
      proj,
      team: proTeam,
      status: pts > 0 ? "live" : "pre", // placeholder, corrected client-side against the real NFL schedule
      boxScore: realBoxScore(realPos, rawStats),
    };
    if (row.pos === "FLX") row.realPos = realPos;
    // TEMPORARY diagnostic: at least one confirmed-wrong stat ID (RB rushing
    // showed 0 for a player who clearly rushed for real yards), so this now
    // surfaces the raw numeric stat object for every position, not just K/
    // DST, until the whole table is verified against real data. Remove once
    // confirmed correct across QB/RB/WR/TE/K/DST.
    if (rawStats) {
      row.debugRawStats = rawStats;
    }
    if (slotLabel) starters.push(row);
    else bench.push(row);
  });

  // ESPN's roster entries come back in whatever order they happen to be
  // stored in, not lineup order, so sort them into the usual QB/RB/WR/TE/
  // FLEX/DST/K reading order ourselves. Sort is stable, so multiple RBs or
  // WRs keep their original relative order.
  const starters2 = [...starters].sort(
    (a, b) => (POS_ORDER[a.pos] ?? 99) - (POS_ORDER[b.pos] ?? 99)
  );

  const total = +starters2.reduce((s, p) => s + p.pts, 0).toFixed(1);
  return { team: teamName, record, total, starters: starters2, bench };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("league_id");
  const espnS2 = searchParams.get("espn_s2");
  const swid = searchParams.get("swid");
  const week = searchParams.get("week");
  const year = searchParams.get("year") || "2026";

  if (!leagueId || !espnS2 || !swid || !week) {
    return Response.json(
      { error: "Requires ?league_id=...&espn_s2=...&swid=...&week=..." },
      { status: 400 }
    );
  }

  try {
    // ESPN moved their read-only fantasy API to this subdomain a while back -
    // the plain fantasy.espn.com host now just serves the regular website
    // (which is exactly the HTML-instead-of-JSON failure this route used to
    // hit).
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam&view=mMatchupScore&view=mSettings&scoringPeriodId=${week}`;
    const res = await fetch(url, {
      headers: {
        Cookie: `SWID=${swid}; espn_s2=${espnS2}`,
        // ESPN's edge/bot-detection can reject requests that don't look like
        // a real browser. A bare server-side fetch with no User-Agent/Accept
        // is a common trigger for that, so these are set explicitly.
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "application/json",
      },
    });

    // Read the body as text first, so a non-JSON response (an HTML block
    // page, a login redirect, etc) produces a clear, specific error instead
    // of an opaque "something went wrong".
    const rawBody = await res.text();
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return Response.json(
        {
          error: `ESPN returned something that wasn't JSON (status ${res.status}). First 200 chars: ${rawBody.slice(
            0,
            200
          )}`,
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const authFailed = res.status === 401 || res.status === 403;
      return Response.json(
        {
          error: authFailed
            ? "ESPN login expired - reconnect with the bookmarklet and try again"
            : `ESPN request failed (status ${res.status}): ${data?.messages?.[0] || JSON.stringify(data).slice(0, 200)}`,
        },
        { status: authFailed ? 401 : 502 }
      );
    }

    const teams = data.teams || [];

    const myTeam = teams.find((t) =>
      (t.owners || []).some((o) => normalizeSwid(o) === normalizeSwid(swid))
    );
    if (!myTeam) {
      return Response.json(
        { error: "Could not find your team in this league - check the league ID" },
        { status: 404 }
      );
    }

    const schedule = data.schedule || [];
    const myMatchup = schedule.find(
      (m) =>
        m.matchupPeriodId === Number(week) &&
        (m.home?.teamId === myTeam.id || m.away?.teamId === myTeam.id)
    );
    if (!myMatchup) {
      return Response.json({ error: "No matchup found for this week yet" }, { status: 404 });
    }
    const oppTeamId = myMatchup.home?.teamId === myTeam.id ? myMatchup.away?.teamId : myMatchup.home?.teamId;
    const oppTeam = teams.find((t) => t.id === oppTeamId);
    if (!oppTeam) {
      return Response.json({ error: "Could not find your opponent's team" }, { status: 404 });
    }

    return Response.json({
      id: `espn-${leagueId}`,
      platform: "espn",
      name: data.settings?.name || `ESPN League ${leagueId}`,
      week: Number(week),
      you: buildTeam(myTeam, week),
      opp: buildTeam(oppTeam, week),
    });
  } catch (err) {
    return Response.json(
      { error: `Something went wrong fetching this ESPN league: ${err.message}` },
      { status: 500 }
    );
  }
}
