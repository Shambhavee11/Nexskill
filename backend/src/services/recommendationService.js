const axios = require('axios');

const REC_BASE = process.env.REC_API_URL || 'http://localhost:8000';
const REC_KEY  = process.env.REC_API_KEY  || '';

const recClient = axios.create({
  baseURL: REC_BASE,
  timeout: 5000,
  headers: { 'X-API-Key': REC_KEY },
});

const getRecommendations = async (userId, topN = 8, skill = null, excludeIds = []) => {
  try {
    const params = { top_n: topN };
    if (skill) params.skill = skill;
    if (excludeIds.length) params.exclude = excludeIds.join(',');

    const res = await recClient.get(`/recommend/${userId}`, { params });
    return res.data.recommendations || [];
  } catch (err) {
    console.error('Recommendation service error:', err.message);
    return [];
  }
};

const getSimilarUsers = async (userId, topN = 5) => {
  try {
    const res = await recClient.get(`/similar/${userId}`, { params: { top_n: topN } });
    return res.data.similar_users || [];
  } catch (err) {
    console.error('Similar users service error:', err.message);
    return [];
  }
};

const triggerRetrain = async () => {
  try {
    const res = await recClient.post('/retrain');
    return res.data;
  } catch (err) {
    console.error('Retrain error:', err.message);
    return { success: false };
  }
};

module.exports = { getRecommendations, getSimilarUsers, triggerRetrain };