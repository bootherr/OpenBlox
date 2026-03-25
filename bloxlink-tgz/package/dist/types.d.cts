import { HttpStatusCode } from 'axios';
import { APIGuildMember } from 'discord-api-types/v10';

type If<T extends boolean, A, B = null> = T extends true ? A : T extends false ? B : A | B;
declare enum ResponseError {
    NOT_FOUND = "User not found",
    QUOTA_REACHED = "You have reached your API key limit for today. Email cm@blox.link for elevated rates.",
    INVALID_KEY = "Invalid API Key",
    GUILD_NOT_MATCHED = "Guild ID does not match API Key",
    REQUIRES_API_PREMIUM = "This endpoint requires API Premium or Server Premium/Pro"
}
type FailedResponse = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    error: ResponseError;
};
interface Headers {
    name: string;
    value: string;
}
interface Badges {
    imageUri: string;
    name: string;
}
interface Group {
    id: number;
    name: string;
    memberCount: number;
    hasVerifiedBadge: boolean;
}
interface Role {
    id: number;
    name: string;
    rank: number;
}
interface Groups {
    added: string[];
    removed: string[];
    nickname: string;
}
interface Groups {
    group: Group;
    role: Role;
}
interface GroupsV2 {
    [groupId: string]: {
        group: Group;
        role: Role;
    };
}
interface Avatar {
    BustThumbnail: string;
    HeadshotThumbnail: string;
    FullBody: string;
}
interface EnrichedRobloxUser {
    name: string;
    id: number;
    displayName: string;
    description: string;
    isBanned: boolean;
    created: Date;
    badges: Badges[];
    profileLink: string;
    presence: null;
    groups: Groups[];
    avatar: Avatar;
    rap: null;
    value: null;
    placeVisits: null;
    hasDisplayName: boolean;
    externalAppDisplayName?: any;
    hasVerifiedBadge: boolean;
    groupsv2: GroupsV2;
}
type GuildDiscordToRobloxResolved = {
    roblox: EnrichedRobloxUser;
    discord: APIGuildMember;
};
type GuildDiscordToRobloxResponse<Premium extends boolean = boolean> = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    robloxID: string;
    resolved: If<Premium, GuildDiscordToRobloxResolved, {}>;
};
type GlobalDiscordToRobloxResolved = {
    roblox: {};
};
type GlobalDiscordToRobloxResponse<Premium extends boolean = boolean> = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    robloxID: string;
    resolved: If<Premium, GlobalDiscordToRobloxResolved, {}>;
};
type GuildRobloxToDiscordResolved = {
    discord: {
        [discordId: string]: APIGuildMember;
    };
};
type GuildRobloxToDiscordResponse<Premium extends boolean = boolean> = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    discordIDs: string[];
    resolved: If<Premium, GuildRobloxToDiscordResolved, {}>;
};
type GlobalRobloxToDiscordResponse = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    discordIDs: string[];
};
type GuildUpdateUserResponse = {
    /**
     * Not included in the Bloxlink API response data
     */
    statusCode: HttpStatusCode;
    addedRoles: string[];
    removedRoles: string[];
    nickname: string;
};

export { type Avatar, type Badges, type EnrichedRobloxUser, type FailedResponse, type GlobalDiscordToRobloxResolved, type GlobalDiscordToRobloxResponse, type GlobalRobloxToDiscordResponse, type Group, type Groups, type GroupsV2, type GuildDiscordToRobloxResolved, type GuildDiscordToRobloxResponse, type GuildRobloxToDiscordResolved, type GuildRobloxToDiscordResponse, type GuildUpdateUserResponse, type Headers, ResponseError, type Role };
