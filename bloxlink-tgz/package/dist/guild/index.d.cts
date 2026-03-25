import { GuildDiscordToRobloxResponse, GuildRobloxToDiscordResponse, GuildUpdateUserResponse } from '../types.cjs';
import 'axios';
import 'discord-api-types/v10';

declare const _default: {
    setGuildApiKey: (newKey: string) => string;
    DiscordToRoblox: <Premium extends boolean = boolean>(discordGuildId: string, discordUserId: string, premiumResponse?: Premium, apiKey?: string) => Promise<GuildDiscordToRobloxResponse<Premium extends true ? true : false>>;
    RobloxToDiscord: <Premium extends boolean = boolean>(discordGuildId: string, robloxUserId: string, premiumResponse?: Premium, apiKey?: string) => Promise<GuildRobloxToDiscordResponse<Premium extends true ? true : false>>;
    UpdateUser: (discordGuildId: string, discordUserId: string, apiKey?: string) => Promise<GuildUpdateUserResponse>;
};

export { _default as default };
