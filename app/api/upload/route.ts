import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { VALID_PINS } from "@/constant";

let cachedFolderId: string | undefined;

function getGoogleAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Brak danych OAuth Google Drive. Uzupełnij GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET i GOOGLE_REFRESH_TOKEN.",
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
}

async function resolveDriveFolderId(drive: ReturnType<typeof google.drive>) {
  if (cachedFolderId) {
    try {
      await drive.files.get({
        fileId: cachedFolderId,
        fields: "id",
        supportsAllDrives: true,
      });
      return cachedFolderId;
    } catch {
      cachedFolderId = undefined;
    }
  }

  const configuredFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (configuredFolderId) {
    try {
      await drive.files.get({
        fileId: configuredFolderId,
        fields: "id",
        supportsAllDrives: true,
      });
      cachedFolderId = configuredFolderId;
      return cachedFolderId;
    } catch (error) {
      const status =
        typeof error === "object" && error && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      if (status !== 403 && status !== 404) {
        throw error;
      }
    }
  }

  const createdFolder = await drive.files.create({
    requestBody: {
      name: "Wedding Moments",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["root"],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  cachedFolderId = createdFolder.data.id ?? undefined;
  if (!cachedFolderId) {
    throw new Error("Nie udało się utworzyć folderu w Google Drive.");
  }

  return cachedFolderId;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const pin = formData.get("pin");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Brak pliku w żądaniu" },
        { status: 400 },
      );
    }

    if (typeof pin !== "string" || !VALID_PINS.includes(pin)) {
      return NextResponse.json({ error: "Nieprawidłowy PIN" }, { status: 401 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const auth = getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const folderId = await resolveDriveFolderId(drive);

    const stream = Readable.from(buffer);
    const fileMetadata = {
      name: `wesele_[${pin}]_${Date.now()}_${file.name || "photo.jpg"}`,
      parents: [folderId],
    };

    const media = {
      mimeType: file.type || "image/jpeg",
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id,name",
      supportsAllDrives: true,
    });

    return NextResponse.json({
      success: true,
      storage: "google-drive",
      fileId: response.data.id,
      fileName: response.data.name,
    });
  } catch (error: unknown) {
    console.error("Błąd Google Drive:", error);
    const details = error instanceof Error ? error.message : "Unknown error";

    const userMessage = details.includes(
      "Service Accounts do not have storage quota",
    )
      ? "Konto Google użyte w aplikacji nie może zapisywać plików w zwykłym Drive. Użyj OAuth z właściwym kontem i folderem."
      : details.includes("not have permission") ||
          details.includes("Insufficient permissions")
        ? "To konto Google nie ma uprawnień do tego folderu Drive."
        : "Nie udało się zapisać zdjęcia na Google Drive. Sprawdź dane OAuth i dostęp do folderu.";

    return NextResponse.json({ error: userMessage, details }, { status: 500 });
  }
}
