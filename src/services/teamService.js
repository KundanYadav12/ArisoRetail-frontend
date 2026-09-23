import API from './api';

export const teamService = {
  getAllTeams: () => API.get('/teams/all'),
  getMyTeams: () => API.get('/teams/my'),
  getTeamById: (id) => API.get(`/teams/${id}`),
  createTeam: (data) => API.post('/teams', data),
  addTeamMember: (teamId, data) => API.post(`/teams/${teamId}/members`, data),
  removeTeamMember: (teamId, userId) => API.delete(`/teams/${teamId}/members/${userId}`)
};
