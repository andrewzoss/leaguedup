// GET /api/sleeper/all?username=YOUR_SLEEPER_USERNAME&week=2
//
// Only needs your Sleeper username. Internally this looks up your user_id,
// finds every league you're in, and pulls full roster/matchup data for
// each one - so this single call can populate the whole Scoreboard.
//
// Returns: { leagues: [ {id, platform, name, week, you, opp}, ... ] }
//
// WHAT'S REAL NOW:
//   - starters/bench, names, positions, real NFL team, live points, team
//     names, win-loss records: all real, from Sleeper.
//   - "proj": a REAL season-average of that player's own points across
//     already-completed weeks this season (weeks 1..week-1 in this same
//     league), not a made-up number. Week 1 has no prior weeks to average,
//     so it falls back to that week's own points, there's nothing else to
//     go on yet.
//   - "stats" (pass yards, receptions, etc): pulled from Sleeper's stats
//     endpoint. NOTE: this endpoint is undocumented/unofficial (Sleeper
//     doesn't publish it), so field names below are based on what's
//     commonly seen from it, not a guaranteed contract. Worth spot-checking
//     against a real game once this is live.
//
// STILL NOT REAL:
//   - "status" (pre/live/final) here is still a rough guess based on
//     whether points are > 0. The app corrects this client-side using the
//     real NFL schedule (see syncStatusWithSchedule in the app code), so
//     this placeholder gets overwritten before it reaches the screen -
//     it's left here mainly so nothing ever renders undefined.

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

// Sleeper's per-week stat dump. Undocumented endpoint - see the note at the
// top of this file. Cached per season+week since it doesn't change once a
// week is final, and only slowly while a week is live.
const STATS_CACHE = new Map(); // key `${season}-${week}` -> { data, fetchedAt }
const STATS_CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes, short since it's live during games

async function getWeekStats(season, week) {
  const key = `${season}-${week}`;
  const cached = STATS_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) return cached.data;

  const res = await fetch(
    `https://api.sleeper.app/stats/nfl/regular/${season}/${week}`
  );
  if (!res.ok) return {}; // fail soft - box score just won't show real stats this time
  const data = await res.json();
  STATS_CACHE.set(key, { data, fetchedAt: Date.now() });
  return data;
}

function slotLabel(sleeperSlot) {
  const map = { DEF: "DST", FLEX: "FLX", SUPER_FLEX: "FLX", BN: "BN" };
  return map[sleeperSlot] || sleeperSlot;
}

// Turns a player's raw Sleeper stat line into the {label, value} pairs the
// player modal already knows how to render, matched to the same categories
// used for mock data so no UI changes were needed.
function realBoxScore(pos, stats) {
  if (!stats) return null;
  const num = (v) => (typeof v === "number" ? v : 0);
  if (pos === "QB") {
    return [
      { label: "PASS YDS", value: Math.round(num(stats.pass_yd)) },
      { label: "PASS TD", value: num(stats.pass_td) },
      { label: "INT", value: num(stats.pass_int) },
      { label: "RUSH YDS", value: Math.round(num(stats.rush_yd)) },
    ];
  }
  if (pos === "RB") {
    return [
      { label: "RUSH YDS", value: Math.round(num(stats.rush_yd)) },
      { label: "RUSH TD", value: num(stats.rush_td) },
      { label: "REC", value: num(stats.rec) },
      { label: "REC YDS", value: Math.round(num(stats.rec_yd)) },
    ];
  }
  if (pos === "WR" || pos === "TE") {
    return [
      { label: "REC", value: num(stats.rec) },
      { label: "REC YDS", value: Math.round(num(stats.rec_yd)) },
      { label: "REC TD", value: num(stats.rec_td) },
      { label: "TARGETS", value: num(stats.rec_tgt) },
    ];
  }
  if (pos === "K") {
    return [
      { label: "FG MADE", value: `${num(stats.fgm)}/${num(stats.fga)}` },
      { label: "XP MADE", value: num(stats.xpm) },
    ];
  }
  if (pos === "DST" || pos === "DEF") {
    return [
      { label: "SACKS", value: num(stats.sack) },
      { label: "INT", value: num(stats.def_int) },
      { label: "FUM REC", value: num(stats.fum_rec) },
      { label: "PTS ALLOWED", value: num(stats.pts_allow) },
    ];
  }
  return null;
}

// Real season-average projection: average of this player's own points across
// every already-completed week (1..week-1) in this league. Week 1 has no
// history yet, so it just falls back to that week's own points.
async function getSeasonAverages(leagueId, week) {
  const upToWeek = Number(week) - 1;
  const averages = {};
  if (upToWeek < 1) return averages;

  const weekNums = Array.from({ length: upToWeek }, (_, i) => i + 1);
  const allWeeks = await Promise.all(
    weekNums.map((w) =>
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${w}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    )
  );

  const totals = {}; // player_id -> { sum, count }
  allWeeks.forEach((matchups) => {
    matchups.forEach((m) => {
      const pointsMap = m.players_points || {};
      Object.entries(pointsMap).forEach(([playerId, pts]) => {
        if (!totals[playerId]) totals[playerId] = { sum: 0, count: 0 };
        totals[playerId].sum += pts || 0;
        totals[playerId].count += 1;
      });
    });
  });
  Object.entries(totals).forEach(([playerId, { sum, count }]) => {
    averages[playerId] = count > 0 ? +(sum / count).toFixed(1) : 0;
  });
  return averages;
}

function buildTeam({ roster, matchup, users, playersMap, rosterPositions, weekStats, seasonAverages, week }) {
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
    const proj = Number(week) === 1 ? pts : seasonAverages[playerId] ?? pts;
    const row = {
      pos: label,
      name,
      pts,
      proj,
      team: p?.team,
      status: pts > 0 ? "live" : "pre", // placeholder, corrected client-side - see note at top
      boxScore: realBoxScore(realPos, weekStats[playerId]),
    };
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

async function buildOneLeague(leagueMeta, userId, week, playersMap, weekStats) {
  const leagueId = leagueMeta.league_id;
  const [leagueRes, rostersRes, usersRes, matchupsRes, seasonAverages] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
    getSeasonAverages(leagueId, week),
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

  const buildArgs = { users, playersMap, rosterPositions, weekStats, seasonAverages, week };
  return {
    id: leagueId,
    platform: "sleeper",
    name: league.name,
    week: Number(week),
    you: buildTeam({ roster: myRoster, matchup: myMatchup, ...buildArgs }),
    opp: buildTeam({ roster: oppRoster, matchup: oppMatchup, ...buildArgs }),
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
    const [playersMap, weekStats] = await Promise.all([
      getPlayersMap(),
      getWeekStats(SEASON, week),
    ]);

    const results = await Promise.all(
      leagueMetas.map((lm) => buildOneLeague(lm, user.user_id, week, playersMap, weekStats))
    );

    return Response.json({ leagues: results.filter(Boolean) });
  } catch (err) {
    return Response.json({ error: "Something went wrong fetching your leagues" }, { status: 500 });
  }
}
