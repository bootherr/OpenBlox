"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/guild/premium.ts
var premium_exports = {};
__export(premium_exports, {
  UpdateUser: () => UpdateUser
});
module.exports = __toCommonJS(premium_exports);
var import_axios = __toESM(require("axios"), 1);

// src/apiInformation.ts
var apiBaseUrl = "https://api.blox.link";
var apiVersion = "v4";

// src/apikey.ts
var guildApiKey = "";

// src/guild/premium.ts
var UpdateUser = async (discordGuildId, discordUserId, apiKey) => {
  try {
    const response = await (0, import_axios.default)({
      method: "POST",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/update-user/${discordUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === import_axios.HttpStatusCode.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UpdateUser
});
//# sourceMappingURL=premium.cjs.map