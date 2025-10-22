// client/src/api.js
import axios from "axios";
/*console.log("API BASE URL: ", import.meta.env.VITE_API_BASE_URL); */

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
});

// Helper to set/clear auth everywhere
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
}

// look for saved/existing token
const bootToken = localStorage.getItem("token");
if (bootToken) setAuthToken(bootToken);

// catch 401 remove saved token redirect to login to avoid manual logout anytime request fails with 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      setAuthToken(null);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
