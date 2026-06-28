import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");

    if (!pin || !VALID_PINS.includes(pin)) {
      return NextResponse.json(
        { error: "Nieautoryzowany dostęp. Nieprawidłowy PIN." },
        { status: 401 },
      );
    }

    const auth = getGoogleAuth();
    const driveClient = google.drive({ version: "v3", auth });
    const folderId = await resolveDriveFolderId(driveClient);

    const response = await driveClient.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
      fields:
        "files(id, name, mimeType, createdTime, thumbnailLink, webContentLink)",
      orderBy: "createdTime desc",
      pageSize: 100,
      supportsAllDrives: true,
    });

    const files = response.data.files || [];
    const photos = files.map((file) => ({
      id: file.id ?? "",
      url: file.thumbnailLink
        ? file.thumbnailLink.replace(/=s\d+/, "=s800")
        : (file.webContentLink ?? ""),
      name: file.name,
      createdAt: file.createdTime
        ? new Date(file.createdTime).getTime()
        : Date.now(),
      isLocal: false,
    }));

    return NextResponse.json({ photos }, { status: 200 });
  } catch (error: unknown) {
    console.error("Błąd podczas pobierania zdjęć z Google Drive:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Nie udało się pobrać galerii z chmury.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
