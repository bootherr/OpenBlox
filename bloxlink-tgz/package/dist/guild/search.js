// src/guild/search.ts
import axios, { HttpStatusCode } from "axios";

// src/apiInformation.ts
var apiBaseUrl = "https://api.blox.link";
var apiVersion = "v4";

// src/apikey.ts
var guildApiKey = "";

// src/guild/search.ts
var DiscordToRoblox = async (discordGuildId, discordUserId, premiumResponse, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/discord-to-roblox/${discordUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === HttpStatusCode.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};
var RobloxToDiscord = async (discordGuildId, robloxUserId, premiumResponse, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/roblox-to-discord/${robloxUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === HttpStatusCode.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};
export {
  DiscordToRoblox,
  RobloxToDiscord
};
//# sourceMappingURL=search.js.map