import { google } from "googleapis";
import { VercelRequest, VercelResponse } from "@vercel/node";
import cookieParser from "cookie-parser";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`
);

// We need to use a custom middleware for cookie-parser in Vercel functions
const parseCookies = (handler: Function) => (
  req: VercelRequest,
  res: VercelResponse
) => {
  cookieParser()(req as any, res as any, () => handler(req, res));
};

async function callbackHandler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Set cookie using res.setHeader for Vercel functions
    const cookieValue = JSON.stringify(tokens);
    res.setHeader('Set-Cookie', `google_tokens=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${30 * 24 * 60 * 60}`);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code:", error);
    res.status(500).send("Authentication failed");
  }
}

export default parseCookies(callbackHandler);
