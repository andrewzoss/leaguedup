// GET /api/yahoo/callback?code=...
//
// Yahoo redirects here after login/consent. This exchanges the temporary
// auth code for a real access token, then IMMEDIATELY tries a real fantasy
// API call with that token - this is a deliberate one-shot diagnostic: it
// tells us in a single test whether Fantasy Sports access actually works
// for this app, since the developer console's permissions checkboxes
// weren't showing Fantasy Sports as an option to select.

const REDIRECT_URI = "https://leaguedup.vercel.app/api/yahoo/callback";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return Response.json(
      { step: "yahoo_redirect", error: `Yahoo sent back an error: ${oauthError}` },
      { status: 400 }
    );
  }
  if (!code) {
    return Response.json(
      { step: "yahoo_redirect", error: "No ?code= param came back from Yahoo" },
      { status: 400 }
    );
  }

  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json(
      { step: "config", error: "YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET not set in this deployment" },
      { status: 500 }
    );
  }

  // Step 1: exchange the auth code for a real access token.
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let tokenData;
  try {
    const tokenRes = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }).toString(),
    });
    const tokenRawBody = await tokenRes.text();
    if (!tokenRes.ok) {
      return Response.json(
        { step: "token_exchange", error: `Token exchange failed (status ${tokenRes.status}): ${tokenRawBody.slice(0, 500)}` },
        { status: 502 }
      );
    }
    try {
      tokenData = JSON.parse(tokenRawBody);
    } catch {
      return Response.json(
        { step: "token_exchange", error: `Token endpoint returned non-JSON: ${tokenRawBody.slice(0, 500)}` },
        { status: 502 }
      );
    }
  } catch (err) {
    return Response.json({ step: "token_exchange", error: `Threw: ${err.message}` }, { status: 500 });
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return Response.json(
      { step: "token_exchange", error: "No access_token in Yahoo's response", raw: tokenData },
      { status: 502 }
    );
  }

  // Step 2: THE REAL TEST - try an actual fantasy sports call with this
  // token. This is the definitive answer to "does this app actually have
  // Fantasy Sports access", regardless of what the developer console showed.
  try {
    const testRes = await fetch(
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const testRawBody = await testRes.text();
    let testData;
    try {
      testData = JSON.parse(testRawBody);
    } catch {
      testData = null;
    }

    return Response.json({
      step: "fantasy_api_test",
      tokenExchangeWorked: true,
      fantasyApiStatus: testRes.status,
      fantasyApiWorked: testRes.ok,
      fantasyApiResponse: testData || testRawBody.slice(0, 1000),
    });
  } catch (err) {
    return Response.json(
      { step: "fantasy_api_test", tokenExchangeWorked: true, error: `Threw: ${err.message}` },
      { status: 500 }
    );
  }
}
