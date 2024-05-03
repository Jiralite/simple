import process from "node:process";
import { ApplicationCommandOptionType, Routes } from "@discordjs/core";
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
				name: "user-information",
				description: "Returns information of a user.",
				contexts: [0, 1, 2],
				integration_types: [1],
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "The user to get the information of.",
						required: true,
					},
				],
			},
		],
	});

	pino.info("Successfully registered application commands.");
} catch (error) {
	pino.error(error);
}
