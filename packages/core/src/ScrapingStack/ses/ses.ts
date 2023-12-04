import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient();

export const sendEmail = async (args: {
  subject: string;
  body: string;
  addresses: string[];
}) => {
  const params = {
    Destination: {
      ToAddresses: args.addresses,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: args.body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: args.subject,
      },
    },
    Source: "fs.pessina@gmail.",
  };

  await sesClient.send(new SendEmailCommand(params));
};
