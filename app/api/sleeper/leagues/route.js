// GET /api/sleeper/leagues?username=YOUR_SLEEPER_USERNAME
//
// Sleeper's API is public and needs no API key or login. This route:
//   1. Looks up the user_id for a given username
//   2. Fetches every NFL league that user is in for the given season
//
// Test it by visiting this URL directly in your browser once it's deployed:
//   https://your-app.vercel.app/api/sleeper/leagues?username=YOUR_USERNAME

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const season = searchParams.get("season") || "2026";

  if (!username) {
    return Response.json(
      { error: "Add ?username=yoursleeperusername to the URL" },
      { status: 400 }
    );
  }

  try {
    // Step 1: username -> user_id
    const userRes = await fetch(`https://api.sleeper.app/v1/user/${username}`);
    if (!userRes.ok) {
      return Response.json(
        { error: `No Sleeper user found for "${username}"` },
        { status: 404 }
      );
    }
    const user = await userRes.json();

    // Step 2: user_id -> this season's leagues
    const leaguesRes = await fetch(
      `https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${season}`
    );
    if (!leaguesRes.ok) {
      return Response.json({ error: "Could not fetch leagues from Sleeper" }, { status: 502 });
    }
    const leagues = await leaguesRes.json();

    return Response.json({
      username: user.username,
      user_id: user.user_id,
      season,
      leagues: leagues.map((l) => ({
        league_id: l.league_id,
        name: l.name,
        total_rosters: l.total_rosters,
        avatar: l.avatar,
      })),
    });
  } catch (err) {
    return Response.json({ error: "Sleeper API request failed" }, { status: 500 });
  }
}
