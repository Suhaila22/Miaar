import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

// Optional webhook (Slack incoming webhook, generic HTTP endpoint, etc.) the
// admin "notify owner" action posts to. Leave unset to just log locally.
const NOTIFICATION_WEBHOOK_URL = process.env.OWNER_NOTIFICATION_WEBHOOK_URL ?? "";

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification. Posts to OWNER_NOTIFICATION_WEBHOOK_URL
 * when configured (e.g. a Slack incoming webhook), otherwise just logs it
 * server-side. Returns `true` if the notification was delivered/logged,
 * `false` when a configured webhook could not be reached.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!NOTIFICATION_WEBHOOK_URL) {
    console.log(`[Notification] ${title}: ${content}`);
    return true;
  }

  try {
    const response = await fetch(NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content, text: `${title}\n${content}` }),
    });

    if (!response.ok) {
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification webhook:", error);
    return false;
  }
}
