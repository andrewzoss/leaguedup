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
const STATS_CACHE_TTL_MS = 1000 * 20; // 20 seconds - short since box scores change live during games

async function getWeekStats(season, week) {
  const key = `${season}-${week}`;
  const cached = STATS_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) return cached;

  try {
    const res = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`);
    const rawBody = await res.text();
    if (!res.ok) {
      const result = { data: {}, error: `Sleeper stats request failed (status ${res.status}): ${rawBody.slice(0, 200)}` };
      STATS_CACHE.set(key, { ...result, fetchedAt: Date.now() });
      return result;
    }
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      const result = { data: {}, error: `Sleeper stats returned non-JSON: ${rawBody.slice(0, 200)}` };
      STATS_CACHE.set(key, { ...result, fetchedAt: Date.now() });
      return result;
    }
    const result = { data, error: null };
    STATS_CACHE.set(key, { ...result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    return { data: {}, error: `Sleeper stats fetch threw: ${err.message}` };
  }
}

function slotLabel(sleeperSlot) {
  const map = { DEF: "DST", FLEX: "FLX", SUPER_FLEX: "SUP", BN: "BN" };
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
// Also returns the raw per-week matchup data it fetched, so the defense-
// adjustment logic below can reuse it instead of fetching the same weeks
// twice.
async function getSeasonAverages(leagueId, week) {
  const upToWeek = Number(week) - 1;
  const averages = {};
  if (upToWeek < 1) return { averages, pastWeeksMatchups: [] };

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
  return { averages, pastWeeksMatchups: allWeeks.map((matchups, i) => ({ week: weekNums[i], matchups })) };
}

// Real NFL team-vs-team pairings for a given week (who played whom - not
// live scores, just the schedule), pulled from the same ESPN scoreboard the
// rest of the app uses for real schedule data. A week's pairings never
// change once the season's underway, so this is cached for a long time and
// shared across every league/user hitting this deployment.
const PAIRINGS_CACHE = new Map(); // key `${year}-${week}` -> { data, fetchedAt }
const PAIRINGS_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

async function getWeekPairings(week, year) {
  const key = `${year}-${week}`;
  const cached = PAIRINGS_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < PAIRINGS_CACHE_TTL_MS) return cached.data;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=${year}`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const pairings = {};
    (data.events || []).forEach((event) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      if (competitors.length !== 2) return;
      const abbrevA = competitors[0].team?.abbreviation;
      const abbrevB = competitors[1].team?.abbreviation;
      if (abbrevA && abbrevB) {
        pairings[abbrevA] = abbrevB;
        pairings[abbrevB] = abbrevA;
      }
    });
    PAIRINGS_CACHE.set(key, { data: pairings, fetchedAt: Date.now() });
    return pairings;
  } catch {
    return {};
  }
}

// Opponent-adjusted projection multipliers, by real NFL team + position.
// Built from this league's own rostered players' actual scoring history
// (in this league's own scoring settings, since these are real points
// Sleeper already computed) cross-referenced against the real schedule to
// see who each of those points was actually scored against. A defense
// that's allowed more than average to a position gets a multiplier above
// 1 (softer matchup), less than average gets a multiplier below 1
// (tougher matchup).
//
// Honest caveats: this only sees players actually rostered in THIS league
// (not every real NFL player), assumes a player's current team was also
// their team in past weeks (wrong for in-season trades), and is a simple
// historical-average signal, not a real predictive model with injury
// reports, Vegas lines, etc. Clamped and gated on a minimum sample size to
// keep it from swinging wildly on small numbers.
const MIN_WEEKS_FOR_ADJUSTMENT = 3;
const MULTIPLIER_MIN = 0.75;
const MULTIPLIER_MAX = 1.3;

async function getDefenseAdjustments(pastWeeksMatchups, playersMap, year) {
  if (pastWeeksMatchups.length < MIN_WEEKS_FOR_ADJUSTMENT) return null;

  const weekPairings = await Promise.all(
    pastWeeksMatchups.map(({ week }) => getWeekPairings(week, year))
  );

  const allowed = {}; // team -> position -> { sum, count }
  pastWeeksMatchups.forEach(({ matchups }, i) => {
    const pairings = weekPairings[i];
    matchups.forEach((m) => {
      const pointsMap = m.players_points || {};
      Object.entries(pointsMap).forEach(([playerId, pts]) => {
        const p = playersMap[playerId];
        const pos = p?.position;
        const team = p?.team;
        if (!pos || !team) return;
        const opponent = pairings[team];
        if (!opponent) return; // bye week, or pairing lookup missed
        if (!allowed[opponent]) allowed[opponent] = {};
        if (!allowed[opponent][pos]) allowed[opponent][pos] = { sum: 0, count: 0 };
        allowed[opponent][pos].sum += pts || 0;
        allowed[opponent][pos].count += 1;
      });
    });
  });

  // League-wide (this fantasy league's rostered players only) average
  // points allowed per position, as the baseline "normal" matchup.
  const leagueTotals = {}; // position -> { sum, count }
  Object.values(allowed).forEach((byPos) => {
    Object.entries(byPos).forEach(([pos, { sum, count }]) => {
      if (!leagueTotals[pos]) leagueTotals[pos] = { sum: 0, count: 0 };
      leagueTotals[pos].sum += sum;
      leagueTotals[pos].count += count;
    });
  });

  function multiplierFor(team, pos) {
    const teamStat = allowed[team]?.[pos];
    const leagueStat = leagueTotals[pos];
    if (!teamStat || !leagueStat || teamStat.count < 2 || leagueStat.count < 6) return 1;
    const teamAvg = teamStat.sum / teamStat.count;
    const leagueAvg = leagueStat.sum / leagueStat.count;
    if (leagueAvg <= 0) return 1;
    const raw = teamAvg / leagueAvg;
    return Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, raw));
  }

  return multiplierFor;
}

function buildTeam({ roster, matchup, users, playersMap, rosterPositions, weekStats, seasonAverages, getMultiplier, currentWeekPairings, week }) {
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
    const baseProj = Number(week) === 1 ? pts : seasonAverages[playerId] ?? pts;
    // Opponent-adjusted on top of the season average, when we have enough
    // history and know who this player's team is facing this week - see
    // the notes above getDefenseAdjustments for what this does and doesn't
    // account for.
    const opponent = p?.team ? currentWeekPairings[p.team] : null;
    const multiplier = getMultiplier && opponent && realPos ? getMultiplier(opponent, realPos) : 1;
    const proj = +(baseProj * multiplier).toFixed(1);
    const row = {
      pos: label,
      name,
      pts,
      proj,
      team: p?.team,
      status: pts > 0 ? "live" : "pre", // placeholder, corrected client-side - see note at top
      boxScore: realBoxScore(realPos, weekStats[playerId]),
    };
    if ((label === "FLX" || label === "SUP") && realPos) row.realPos = realPos;
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
  const [leagueRes, rostersRes, usersRes, matchupsRes, seasonData, currentWeekPairings] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
    getSeasonAverages(leagueId, week),
    getWeekPairings(week, SEASON),
  ]);
  if (!leagueRes.ok || !rostersRes.ok || !usersRes.ok || !matchupsRes.ok) return null;

  const league = await leagueRes.json();
  const rosters = await rostersRes.json();
  const users = await usersRes.json();
  const matchups = await matchupsRes.json();
  const rosterPositions = league.roster_positions || [];
  const { averages: seasonAverages, pastWeeksMatchups } = seasonData;
  const getMultiplier = await getDefenseAdjustments(pastWeeksMatchups, playersMap, SEASON);

  const myRoster = rosters.find((r) => r.owner_id === userId);
  if (!myRoster) return null;
  const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
  if (!myMatchup) return null;
  const oppMatchup = matchups.find(
    (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id
  );
  const oppRoster = oppMatchup ? rosters.find((r) => r.roster_id === oppMatchup.roster_id) : null;
  if (!oppRoster) return null;

  const buildArgs = {
    users,
    playersMap,
    rosterPositions,
    weekStats,
    seasonAverages,
    getMultiplier,
    currentWeekPairings,
    week,
  };
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
    const [playersMap, weekStatsResult] = await Promise.all([
      getPlayersMap(),
      getWeekStats(SEASON, week),
    ]);
    const weekStats = weekStatsResult.data;

    const results = await Promise.all(
      leagueMetas.map((lm) => buildOneLeague(lm, user.user_id, week, playersMap, weekStats))
    );

    return Response.json({
      leagues: results.filter(Boolean),
      // TEMPORARY diagnostic: shows up only if the Sleeper stats fetch
      // itself failed, so real box scores not showing can be told apart
      // from "nobody's played yet". Safe to remove once stats are working.
      statsError: weekStatsResult.error,
    });
  } catch (err) {
    return Response.json({ error: "Something went wrong fetching your leagues" }, { status: 500 });
  }
}
