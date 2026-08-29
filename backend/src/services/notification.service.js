/*
 * Central email sender for Ghuraghuri notifications.
 *
 * Feature controllers call this service instead of using
 * Brevo directly.
 */

function getBrevoApiKey() {
  return (
    process.env.BREVO_API_KEY ||
    ''
  ).trim();
}

function getFromEmail() {
  return (
    process.env.BREVO_FROM_EMAIL ||
    ''
  ).trim();
}

function getFromName() {
  return (
    process.env.BREVO_FROM_NAME ||
    'Ghuraghuri'
  ).trim();
}

function buildRecipients(to) {
  const recipients =
    Array.isArray(to)
      ? to
      : [to];

  return recipients
    .filter(Boolean)
    .map((email) => ({
      email:
        String(email).trim(),
    }));
}

/*
 * Notification failures must not break bookings,
 * status updates, or trip operations.
 */
async function sendNotificationEmail({
  to,
  subject,
  text,
  html,
}) {
  const recipients =
    buildRecipients(to);

  if (
    recipients.length === 0
  ) {
    return {
      sent: false,
      reason:
        'missing_recipient',
    };
  }

  const apiKey =
    getBrevoApiKey();

  const fromEmail =
    getFromEmail();

  if (
    !apiKey ||
    !fromEmail
  ) {
    console.warn(
      'Notification skipped: Brevo is not configured.'
    );

    return {
      sent: false,
      reason:
        'not_configured',
    };
  }

  try {
    const response =
      await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',

          headers: {
            accept:
              'application/json',

            'content-type':
              'application/json',

            'api-key':
              apiKey,
          },

          body:
            JSON.stringify({
              sender: {
                name:
                  getFromName(),

                email:
                  fromEmail,
              },

              to:
                recipients,

              subject,

              textContent:
                text || undefined,

              htmlContent:
                html || undefined,
            }),
        }
      );

    let result = {};

    try {
      result =
        await response.json();
    } catch {
      result = {};
    }

    if (
      !response.ok
    ) {
      console.error(
        'Notification email failed:',
        {
          status:
            response.status,

          error:
            result,
        }
      );

      return {
        sent: false,
        reason:
          'provider_error',
        status:
          response.status,
        error:
          result,
      };
    }

    return {
      sent: true,

      data: {
        messageId:
          result.messageId ||
          null,
      },
    };
  } catch (error) {
    console.error(
      'Notification email failed:',
      error
    );

    return {
      sent: false,
      reason:
        'send_error',
      error,
    };
  }
}

export {
  sendNotificationEmail,
};
