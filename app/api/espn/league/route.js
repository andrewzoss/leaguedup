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
  };
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
    const { pts, proj } = getPlayerStatsForWeek(player, week);
    const realPos = POSITION_MAP[player.defaultPositionId] || "FLX";
    const proTeam = PRO_TEAM_MAP[player.proTeamId] || null;
    const slotLabel = LINEUP_SLOT_MAP[entry.lineupSlotId];
    const row = {
      pos: slotLabel || realPos,
      name: player.fullName,
      pts,
      proj,
      team: proTeam,
      status: pts > 0 ? "live" : "pre", // placeholder, corrected client-side against the real NFL schedule
    };
    if (row.pos === "FLX") row.realPos = realPos;
    if (slotLabel) starters.push(row);
    else bench.push(row);
  });

  const total = +starters.reduce((s, p) => s + p.pts, 0).toFixed(1);
  return { team: teamName, record, total, starters, bench };
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
    const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam&view=mMatchupScore&scoringPeriodId=${week}`;
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
