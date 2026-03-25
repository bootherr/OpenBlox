import { GuildDiscordToRobloxResponse, GuildRobloxToDiscordResponse } from '../types.cjs';
import 'axios';
import 'discord-api-types/v10';

/**
 * Send's an API request to Bloxlink to get the Roblox ID of a Discord user
 *
 * @method `GET`
 *
 * @param {string} discordGuildId The ID of the Discord guild
 * @param {string} discordUserId The ID of the Discord user you want to get
 * @param {boolean} premiumResponse If you have API Premium or be using an guild API key with Server Premium, you can set this to true to get an enriched response
 * @param {string?} apiKey Optional API key to specifically use (see {@link [apikey#setGuildApiKey](../apiKey.ts)} to set an API key across all of your request)
 * @returns {GuildDiscordToRobloxResponse}
 */
declare const DiscordToRoblox: <Premium extends boolean = boolean>(discordGuildId: string, discordUserId: string, premiumResponse?: Premium, apiKey?: string) => Promise<GuildDiscordToRobloxResponse<Premium extends true ? true : false>>;
/**
 * Send's an API request to Bloxlink to get the Discord ID of a Roblox user
 *
 * @method `GET`
 *
 * @param {string} discordGuildId The ID of the Discord guild
 * @param {string} robloxUserId The ID of the Roblox user you want to get
 * @param {boolean} premiumResponse If you have API Premium or be using an guild API key with Server Premium, you can set this to true to get an enriched response
 * @param {string?} apiKey Optional API key to specifically use (see {@link [apikey#setGuildApiKey](../apiKey.ts)} to set an API key across all of your request)
 * @returns {GuildRobloxToDiscordResponse}
 */
declare const RobloxToDiscord: <Premium extends boolean = boolean>(discordGuildId: string, robloxUserId: string, premiumResponse?: Premium, apiKey?: string) => Promise<GuildRobloxToDiscordResponse<Premium extends true ? true : false>>;

export { DiscordToRoblox, RobloxToDiscord };
