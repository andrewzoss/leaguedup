// GET /api/sleeper/league?league_id=...&user_id=...&week=2
//
// Returns one league in the EXACT shape the LeagueUp Scoreboard expects:
//   { id, platform, name, week, you: {...}, opp: {...} }
//
// Real data used here (all from Sleeper's public API, no key needed):
//   - team names, rosters, starters/bench    -> /league/{id}/rosters + /users
//   - this week's live/cumulative points     -> /league/{id}/matchups/{week}
//   - win/loss record                        -> roster.settings
//   - player names/positions                 -> /players/nfl (cached in memory)
//
// KNOWN LIMITATION: Sleeper's public API does not expose player projections
// or real game status (pre-game / in-progress / final). There is no
// legitimate free endpoint for that on Sleeper. Until we wire up a real
// sports-data source for schedule/projections, this route fills those two
// fields in with a placeholder (see fillPlaceholderProjAndStatus below) so
// the UI doesn't break, not real numbers. Treat every "proj" and "status"
// value from this route as fake until that's built.

const PLAYERS_CACHE = { data: null, fetchedAt: 0 };
const PLAYERS_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

async function getPlayersMap() {
  const isStale = Date.now() - PLAYERS_CACHE.fetchedAt > PLAYERS_CACHE_TTL_MS;
  if (!PLAYERS_CACHE.data || isStale) {
    const res = await fetch("https://api.sleeper.app/v1/players/nfl");
    if (!res.ok) throw new Error("Failed to fetch Sleeper player list");
    PLAYERS_CACHE.data = await res.json();
    PLAYERS_CACHE.fetchedAt = Date.now();
  }
  return PLAYERS_CACHE.data;
  // NOTE: this only helps while a serverless instance stays warm. For real
  // production caching across cold starts, move this into Upstash Redis
  // instead of a module-level variable.
}

// Sleeper's roster_positions array uses codes like QB/RB/WR/TE/FLEX/SUPER_FLEX/DEF/K/BN.
// Map them to the same short labels the UI already uses.
function slotLabel(sleeperSlot) {
  const map = { DEF: "DST", FLEX: "FLX", SUPER_FLEX: "FLX", BN: "BN" };
  return map[sleeperSlot] || sleeperSlot;
}

// Sleeper has no "proj" or live/final status field. This is a placeholder,
// not real data - swap this out once a real schedule/projections source
// is wired in.
function fillPlaceholderProjAndStatus(pts) {
  return {
    proj: pts, // fake: just mirrors current points until real projections exist
    status: pts > 0 ? "live" : "pre", // fake: can't tell "final" from Sleeper alone
  };
}

function buildTeam({ roster, matchup, users, playersMap, rosterPositions }) {
  const owner = users.find((u) => u.user_id === roster.owner_id);
  const teamName = owner?.metadata?.team_name || owner?.display_name || "Unnamed Team";
  const wins = roster.settings?.wins ?? 0;
  const losses = roster.settings?.losses ?? 0;
  const ties = roster.settings?.ties ?? 0;
  const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

  const pointsMap = matchup?.players_points || {};
  const starterIds = matchup?.starters || [];

  function playerRow(playerId, slot) {
    const p = playersMap[playerId];
    const name = p ? `${p.first_name?.[0] ? p.first_name[0] + ". " : ""}${p.last_name || p.full_name || playerId}` : playerId;
    const realPos = p?.position;
    const pts = +(pointsMap[playerId] || 0).toFixed(1);
    const label = slotLabel(slot);
    const row = { pos: label, name, pts, team: p?.team, ...fillPlaceholderProjAndStatus(pts) };
    if (label === "FLX" && realPos) row.realPos = realPos;
    return row;
  }

  const starters = starterIds.map((playerId, i) => playerRow(playerId, rosterPositions[i] || "FLX"));

  const benchIds = (roster.players || []).filter((id) => !starterIds.includes(id));
  const bench = benchIds.map((playerId) => {
    const p = playersMap[playerId];
    const realPos = p?.position || "BN";
    return playerRow(playerId, realPos);
  });

  return {
    team: teamName,
    record,
    total: +(matchup?.points || 0).toFixed(1),
    starters,
    bench,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("league_id");
  const userId = searchParams.get("user_id");
  const week = searchParams.get("week");

  if (!leagueId || !userId || !week) {
    return Response.json(
      { error: "Requires ?league_id=...&user_id=...&week=..." },
      { status: 400 }
    );
  }

  try {
    const [leagueRes, rostersRes, usersRes, matchupsRes, playersMap] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
      getPlayersMap(),
    ]);

    if (!leagueRes.ok || !rostersRes.ok || !usersRes.ok || !matchupsRes.ok) {
      return Response.json({ error: "Sleeper API request failed" }, { status: 502 });
    }

    const league = await leagueRes.json();
    const rosters = await rostersRes.json();
    const users = await usersRes.json();
    const matchups = await matchupsRes.json();
    const rosterPositions = league.roster_positions || [];

    const myRoster = rosters.find((r) => r.owner_id === userId);
    if (!myRoster) {
      return Response.json({ error: "That user_id has no roster in this league" }, { status: 404 });
    }
    const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
    if (!myMatchup) {
      return Response.json({ error: "No matchup found for this week yet" }, { status: 404 });
    }
    const oppMatchup = matchups.find(
      (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id
    );
    const oppRoster = oppMatchup ? rosters.find((r) => r.roster_id === oppMatchup.roster_id) : null;

    const you = buildTeam({ roster: myRoster, matchup: myMatchup, users, playersMap, rosterPositions });
    const opp = oppRoster
      ? buildTeam({ roster: oppRoster, matchup: oppMatchup, users, playersMap, rosterPositions })
      : null;

    return Response.json({
      id: leagueId,
      platform: "sleeper",
      name: league.name,
      week: Number(week),
      you,
      opp,
    });
  } catch (err) {
    return Response.json({ error: "Something went wrong fetching this league" }, { status: 500 });
  }
}
