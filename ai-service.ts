
import { Notice, requestUrl, RequestUrlParam } from "obsidian";
import { NotebookAgentSettings } from './settings';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class AIService {
    constructor(private settings: NotebookAgentSettings) {}

    async generate(messages: AIMessage[]): Promise<string> {
        if (this.settings.activeProvider === 'openai') {
            return this.callOpenAI(messages);
        } else if (this.settings.activeProvider === 'anthropic') {
            return this.callAnthropic(messages);
        } else if (this.settings.activeProvider === 'gemini') {
            return this.callGemini(messages);
        }
        return "Error: Unknown provider selected.";
    }

    private async callOpenAI(messages: AIMessage[]): Promise<string> {
        if (!this.settings.openaiApiKey) {
            new Notice("OpenAI API Key is missing.");
            return "Please provide an OpenAI API Key in settings.";
        }

        const url = 'https://api.openai.com/v1/chat/completions';

        const body = {
            model: this.settings.openaiModel || 'gpt-4o',
            messages: messages,
            temperature: 0.7
        };

        try {
            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.status !== 200) {
                console.error("OpenAI Error:", response);
                throw new Error(`OpenAI API Error: ${response.status}`);
            }

            return response.json.choices[0].message.content;
        } catch (error) {
            console.error(error);
            return `Error calling OpenAI: ${error.message}`;
        }
    }

    private async callAnthropic(messages: AIMessage[]): Promise<string> {
        if (!this.settings.anthropicApiKey) {
            new Notice("Anthropic API Key is missing.");
            return "Please provide an Anthropic API Key in settings.";
        }

        const url = 'https://api.anthropic.com/v1/messages';

        // Anthropic requires 'system' message to be separate
        // We concatenate all system messages (Prompt + Context)
        const systemMessages = messages.filter(m => m.role === 'system');
        const systemContent = systemMessages.map(m => m.content).join("\n\n");

        const otherMessages = messages.filter(m => m.role !== 'system');

        const body = {
            model: this.settings.anthropicModel || 'claude-3-5-sonnet-20240620',
            system: systemContent,
            messages: otherMessages,
            max_tokens: 4096
        };

        try {
            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'x-api-key': this.settings.anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

             if (response.status !== 200) {
                console.error("Anthropic Error:", response);
                throw new Error(`Anthropic API Error: ${response.status}`);
            }

            return response.json.content[0].text;
        } catch (error) {
             console.error(error);
            return `Error calling Anthropic: ${error.message}`;
        }
    }

    private async callGemini(messages: AIMessage[]): Promise<string> {
        if (!this.settings.geminiApiKey) {
            new Notice("Gemini API Key is missing.");
            return "Please provide a Gemini API Key in settings.";
        }

        // Simple mapping for Gemini REST API
        const model = this.settings.geminiModel || 'gemini-1.5-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.settings.geminiApiKey}`;

        // Transform messages to Gemini format
        const contents = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Concatenate all system messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const systemContent = systemMessages.map(m => m.content).join("\n\n");

        const body: any = {
            contents: contents
        };

        if (systemContent) {
            body.systemInstruction = {
                parts: [{ text: systemContent }]
            };
        }

        try {
             const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.status !== 200) {
                 console.error("Gemini Error:", response);
                 throw new Error(`Gemini API Error: ${response.status}`);
            }

            return response.json.candidates[0].content.parts[0].text;
        } catch (error) {
             console.error(error);
             return `Error calling Gemini: ${error.message}`;
        }
    }
}
