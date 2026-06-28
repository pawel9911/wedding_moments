import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { VALID_PINS } from "@/constant";

let cachedFolderId: string | undefined;

function getGoogleAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawPrivateKey =
    process.env.GOOGLE_PRIVATE_KEY ??
    (process.env.GOOGLE_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, "base64").toString(
          "utf8",
        )
      : undefined);

  if (!email || !rawPrivateKey) {
    throw new Error("Brak danych uwierzytelniających Google Drive.");
  }

  return new google.auth.JWT({
    email,
    key: rawPrivateKey.replaceAll("\\n", "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
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
    return NextResponse.json(
      { error: "Błąd serwera podczas wysyłania", details },
      { status: 500 },
    );
  }
}
