import api from './api';

export const cameraGroupService = {
  // List all groups (with cameras nested inside)
  getGroups: async () => {
    const { data } = await api.get('/groups');
    return data.data;
  },

  // Get one group with its cameras
  getGroup: async (groupId) => {
    const { data } = await api.get(`/groups/${groupId}`);
    return data.data;
  },

  // Create a group — backend auto-provisions N camera channels
  // body: { name, host, port, username, password, totalChannels, deviceType, location }
  createGroup: async (body) => {
    const { data } = await api.post('/groups', body);
    return data.data;
  },

  // Update group metadata
  updateGroup: async (groupId, body) => {
    const { data } = await api.put(`/groups/${groupId}`, body);
    return data.data;
  },

  // Delete group + all its cameras
  deleteGroup: async (groupId) => {
    await api.delete(`/groups/${groupId}`);
  },

  // Force-sync all camera statuses for a group from Shinobi
  syncGroup: async (groupId) => {
    const { data } = await api.post(`/groups/${groupId}/sync`);
    return data.data;
  },

  // Remove a single camera channel from a group (does NOT delete the whole group).
  // Use when a channel was added that doesn't exist on the physical device.
  deleteCameraFromGroup: async (groupId, monitorId) => {
    const { data } = await api.delete(`/groups/${groupId}/cameras/${monitorId}`);
    return data;
  },

  // S3 recordings for an entire group with pagination
  // params: { date, page, limit, camera }
  getGroupRecordings: async (groupId, params = {}) => {
    const { data } = await api.get(`/groups/${groupId}/recordings`, { params });
    return data; // returns { success, data: [...], pagination: {...}, cached }
  },

  // S3 recordings for one camera inside a group
  getCameraRecordings: async (groupId, monitorId, date = null) => {
    const params = date ? { date } : {};
    const { data } = await api.get(`/groups/${groupId}/cameras/${monitorId}/recordings`, { params });
    return data.data;
  },
};
