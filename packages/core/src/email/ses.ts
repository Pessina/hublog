import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient();

export async function sendEmail(config: {
  sender: string;
  receiver: string[];
  subject: string;
  content: string;
}) {
  const params = {
    Source: config.sender,
    Destination: {
      ToAddresses: config.receiver,
    },
    Message: {
      Subject: {
        Data: config.subject,
      },
      Body: {
        Text: {
          Data: config.content,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
  } catch (err) {
    console.error("Error sending email:", err);
  }
}
