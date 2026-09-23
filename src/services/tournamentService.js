import API from './api';

export const tournamentService = {
  getAllTournaments: (params) => API.get('/tournaments', { params }),
  getMyTournaments: () => API.get('/tournaments/my'),
  getTournamentById: (id) => API.get(`/tournaments/${id}`),
  getTeams: (id, params) => API.get(`/tournaments/${id}/teams`, { params }),
  getMatches: (id, params) => API.get(`/tournaments/${id}/matches`, { params }),
  getLiveMatches: (id) => API.get(`/tournaments/${id}/live`),
  getStandings: (id) => API.get(`/tournaments/${id}/standings`),
  createTournament: (data) => API.post('/tournaments', data),
  registerTeam: (tournamentId, teamId) => API.post(`/tournaments/${tournamentId}/teams`, { teamId }),
  removeTeam: (tournamentId, teamId) => API.delete(`/tournaments/${tournamentId}/teams/${teamId}`),
  scheduleMatch: (tournamentId, data) => API.post(`/tournaments/${tournamentId}/schedule`, data),
  generateFixtures: (tournamentId, data) => API.post(`/tournaments/${tournamentId}/generate-fixtures`, data)
};
