// GET /api/nfl/current-week
//
// Figures out the "fantasy current week" using the standard Tuesday-to-
// Monday convention (new week starts Tuesday, games run Thu-Mon), computed
// from real game dates rather than trusting ESPN's own "current week"
// field - that turned out not to follow this same convention (still showed
// the old week as current on a Wednesday, a day after it should have
// rolled over for fantasy purposes). Also doesn't need a hardcoded season-
// start date that would need updating every year: it starts from whatever
// ESPN calls the current week as a rough anchor, then walks forward using
// each week's own real earliest-game date until it finds the right one.
//
// Returns: { week, year }

async function getWeekEarliestKickoff(week, year) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=${year}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const dates = (data.events || []).map((e) => new Date(e.date).getTime()).filter(Boolean);
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates));
}

// The point at which a week's games are considered "over" for fantasy
// purposes and the next week takes over: the Tuesday following that week's
// earliest game (Thursday night), i.e. 5 days later, at NFL's usual early-
// morning rollover time (using midnight Eastern is close enough - being off
// by a few hours right at the boundary doesn't matter here).
function tuesdayRolloverFrom(earliestKickoff) {
  const rollover = new Date(earliestKickoff.getTime());
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

    const now = new Date();

    // Walk forward: if the week ESPN handed us has already passed its
    // Tuesday rollover point, advance to the next week and check again.
    // Bounded to a handful of iterations - this should only ever need to
    // move forward by one, this just guards against ESPN's field being off
    // by more than that for some reason.
    for (let i = 0; i < 4; i++) {
      const earliest = await getWeekEarliestKickoff(week, year);
      if (!earliest) break; // no games found for this week (bye/offseason edge case) - stop adjusting
      const rollover = tuesdayRolloverFrom(earliest);
      if (now < rollover) break; // this week hasn't rolled over yet - this is the right week
      week += 1;
    }

    return Response.json({ week, year });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong determining the current week" },
      { status: 500 }
    );
  }
}
