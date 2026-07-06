import { supabase } from "@/integrations/supabase/client";

/**
 * Detect whether a given string is a raw storage path (not an absolute URL).
 * Examples of raw paths: "agency-id/installment-id/1234567890.pdf"
 * Examples of full URLs: "https://xxx.supabase.co/storage/v1/object/..."
 */
function isStoragePath(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://");
}

/**
 * Resolves a receipt reference to a signed URL.
 *
 * Accepts:
 *  - A raw storage path (e.g. "agencyId/instId/timestamp.pdf")
 *  - A raw storage path (e.g. "agencyId/instId/timestamp.pdf")
 *  - A full public URL (e.g. ".../storage/v1/object/public/payment-receipts/...")
 *
 * Returns a time-limited signed URL (60 seconds) for the private bucket.
 * Falls back to the original value on error.
 */
export async function getSignedUrlForReceipt(receiptRef: string): Promise<string> {
  if (!receiptRef) return "";

  let storagePath: string | null = null;

  if (isStoragePath(receiptRef)) {
    // New format: raw path like "agencyId/installmentId/ts.pdf"
    storagePath = receiptRef;
  } else if (receiptRef.includes("/storage/v1/object/public/payment-receipts/")) {
    // Public URL format — extract the path after the bucket name
    storagePath = receiptRef.split("/storage/v1/object/public/payment-receipts/")[1];
  } else if (receiptRef.includes("/storage/v1/object/sign/payment-receipts/")) {
    // Already a signed URL — return as-is (may still be valid)
    return receiptRef;
  } else if (receiptRef.includes("/payment-receipts/")) {
    // Alternate URL pattern — extract path segment after bucket name
    const match = receiptRef.match(/\/payment-receipts\/(.+)$/);
    if (match) storagePath = match[1];
  }

  if (!storagePath) {
    // Unknown format — return as-is
    return receiptRef;
  }

  try {
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(storagePath, 60);
    if (error) {
      console.error("Error creating signed URL:", error);
      return receiptRef;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("Failed to generate signed URL:", e);
    return receiptRef;
  }
}

/**
 * Opens a payment receipt in a new tab using a signed URL.
 * Safe for both raw paths and full public URLs.
 */
export async function handleViewReceipt(receiptRef: string) {
  if (!receiptRef) return;
  try {
    const signedUrl = await getSignedUrlForReceipt(receiptRef);
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error("Failed to open receipt:", e);
    window.open(receiptRef, "_blank", "noopener,noreferrer");
  }
}
