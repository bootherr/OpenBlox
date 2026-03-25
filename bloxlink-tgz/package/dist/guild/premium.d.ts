import { GuildUpdateUserResponse } from '../types.js';
import 'axios';
import 'discord-api-types/v10';

/**
 * Send's an API request to Bloxlink to update the user in the provided Discord server
 *
 * @method `POST`
 * @premium **This is a premium endpoint!** You must have API Premium or be using an guild API key with Server Premium!
 *
 * @param {string} discordGuildId The ID of the Discord guild
 * @param {string} discordUserId The ID of the Discord user you want to update
 * @param {string?} apiKey Optional API key to specifically use (see {@link [apikey#setGuildApiKey](../apiKey.ts)} to set an API key across all of your request)
 * @returns {GuildUpdateUserResponse}
 */
declare const UpdateUser: (discordGuildId: string, discordUserId: string, apiKey?: string) => Promise<GuildUpdateUserResponse>;

export { UpdateUser };
