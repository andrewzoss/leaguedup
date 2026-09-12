// GET /api/sleeper/all?username=YOUR_SLEEPER_USERNAME&week=2
//
// Only needs your Sleeper username. Internally this looks up your user_id,
// finds every league you're in, and pulls full roster/matchup data for
// each one - so this single call can populate the whole Scoreboard.
//
// Returns: { leagues: [ {id, platform, name, week, you, opp}, ... ] }
// - one array item per Sleeper league, already in the app's data shape.
//
// KNOWN LIMITATION (same as the single-league route): Sleeper's public API
// has no player projections and no real game-status field. "proj" and
// "status" below are placeholders, not real data, until a real sports-data
// source is wired in for schedule/projections.

const SEASON = "2026";

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
  // NOTE: only helps while a serverless instance stays warm. For real
  // production caching across cold starts, move this into Upstash Redis.
}

function slotLabel(sleeperSlot) {
  const map = { DEF: "DST", FLEX: "FLX", SUPER_FLEX: "FLX", BN: "BN" };
  return map[sleeperSlot] || sleeperSlot;
}

// Placeholder, not real data - see the note at the top of this file.
function fillPlaceholderProjAndStatus(pts) {
  return {
    proj: pts,
    status: pts > 0 ? "live" : "pre",
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
    const name = p
      ? `${p.first_name?.[0] ? p.first_name[0] + ". " : ""}${p.last_name || p.full_name || playerId}`
      : playerId;
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
    return playerRow(playerId, p?.position || "BN");
  });

  return { team: teamName, record, total: +(matchup?.points || 0).toFixed(1), starters, bench };
}

async function buildOneLeague(leagueMeta, userId, week, playersMap) {
  const leagueId = leagueMeta.league_id;
  const [leagueRes, rostersRes, usersRes, matchupsRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
  ]);
  if (!leagueRes.ok || !rostersRes.ok || !usersRes.ok || !matchupsRes.ok) return null;

  const league = await leagueRes.json();
  const rosters = await rostersRes.json();
  const users = await usersRes.json();
  const matchups = await matchupsRes.json();
  const rosterPositions = league.roster_positions || [];

  const myRoster = rosters.find((r) => r.owner_id === userId);
  if (!myRoster) return null;
  const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
  if (!myMatchup) return null;
  const oppMatchup = matchups.find(
    (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id
  );
  const oppRoster = oppMatchup ? rosters.find((r) => r.roster_id === oppMatchup.roster_id) : null;
  if (!oppRoster) return null;

  return {
    id: leagueId,
    platform: "sleeper",
    name: league.name,
    week: Number(week),
    you: buildTeam({ roster: myRoster, matchup: myMatchup, users, playersMap, rosterPositions }),
    opp: buildTeam({ roster: oppRoster, matchup: oppMatchup, users, playersMap, rosterPositions }),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const week = searchParams.get("week");

  if (!username || !week) {
    return Response.json({ error: "Requires ?username=...&week=..." }, { status: 400 });
  }

  try {
    const userRes = await fetch(`https://api.sleeper.app/v1/user/${username}`);
    if (!userRes.ok) {
      return Response.json({ error: `No Sleeper user found for "${username}"` }, { status: 404 });
    }
    const user = await userRes.json();

    const leaguesRes = await fetch(
      `https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${SEASON}`
    );
    if (!leaguesRes.ok) {
      return Response.json({ error: "Could not fetch leagues from Sleeper" }, { status: 502 });
    }
    const leagueMetas = await leaguesRes.json();
    const playersMap = await getPlayersMap();

    const results = await Promise.all(
      leagueMetas.map((lm) => buildOneLeague(lm, user.user_id, week, playersMap))
    );

    return Response.json({ leagues: results.filter(Boolean) });
  } catch (err) {
    return Response.json({ error: "Something went wrong fetching your leagues" }, { status: 500 });
  }
}
