import type { Snowflake } from "@discordjs/core";

export enum TimestampStyles {
	ShortTime = "t",
	LongTime = "T",
	ShortDate = "d",
	LongDate = "D",
	ShortDateTime = "f",
	LongDateTime = "F",
	Relative = "R",
}

export function userMention(id: Snowflake) {
	return `<@${id}>`;
}

export function formatTimestamp(timestamp: number, style: TimestampStyles) {
	return `<t:${Math.floor(timestamp)}:${style}>`;
}
