"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/types.ts
var types_exports = {};
__export(types_exports, {
  ResponseError: () => ResponseError
});
module.exports = __toCommonJS(types_exports);
var ResponseError = /* @__PURE__ */ ((ResponseError2) => {
  ResponseError2["NOT_FOUND"] = "User not found";
  ResponseError2["QUOTA_REACHED"] = "You have reached your API key limit for today. Email cm@blox.link for elevated rates.";
  ResponseError2["INVALID_KEY"] = "Invalid API Key";
  ResponseError2["GUILD_NOT_MATCHED"] = "Guild ID does not match API Key";
  ResponseError2["REQUIRES_API_PREMIUM"] = "This endpoint requires API Premium or Server Premium/Pro";
  return ResponseError2;
})(ResponseError || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ResponseError
});
//# sourceMappingURL=types.cjs.map