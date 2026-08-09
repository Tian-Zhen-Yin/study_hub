// api.js - REST API client
const BASE = '/api';

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(BASE + path);
  return res.json();
}

export const api = {
  // Questions
  getQuestions(domainId) { return get('/questions' + (domainId ? '?domainId=' + domainId : '')); },
  getQuestion(id) { return get('/questions/' + id); },
  getModules() { return get('/questions/modules'); },

  // Quiz
  createQuizSet(params) { return post('/quiz/set', params); },
  submitAnswer(questionId, userAnswer) { return post('/quiz/answer', { questionId, userAnswer }); },

  // Memory
  getDueCards(count) { return get('/memory/due?count=' + (count || 20)); },
  getMemoryStats() { return get('/memory/stats'); },

  // Bookmarks
  toggleBookmark(questionId) { return post('/bookmarks/' + questionId, {}); },
  getBookmarks() { return get('/bookmarks'); },

  // Game
  getGameState() { return get('/game/state'); },
  startDailyChallenge() { return post('/game/daily-challenge', {}); },
  submitChallengeResult(answers) { return post('/game/daily-challenge/result', { answers }); },
  startBoss(domainId) { return post('/game/boss/' + domainId, {}); },
  submitBossResult(domainId, answers) { return post('/game/boss/' + domainId + '/result', { answers }); },
  getAchievements() { return get('/game/achievements'); },

  // Progress
  exportProgress() { return get('/progress/export'); },
  previewImport(json) { return post('/progress/import/preview', json); },
  applyImport(json) { return post('/progress/import/apply', json); },
  getDiagnosis() { return get('/progress/diagnosis'); },

  // Territories
  getTerritories() { return get('/territories'); },

  // Five Elements Profile
  getFiveElementsProfile() { return get('/profile/five-elements'); },
};
