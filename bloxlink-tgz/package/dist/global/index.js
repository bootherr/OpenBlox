// src/apikey.ts
var globalApiKey = "";
var setGlobalApiKey = (newKey) => globalApiKey = newKey;

// src/global/search.ts
import axios, { HttpStatusCode } from "axios";

// src/apiInformation.ts
var apiBaseUrl = "https://api.blox.link";
var apiVersion = "v4";

// src/global/search.ts
var DiscordToRoblox = async (discordUserId, premiumResponse, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/discord-to-roblox/${discordUserId}`,
      headers: {
        Authorization: apiKey || globalApiKey
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
var RobloxToDiscord = async (robloxUserId, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/roblox-to-discord/${robloxUserId}`,
      headers: {
        Authorization: apiKey || globalApiKey
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

// src/global/index.ts
var global_default = {
  setGlobalApiKey,
  DiscordToRoblox,
  RobloxToDiscord
};
export {
  global_default as default
};
//# sourceMappingURL=index.js.map