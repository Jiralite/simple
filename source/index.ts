import { Buffer } from "node:buffer";
import process from "node:process";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	Client,
	ComponentType,
	GatewayDispatchEvents,
	InteractionType,
	MessageFlags,
	TextInputStyle,
	UserFlags,
} from "@discordjs/core";
import { REST, calculateUserDefaultAvatarIndex } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { DiscordSnowflake } from "@sapphire/snowflake";
import pino from "./pino.js";
import { TimestampStyles, formatTimestamp, userMention } from "./utility.js";

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

		if (commandName === "bug-report" && data.data.options?.[0]?.type === ApplicationCommandOptionType.String) {
			const type = data.data.options[0].value;

			await api.interactions.createModal(data.id, data.token, {
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "bug-report-1",
								label: "Description",
								style: TextInputStyle.Short,
								min_length: 10,
								max_length: 200,
								required: true,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "bug-report-2",
								label: "Steps to Reproduce",
								style: TextInputStyle.Paragraph,
								min_length: 10,
								max_length: 1_000,
								placeholder: "1. Navigate to an element\n2. Double-tap\n3. Etc.",
								required: true,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "bug-report-3",
								label: "Expected Behaviour",
								style: TextInputStyle.Short,
								min_length: 10,
								max_length: 350,
								required: true,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "bug-report-4",
								label: "Current Behaviour",
								style: TextInputStyle.Short,
								min_length: 10,
								max_length: 350,
								required: true,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "bug-report-5",
								label: "Versions",
								style: TextInputStyle.Short,
								min_length: 10,
								max_length: 500,
								placeholder: "Input client and system versions.",
								required: true,
							},
						],
					},
				],
				custom_id: `bug-report§${type}`,
				title: `${type} Report`,
			});
		}

		if (commandName === "user-information" && data.data.options?.[0]?.type === ApplicationCommandOptionType.User) {
			const user = data.data.resolved?.users?.[data.data.options[0].value];
			const guildMember = data.data.resolved?.members?.[data.data.options[0].value];

			if (!user) {
				pino.warn(data, "No user found.");
				await api.interactions.reply(data.id, data.token, { content: "No user found.", flags: MessageFlags.Ephemeral });
				return;
			}

			const {
				avatar,
				banner,
				bot,
				discriminator,
				id,
				public_flags: publicFlags,
				username,
			} = await api.users.get(user.id);

			const legacyUser = discriminator === "0";
			const userCreatedTimestamp = DiscordSnowflake.deconstruct(id).timestamp;
			const description = [userMention(id), `Id: \`${id}\``];
			const fields = [{ name: "Bot", value: bot ? "`true`" : "`false`", inline: true }];

			const globalAvatarURL = avatar
				? rest.cdn.avatar(id, avatar, { size: 4_096 })
				: rest.cdn.defaultAvatar(legacyUser ? calculateUserDefaultAvatarIndex(id) : Number(discriminator) % 5);

			let perServerAvatarURL;

			description.push(
				`Created: ${formatTimestamp(Number(userCreatedTimestamp / 1_000n), TimestampStyles.LongDateTime)} (${formatTimestamp(Number(userCreatedTimestamp / 1_000n), TimestampStyles.Relative)})`,
			);

			if (guildMember) {
				const {
					avatar: guildMemberAvatar,
					communication_disabled_until: communicationDisabledUntil,
					joined_at: joinedAt,
					pending,
					permissions,
					premium_since: premiumSince,
				} = guildMember;

				if (data.guild_id && guildMemberAvatar) {
					perServerAvatarURL = rest.cdn.guildMemberAvatar(data.guild_id, id, guildMemberAvatar, { size: 4_096 });
				}

				description.push(
					`Joined Server: ${formatTimestamp(Date.parse(joinedAt) / 1_000, TimestampStyles.LongDateTime)} (${formatTimestamp(Date.parse(joinedAt) / 1_000, TimestampStyles.Relative)})`,
				);

				description.push(
					`Server Boosting: ${premiumSince ? `${formatTimestamp(Date.parse(premiumSince) / 1_000, TimestampStyles.LongDateTime)} (${formatTimestamp(Date.parse(premiumSince) / 1_000, TimestampStyles.Relative)})` : "`null`"}`,
				);

				description.push(
					`Communication disabled until: ${communicationDisabledUntil ? `${formatTimestamp(Date.parse(communicationDisabledUntil) / 1_000, TimestampStyles.LongDateTime)} (${formatTimestamp(Date.parse(communicationDisabledUntil) / 1_000, TimestampStyles.Relative)})` : "`null`"}`,
				);

				fields.push(
					{ name: "Pending", value: pending ? "`true`" : "`false`", inline: true },
					{ name: "Permissions", value: `\`${permissions}\``, inline: true },
				);
			}

			fields.push(
				{
					name: "Avatar",
					value: `[Global](${globalAvatarURL})${perServerAvatarURL ? ` | [Guild](${perServerAvatarURL})` : ""}`,
					inline: true,
				},
				{
					name: "Banner",
					value: banner ? `[Global](${rest.cdn.banner(id, banner, { size: 4_096 })})` : "`null`",
					inline: true,
				},
				// Blank field to make things nicer.
				{ name: "", value: "\u200B", inline: true },
			);

			const flags = [];

			if (publicFlags) {
				if (publicFlags & UserFlags.Staff) flags.push("Staff");
				if (publicFlags & UserFlags.Partner) flags.push("Partner");
				if (publicFlags & UserFlags.Hypesquad) flags.push("HypeSquad");
				if (publicFlags & UserFlags.BugHunterLevel1) flags.push("Bug Hunter Level 1");
				if (publicFlags & UserFlags.MFASMS) flags.push("MFA SMS");
				if (publicFlags & UserFlags.PremiumPromoDismissed) flags.push("Premium Promo Dismissed");
				if (publicFlags & UserFlags.HypeSquadOnlineHouse1) flags.push("HypeSquad Online House 1");
				if (publicFlags & UserFlags.HypeSquadOnlineHouse2) flags.push("HypeSquad Online House 2");
				if (publicFlags & UserFlags.HypeSquadOnlineHouse3) flags.push("HypeSquad Online House 3");
				if (publicFlags & UserFlags.PremiumEarlySupporter) flags.push("Premium Early Supporter");
				if (publicFlags & UserFlags.TeamPseudoUser) flags.push("Team Pseudo User");
				if (publicFlags & UserFlags.HasUnreadUrgentMessages) flags.push("Has Unread Urgent Messages");
				if (publicFlags & UserFlags.BugHunterLevel2) flags.push("Bug Hunter Level 2");
				if (publicFlags & UserFlags.VerifiedBot) flags.push("Verified Bot");
				if (publicFlags & UserFlags.VerifiedDeveloper) flags.push("Verified Developer");
				if (publicFlags & UserFlags.CertifiedModerator) flags.push("Certified Moderator");
				if (publicFlags & UserFlags.BotHTTPInteractions) flags.push("Bot HTTP Interactions");
				if (publicFlags & UserFlags.Spammer) flags.push("Spammer");
				if (publicFlags & UserFlags.ActiveDeveloper) flags.push("Active Developer");
				if (publicFlags & UserFlags.Quarantined) flags.push("Quarantined");
				if (publicFlags & UserFlags.Collaborator) flags.push("Collaborator");
				if (publicFlags & UserFlags.RestrictedCollaborator) flags.push("Restricted Collaborator");
			}

			await api.interactions.reply(data.id, data.token, {
				embeds: [
					{
						author: { icon_url: globalAvatarURL, name: `${username}${legacyUser ? "" : `#${discriminator}`}` },
						description: `${description.join("\n")}\n\n__Flags__\n${flags.length > 0 ? flags.join(", ") : "None"}`,
						fields,
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		if (commandName === "raw") {
			let target;
			let fetchUser = false;

			switch (data.data.options?.[0]?.type) {
				case ApplicationCommandOptionType.User:
					target = data.data.resolved?.users?.[data.data.options[0].value];
					fetchUser = true;
					break;
				case ApplicationCommandOptionType.Channel:
					target = data.data.resolved?.channels?.[data.data.options[0].value];
					break;
				case ApplicationCommandOptionType.Role:
					target = data.data.resolved?.roles?.[data.data.options[0].value];
					break;
				default:
					target = data;
			}

			if (!target) {
				pino.warn(data, "No data found.");

				await api.interactions.reply(data.id, data.token, {
					content: "No data found.",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			if (fetchUser) target = await api.users.get(target.id);
			const targetData = JSON.stringify(target, null, 2);
			const content = `\`\`\`JSON\n${targetData}\n\`\`\``;

			if (content.length > 2_000) {
				await api.interactions.reply(data.id, data.token, {
					files: [{ contentType: "application/json", data: Buffer.from(targetData), name: "raw.json" }],
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await api.interactions.reply(data.id, data.token, { content, flags: MessageFlags.Ephemeral });
			}
		}
	}

	if (data.type === InteractionType.ModalSubmit) {
		const customId = data.data.custom_id;

		if (customId.startsWith("bug-report")) {
			const type = customId.slice(customId.indexOf("§") + 1);
			const description = data.data.components[0]?.components[0]?.value;
			const stepsToReproduce = data.data.components[1]?.components[0]?.value;
			const expectedBehaviour = data.data.components[2]?.components[0]?.value;
			const currentBehaviour = data.data.components[3]?.components[0]?.value;
			const versions = data.data.components[4]?.components[0]?.value;

			await api.interactions.reply(data.id, data.token, {
				content: `## Type\n${type}\n## Description\n${description}\n## Steps to Reproduce\n${stepsToReproduce}\n## Expected Behaviour\n${expectedBehaviour}\n## Current Behaviour\n${currentBehaviour}\n## Versions\n${versions}`,
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

void gateway.connect();
