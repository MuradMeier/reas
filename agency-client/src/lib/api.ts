import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
export const createRequest = async (data: any) => {
  const response = await api.post('/requests/', data);
  return response.data;
};