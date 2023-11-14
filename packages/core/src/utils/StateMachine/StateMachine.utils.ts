import { StartExecutionCommand, SFNClient } from "@aws-sdk/client-sfn";

export const startStateMachine = async (
  stateMachineArn: string,
  input: string
) => {
  const client = new SFNClient();
  const command = new StartExecutionCommand({
    stateMachineArn: stateMachineArn,
    input: input,
  });

  try {
    await client.send(command);
  } catch (error) {
    throw new Error(`Failed to start state machine: ${error}`);
  }
};
