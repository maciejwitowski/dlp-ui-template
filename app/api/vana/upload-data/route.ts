import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFileToDrive } from "@/lib/googleApi";
import { formatVanaFileId, base64ToBlob } from "@/lib/utils";

/**
 * This route handles the VANA DLP flow:
 * 1. Accepts encrypted user data from the client
 * 2. Uploads to Google Drive
 * 3. Returns the URL to be registered on VANA DLP
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request data
    let requestData;
    try {
      requestData = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request data format" },
        { status: 400 }
      );
    }

    const { encryptedFile, timestamp } = requestData;

    if (!encryptedFile) {
      return NextResponse.json(
        { error: "Encrypted file data is required" },
        { status: 400 }
      );
    }

    // Convert the base64 string back to a Blob
    const fileBlob = base64ToBlob(encryptedFile);

    // Upload encrypted file to Google Drive
    let uploadResult;
    try {
      const fileName = `vana_dlp_data_${timestamp || Date.now()}.json`;
      uploadResult = await uploadFileToDrive(
        session.accessToken as string,
        fileBlob,
        fileName
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Failed to upload encrypted data to Google Drive";

      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    // Create the direct download URL
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${uploadResult.id}?alt=media`;

    // Return the file information to be registered with VANA
    return NextResponse.json({
      fileUrl: uploadResult.webViewLink,
      downloadUrl: downloadUrl,
      fileId: uploadResult.id,
      vanaFileId: formatVanaFileId(
        uploadResult.webViewLink,
        timestamp || Date.now()
      ),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `VANA DLP processing error: ${error.message}`
        : "An unexpected error occurred processing data for VANA DLP";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
