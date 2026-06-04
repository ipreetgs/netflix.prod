import http from 'k6/http';
import { check, sleep } from 'k6';

// K6 Load Configuration (Simulating Millions of Concurrent Users peak ramp)
export const options = {
  stages: [
    { duration: '2m', target: 200 },    // Ramp up to 200 virtual users
    { duration: '5m', target: 200 },    // Stay at 200 users (sustained load)
    { duration: '2m', target: 1000 },   // Spike up to 1000 users (peak stress)
    { duration: '5m', target: 1000 },   // Maintain 1000 users
    { duration: '2m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% of requests must complete in under 300ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000'; // Routed through Ingress ALB

export default function () {
  // Generate random email to simulate concurrent registrations
  const userId = Math.floor(Math.random() * 1000000);
  const email = `testuser-${userId}@netflixclone.com`;
  const password = 'Password123!';

  // Step 1: User Login (Auth Service)
  const loginPayload = JSON.stringify({ email, password });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  
  // Attempt register if login fails, or hit login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);
  
  let token = '';
  if (loginRes.status === 200) {
    token = loginRes.json('accessToken');
  } else {
    // Register
    const regRes = http.post(`${BASE_URL}/api/auth/register`, loginPayload, loginParams);
    if (regRes.status === 201) {
      token = regRes.json('accessToken');
    }
  }

  if (!token) {
    sleep(1);
    return;
  }

  const authParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  // Step 2: Fetch Profiles (User Service)
  const profilesRes = http.get(`${BASE_URL}/api/profiles`, authParams);
  check(profilesRes, { 'profiles status is 200': (r) => r.status === 200 });

  const profiles = profilesRes.json();
  const activeProfileId = (profiles && profiles.length > 0) ? profiles[0].id : '1';

  // Step 3: Load Home Page Rows (Catalog & Recommendation Services)
  const moviesRes = http.get(`${BASE_URL}/api/movies`, authParams);
  check(moviesRes, { 'catalog load is 200': (r) => r.status === 200 });

  const trendingRes = http.get(`${BASE_URL}/api/trending`, authParams);
  check(trendingRes, { 'trending load is 200': (r) => r.status === 200 });

  const recsRes = http.get(`${BASE_URL}/api/recommendations?profileId=${activeProfileId}`, authParams);
  check(recsRes, { 'recs load is 200': (r) => r.status === 200 });

  // Step 4: Secure Playback Link Dispenser (Streaming Service)
  const randomMovieId = Math.floor(Math.random() * 8) + 1; // 8 seeded movies
  const streamRes = http.get(`${BASE_URL}/api/stream/${randomMovieId}`, authParams);
  check(streamRes, { 'stream URL fetch is 200': (r) => r.status === 200 });

  // Step 5: Save playback history progress update (User Service)
  const progressPayload = JSON.stringify({
    movieId: String(randomMovieId),
    profileId: activeProfileId,
    progressSeconds: 120,
    durationSeconds: 7200,
  });
  
  const historyRes = http.post(`${BASE_URL}/api/history`, progressPayload, authParams);
  check(historyRes, { 'history updated is 200': (r) => r.status === 200 });

  sleep(Math.random() * 3 + 1); // Simulate user thinking / browsing duration
}
