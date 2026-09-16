// GET /api/nfl/current-week
//
// Asks ESPN's scoreboard which week IT considers "current" right now, by
// calling it with no week override at all - ESPN's own scoreboard defaults
// to today's real week when you don't specify one, which already handles
// the Tuesday-to-Tuesday fantasy week convention correctly on their end, so
// there's no separate date math to maintain here (and nothing that needs
// updating year to year for a new season's exact start date).
//
// Returns: { week, year }

export async function GET() {
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2"
    );
    if (!res.ok) {
      return Response.json({ error: "ESPN scoreboard request failed" }, { status: 502 });
    }
    const data = await res.json();
    const week = data.week?.number;
    const year = data.season?.year;
    if (!week) {
      return Response.json(
        { error: "ESPN response didn't include a current week number" },
        { status: 502 }
      );
    }
    return Response.json({ week, year: year || null });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong determining the current week" },
      { status: 500 }
    );
  }
}
