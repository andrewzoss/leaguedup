// GET /api/nfl/current-week
//
// Figures out the "fantasy current week" using the standard Tuesday-to-
// Monday convention (new week starts Tuesday, games run Thu-Mon), computed
// from real game dates rather than trusting ESPN's own "current week"
// field - that didn't follow this same convention.
//
// Important: game kickoff timestamps come back in UTC, and a Thursday
// 8:15pm ET game is already past midnight UTC - it gets stamped as Friday
// in UTC. Doing the "+5 days" rollover math on raw UTC dates silently
// shifted the whole calculation by close to a day. Fixed by first
// converting every date to its real Eastern-Time calendar day before doing
// any day-of-week math, since that's the timezone the NFL week actually
// runs on.
//
// Returns: { week, year }

function toEasternDateOnly(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  // Treated as UTC midnight purely so date-only arithmetic (adding days,
  // comparing) is unambiguous - the actual time-of-day doesn't matter once
  // we only care about which Eastern calendar day something falls on.
  return new Date(`${y}-${m}-${d}T00:00:00Z`);
}

async function getWeekEarliestKickoff(week, year) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=${year}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const dates = (data.events || []).map((e) => new Date(e.date).getTime()).filter(Boolean);
  if (dates.length === 0) return null;
  return toEasternDateOnly(new Date(Math.min(...dates)));
}

// The point at which a week's games are considered "over" for fantasy
// purposes and the next week takes over: the Tuesday following that week's
// earliest game (Thursday), i.e. 5 Eastern calendar days later.
function tuesdayRolloverFrom(earliestKickoffEastern) {
  const rollover = new Date(earliestKickoffEastern.getTime());
  rollover.setUTCDate(rollover.getUTCDate() + 5);
  return rollover;
}

export async function GET() {
  try {
    const seedRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2"
    );
    if (!seedRes.ok) {
      return Response.json({ error: "ESPN scoreboard request failed" }, { status: 502 });
    }
    const seedData = await seedRes.json();
    let week = seedData.week?.number;
    const year = seedData.season?.year;
    if (!week || !year) {
      return Response.json(
        { error: "ESPN response didn't include a current week/year" },
        { status: 502 }
      );
    }

    const todayEastern = toEasternDateOnly(new Date());
    // TEMPORARY diagnostic - shows exactly what dates this computed, so if
    // the result still looks wrong we have real numbers instead of another
    // guess. Safe to remove once this is confirmed working.
    const debug = { espnSeedWeek: week, todayEastern: todayEastern.toISOString(), steps: [] };

    for (let i = 0; i < 4; i++) {
      const earliest = await getWeekEarliestKickoff(week, year);
      if (!earliest) {
        debug.steps.push({ week, earliest: null, note: "no games found - stopped adjusting" });
        break;
      }
      const rollover = tuesdayRolloverFrom(earliest);
      debug.steps.push({
        week,
        earliestEastern: earliest.toISOString(),
        rolloverEastern: rollover.toISOString(),
        rolledOver: todayEastern >= rollover,
      });
      if (todayEastern < rollover) break;
      week += 1;
    }

    return Response.json({ week, year, debug });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong determining the current week" },
      { status: 500 }
    );
  }
}
