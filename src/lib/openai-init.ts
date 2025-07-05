import OpenAI from "openai";

const client = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    // fetch: fetch,
    dangerouslyAllowBrowser: true,
});

export default client;