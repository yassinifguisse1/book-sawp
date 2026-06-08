import { Resend } from "resend";
import { env } from "@/server/env";

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.resendApiKey) {
    return;
  }

  const resend = new Resend(env.resendApiKey);
  await resend.emails.send({
    from: env.resendFromEmail,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
