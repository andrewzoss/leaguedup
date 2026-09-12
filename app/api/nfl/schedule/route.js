// GET /api/nfl/schedule?week=1&year=2026
//
// Real NFL schedule, live scores, and game status, for every game in a
// given week. Source: ESPN's public scoreboard endpoint. This isn't an
// official/documented ESPN API, there's no key or login involved, and
// it's the same data ESPN.com itself uses, but it's not a supported
// contract, so if ESPN ever changes its shape, this route needs updating
// too.
//
// Returns: { week, year, games: [ {id, home, away, homeScore, awayScore,
//   state, period, clock, slot, slotLabel, date, timeShort, kickoff}, ... ] }
//
// state is one of: "pre" | "in" | "post" (ESPN's own vocabulary)

function classifySlot(kickoffISO) {
  const d = new Date(kickoffISO);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = get("minute");
  const month = get("month");
  const day = get("day");

  let slot = "sunEarly";
  let slotLabel = "Sunday Early";
  if (weekday === "Thu") {
    slot = "thu";
    slotLabel = "Thursday";
  } else if (weekday === "Mon") {
    slot = "mon";
    slotLabel = "Monday Night";
  } else if (weekday === "Sun") {
    if (hour < 14) {
      slot = "sunEarly";
      slotLabel = "Sunday Early";
    } else if (hour < 19) {
      slot = "sunLate";
      slotLabel = "Sunday Afternoon";
    } else {
      slot = "sunNight";
      slotLabel = "Sunday Night";
    }
  } else {
    slot = "other";
    slotLabel = weekday;
  }

  const hour12 = ((hour + 11) % 12) + 1;
  const timeShort = `${hour12}:${minute}`;
  const date = `${month}/${day}`;

  return { slot, slotLabel, date, timeShort };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") || "1";
  const year = searchParams.get("year") || "2026";

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=${year}`
    );
    if (!res.ok) {
      return Response.json({ error: "ESPN scoreboard request failed" }, { status: 502 });
    }
    const data = await res.json();

    const games = (data.events || []).map((event) => {
      const comp = event.competitions?.[0];
      const competitors = comp?.competitors || [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      const status = comp?.status || event.status;
      const { slot, slotLabel, date, timeShort } = classifySlot(event.date);

      return {
        id: event.id,
        home: home?.team?.abbreviation,
        away: away?.team?.abbreviation,
        homeScore: Number(home?.score || 0),
        awayScore: Number(away?.score || 0),
        state: status?.type?.state, // "pre" | "in" | "post"
        period: status?.period || 0,
        clock: status?.displayClock || "",
        kickoff: `${slotLabel} ${timeShort} ET`,
        slot,
        slotLabel,
        date,
        timeShort,
        isReal: true,
      };
    });

    return Response.json({ week: Number(week), year: Number(year), games });
  } catch (err) {
    return Response.json({ error: "Something went wrong fetching the NFL schedule" }, { status: 500 });
  }
}
