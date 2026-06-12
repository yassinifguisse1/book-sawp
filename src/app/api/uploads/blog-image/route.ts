import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { resolveLocalUser } from "@/server/db/users";
import { getDb } from "@/server/db/connection";
import { uploadedAssets } from "@/server/db/schema";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { userId } = await auth();
        if (!userId) throw new Error("Authentication required");
        const user = await resolveLocalUser(userId);
        if (user.deletedAt || user.suspendedAt) {
          throw new Error("This account cannot perform admin actions");
        }
        if (!pathname.startsWith("blog-covers/")) {
          throw new Error("Invalid blog cover path");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uploaderId: user.publicId, clientPayload }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          uploaderId?: string;
          clientPayload?: string | null;
        };
        const clientPayload = JSON.parse(payload.clientPayload ?? "{}") as { sizeBytes?: number };
        if (!payload.uploaderId) throw new Error("Missing upload owner");
        await getDb()
          .insert(uploadedAssets)
          .values({
            blobUrl: blob.url,
            blobPath: blob.pathname,
            uploaderPublicId: payload.uploaderId,
            contentType: blob.contentType,
            sizeBytes: clientPayload.sizeBytes ?? 0,
          })
          .onDuplicateKeyUpdate({
            set: {
              contentType: blob.contentType,
              sizeBytes: clientPayload.sizeBytes ?? 0,
            },
          });
        console.info("blog-cover.uploaded", {
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
