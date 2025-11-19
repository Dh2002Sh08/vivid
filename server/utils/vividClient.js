import axios from 'axios';

const VIVID_BASE = "https://www.vividseats.com/api";

export const vividClient = axios.create({
  baseURL: VIVID_BASE,
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    Accept: "application/json",
  },
});

// Alternative client for trying different base URLs
export const createVividClient = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.vividseats.com/',
      Origin: 'https://www.vividseats.com'
    }
  });
};

export async function proxyGet(path, query, res) {
  try {
    const { data } = await vividClient.get(path, { params: query });
    res.json(data);
  } catch (err) {
    console.error(`Proxy error [${path}]:`, err.response?.status, err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ message: err.response?.data?.message || "Proxy failed" });
  }
}