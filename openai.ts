
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const getOpenAIResponse = async (prompt: string) => {
    const response = await axios.post(
        "https://api.openai.com/v1/completions",
        {
            model: "gpt-4-turbo",
            prompt: prompt,
            max_tokens: 100,
        },
        {
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        }
    );
    return response.data;
};
