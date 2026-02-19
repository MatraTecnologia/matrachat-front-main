import axios from 'axios'

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
    withCredentials: true, // necessário para o Better Auth enviar/receber cookies de sessão
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message ?? error.response?.data?.error ?? 'Erro inesperado.'
        return Promise.reject(new Error(message))
    }
)
