// GET /api/yahoo/login
//
// Kicks off Yahoo's real OAuth 2.0 flow (unlike ESPN, Yahoo has a genuine
// login-based auth system, no bookmarklet/cookie-scraping needed).
// Sends the user to Yahoo's own login/consent page; Yahoo then redirects
// back to /api/yahoo/callback with a temporary auth code.

export async function GET() {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "YAHOO_CLIENT_ID is not set in this deployment's environment variables" },
      { status: 500 }
    );
  }

  const redirectUri = "https://leaguedup.vercel.app/api/yahoo/callback";
  const authUrl =
    `https://api.login.yahoo.com/oauth2/request_auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&language=en-us`;

  return Response.redirect(authUrl, 302);
}
