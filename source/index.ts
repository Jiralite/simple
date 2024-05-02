import process from "node:process";
import { ApplicationCommandType, Client, GatewayDispatchEvents, InteractionType, MessageFlags } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import pino from "./pino.js";

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
	pino.fatal("No Discord token provided.");
	process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);
const gateway = new WebSocketManager({ token: DISCORD_TOKEN, intents: 0, rest });
const client = new Client({ rest, gateway });

client.on(GatewayDispatchEvents.InteractionCreate, async ({ api, data }) => {
	if (data.type === InteractionType.ApplicationCommand && data.data.type === ApplicationCommandType.ChatInput) {
		const commandName = data.data.name;

		if (commandName === "ping") {
			await api.interactions.reply(data.id, data.token, {
				content: "Your account has been scheduled for deletion.",
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

void gateway.connect();
