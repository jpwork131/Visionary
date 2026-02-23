import { VercelRequest, VercelResponse } from "@vercel/node";
import cookieParser from "cookie-parser";

// We need to use a custom middleware for cookie-parser in Vercel functions
const parseCookies = (handler: Function) => (
  req: VercelRequest,
  res: VercelResponse
) => {
  cookieParser()(req as any, res as any, () => handler(req, res));
};

function statusHandler(req: VercelRequest, res: VercelResponse) {
  const tokens = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokens });
}

export default parseCookies(statusHandler);
