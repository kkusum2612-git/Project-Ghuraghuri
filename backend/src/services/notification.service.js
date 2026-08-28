import { Resend } from 'resend';

/*
 * Central email sender for Ghuraghuri notifications.
 *
 * Feature controllers call this service instead of using
 * Resend directly.
 */

function getResendClient() {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function getFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    'Ghuraghuri <onboarding@resend.dev>'
  );
}

/*
 * Notification failures should not break bookings or other
 * core project features.
 */
async function sendNotificationEmail({
  to,
  subject,
  text,
  html,
}) {
  if (!to) {
    return {
      sent: false,
      reason: 'missing_recipient',
    };
  }

  const resend =
    getResendClient();

  if (!resend) {
    console.warn(
      'Notification skipped: RESEND_API_KEY is not configured.'
    );

    return {
      sent: false,
      reason: 'not_configured',
    };
  }

  try {
    const result =
      await resend.emails.send({
        from: getFromEmail(),
        to: Array.isArray(to)
          ? to
          : [to],
        subject,
        text,
        html,
      });

    if (result.error) {
      console.error(
        'Notification email failed:',
        result.error
      );

      return {
        sent: false,
        reason: 'provider_error',
        error: result.error,
      };
    }

    return {
      sent: true,
      data: result.data,
    };
  } catch (error) {
    console.error(
      'Notification email failed:',
      error
    );

    return {
      sent: false,
      reason: 'send_error',
      error,
    };
  }
}

export {
  sendNotificationEmail,
};
