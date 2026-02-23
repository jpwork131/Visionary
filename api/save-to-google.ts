import { Readable } from 'stream';
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

async function saveToGoogleHandler(req: VercelRequest, res: VercelResponse) {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) {
    return res.status(401).json({ error: "Not authenticated with Google" });
  }

  const { imageData, prompt, aspectRatio } = req.body;
  const tokens = JSON.parse(tokensStr);
  oauth2Client.setCredentials(tokens);

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // 1. Upload to Drive
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    const driveResponse = await drive.files.create({
      requestBody: {
        name: `Visionary_${Date.now()}.png`,
        mimeType: 'image/png',
      },
      media: {
        mimeType: 'image/png',
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });

    const fileId = driveResponse.data.id;
    const fileLink = driveResponse.data.webViewLink;

    // 2. Find or Create Spreadsheet
    let spreadsheetId;
    const listResponse = await drive.files.list({
      q: "name = 'Visionary AI Generations' and mimeType = 'application/vnd.google-apps.spreadsheet'",
      fields: 'files(id)',
    });

    if (listResponse.data.files && listResponse.data.files.length > 0) {
      spreadsheetId = listResponse.data.files[0].id;
    } else {
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: 'Visionary AI Generations' },
          sheets: [{ properties: { title: 'Generations' } }]
        }
      });
      spreadsheetId = createResponse.data.spreadsheetId;
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId!,
        range: 'Generations!A1:D1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Timestamp', 'Prompt', 'Aspect Ratio', 'Drive Link']]
        }
      });
    }

    // 3. Append to Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId!,
      range: 'Generations!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[new Date().toISOString(), prompt, aspectRatio, fileLink]]
      }
    });

    res.json({ success: true, fileLink });
  } catch (error: any) {
    console.error("Error saving to Google:", error);
    res.status(500).json({ error: error.message || "Failed to save to Google" });
  }
}

export default parseCookies(saveToGoogleHandler);
