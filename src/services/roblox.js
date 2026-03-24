const log = require('../utils/logger');

async function resolveUsername(username) {
  try {
    const res = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;
    return { id: String(data.data[0].id), username: data.data[0].name };
  } catch (err) {
    log.error('roblox', 'Failed to resolve username', err);
    return null;
  }
}

async function fetchUser(robloxId) {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { id: String(data.id), username: data.name, displayName: data.displayName, description: data.description || '' };
  } catch (err) {
    log.error('roblox', 'Failed to fetch user', err);
    return null;
  }
}

async function fetchUserGroupRole(robloxUserId, groupId) {
  try {
    const res = await fetch(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data) return null;
    const entry = data.data.find(g => String(g.group.id) === String(groupId));
    if (!entry) return null;
    return { rank: entry.role.rank, roleName: entry.role.name, roleId: entry.role.id };
  } catch (err) {
    log.error('roblox', 'Failed to fetch user group role', err);
    return null;
  }
}

async function fetchGroupRoles(apiKey, groupId) {
  try {
    const roles = [];
    let pageToken = null;

    while (true) {
      let url = `https://apis.roblox.com/cloud/v2/groups/${groupId}/roles?maxPageSize=50`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
      if (!res.ok) {
        log.error('roblox', `Group roles fetch returned ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.groupRoles) {
        for (const role of data.groupRoles) {
          roles.push({
            id: role.id,
            name: role.displayName || role.name,
            rank: role.rank,
            path: role.path || null
          });
        }
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    roles.sort((a, b) => a.rank - b.rank);
    return roles;
  } catch (err) {
    log.error('roblox', 'Failed to fetch group roles', err);
    return null;
  }
}

async function fetchAvatar(robloxUserId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;
    return data.data[0].imageUrl || null;
  } catch {
    return null;
  }
}

async function setRank(apiKey, groupId, robloxUserId, roleId) {
  try {
    const listRes = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?maxPageSize=1&filter=user == 'users/${robloxUserId}'`,
      { headers: { 'x-api-key': apiKey } }
    );

    if (!listRes.ok) {
      log.error('roblox', `Membership lookup returned ${listRes.status}`);
      return { success: false, error: `Failed to find membership (${listRes.status})` };
    }

    const listData = await listRes.json();
    if (!listData.groupMemberships || listData.groupMemberships.length === 0) {
      return { success: false, error: 'User is not a member of this group' };
    }

    const membershipPath = listData.groupMemberships[0].path;

    const patchRes = await fetch(
      `https://apis.roblox.com/cloud/v2/${membershipPath}`,
      {
        method: 'PATCH',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: `groups/${groupId}/roles/${roleId}` })
      }
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      log.error('roblox', `Rank set returned ${patchRes.status}: ${errText}`);
      return { success: false, error: `Roblox API error (${patchRes.status})` };
    }

    return { success: true };
  } catch (err) {
    log.error('roblox', 'Failed to set rank', err);
    return { success: false, error: err.message };
  }
}

async function fetchGroupInfo(groupId) {
  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
    if (!res.ok) {
      log.error('roblox', `Group info fetch returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      memberCount: data.memberCount || 0,
      publicEntryAllowed: data.publicEntryAllowed || false,
      owner: data.owner ? { id: data.owner.userId, username: data.owner.username, displayName: data.owner.displayName } : null,
      shout: data.shout ? { body: data.shout.body, poster: data.shout.poster?.username || 'Unknown' } : null,
      hasVerifiedBadge: data.hasVerifiedBadge || false,
    };
  } catch (err) {
    log.error('roblox', 'Failed to fetch group info', err);
    return null;
  }
}

async function fetchGroupIcon(groupId) {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png&isCircular=false`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;
    return data.data[0].imageUrl || null;
  } catch {
    return null;
  }
}

async function lookupBloxlink(apiKey, guildId, discordId) {
  try {
    const res = await fetch(`https://api.blox.link/v4/public/guilds/${guildId}/discord-to-roblox/${discordId}`, {
      headers: { Authorization: apiKey }
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      if (res.status === 401) {
        log.error('bloxlink', 'Bloxlink API key is invalid or unauthorized (401)');
        log.info('bloxlink', 'Check your key at https://blox.link/dashboard/developer');
        log.info('bloxlink', 'Make sure the key has access to the server the bot is in');
        return null;
      }
      if (res.status === 429) {
        log.warn('bloxlink', 'Rate limited by Bloxlink API');
        return null;
      }
      const body = await res.text().catch(() => '');
      log.error('bloxlink', `Bloxlink API returned ${res.status}: ${body}`);
      return null;
    }

    const data = await res.json();
    if (!data.robloxID) return null;
    return String(data.robloxID);
  } catch (err) {
    log.error('bloxlink', 'Bloxlink lookup failed', err);
    return null;
  }
}

module.exports = {
  resolveUsername,
  fetchUser,
  fetchUserGroupRole,
  fetchGroupRoles,
  fetchAvatar,
  fetchGroupInfo,
  fetchGroupIcon,
  setRank,
  lookupBloxlink,
};
