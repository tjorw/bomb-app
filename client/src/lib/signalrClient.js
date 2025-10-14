import * as signalR from "@microsoft/signalr";

let connection = null;

export async function startConnection(onStateUpdated) {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl("/bomhub")
    .withAutomaticReconnect()
    .build();

  connection.on("StateUpdated", (dto) => onStateUpdated?.(dto));

  await connection.start();
  return connection;
}
