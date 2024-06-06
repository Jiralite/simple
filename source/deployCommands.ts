import process from "node:process";
import { ApplicationCommandOptionType, ApplicationCommandType, Routes } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { BugReportType } from "./constants.js";
import pino from "./pino.js";

const { APPLICATION_ID, DISCORD_A11Y_GUILD_ID, DISCORD_TOKEN } = process.env;

if (!APPLICATION_ID || !DISCORD_TOKEN) {
	pino.fatal("Missing Discord credentials.");
	process.exit(1);
}

if (!DISCORD_A11Y_GUILD_ID) {
	pino.fatal("Missing Discord A11y guild id.");
	process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

const GLOBL_COMMANDS = [
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
	{
		name: "raw",
		description: "Returns a raw payload.",
		contexts: [0, 1, 2],
		integration_types: [1],
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The user to get the payload of.",
			},
			{
				type: ApplicationCommandOptionType.Channel,
				name: "channel",
				description: "The channel to get the payload of.",
			},
			{
				type: ApplicationCommandOptionType.Role,
				name: "role",
				description: "The role to get the payload of.",
			},
		],
	},
	{
		name: "Raw",
		type: ApplicationCommandType.User,
		contexts: [0, 1, 2],
		integration_types: [1],
	},
	{
		name: "Raw",
		type: ApplicationCommandType.Message,
		contexts: [0, 1, 2],
		integration_types: [1],
	},
] as const;

const DISCORD_A11Y_COMMANDS = [
	{
		name: "bug-report",
		description: "Generates the text for a bug report.",
		contexts: [0],
		integration_types: [0, 1],
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "type",
				description: "The type of bug.",
				required: true,
				choices: Object.values(BugReportType).map((value) => ({ name: value, value })),
			},
		],
	},
] as const;

try {
	await Promise.all([
		rest.put(Routes.applicationCommands(APPLICATION_ID), { body: GLOBL_COMMANDS }),
		rest.put(Routes.applicationGuildCommands(APPLICATION_ID, DISCORD_A11Y_GUILD_ID), {
			body: DISCORD_A11Y_COMMANDS,
		}),
	]);

	pino.info("Successfully registered application commands.");
} catch (error) {
	pino.error(error);
}
