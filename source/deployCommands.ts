import process from "node:process";
import { Routes } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import pino from "./pino.js";

const { APPLICATION_ID, DISCORD_TOKEN } = process.env;

if (!APPLICATION_ID || !DISCORD_TOKEN) {
	pino.fatal("Missing Discord credentials.");
	process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

try {
	await rest.put(Routes.applicationCommands(APPLICATION_ID), {
		body: [
			{
				name: "ping",
				description: "Ping! Just kidding, you get a scary message.",
				contexts: [0, 1, 2],
				integration_types: [1],
			},
		],
	});

	pino.info("Successfully registered application commands.");
} catch (error) {
	pino.error(error);
}
