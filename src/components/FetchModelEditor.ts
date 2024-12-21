import { App, Editor, EditorPosition, requestUrl } from 'obsidian';
import { BMOSettings } from '../main';
import { logRawPrompt } from '../utils/PromptLogger';

// Helper function to handle streaming responses
async function handleStreamingResponse(
    response: Response,
    editor: Editor,
    insertPosition: EditorPosition,
    contentExtractor: (json: any) => string | undefined
): Promise<string> {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

            try {
                const json = JSON.parse(line.replace(/^data: /, ''));
                const content = contentExtractor(json);
                if (content) {
                    const currentPosition = {
                        line: insertPosition.line,
                        ch: insertPosition.ch + accumulatedResponse.length
                    };
                    editor.replaceRange(content, currentPosition);
                    accumulatedResponse += content;
                }
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        }
    }

    return '';
}

// Helper function to handle errors
function handleError(error: any, context: string) {
    if (error.name === 'AbortError') {
        console.log('Request aborted');
    } else {
        console.error(`${context}:`, error);
        throw error;
    }
}

// Helper function to log prompts if enabled
async function logPromptIfEnabled(settings: BMOSettings, app: App | undefined, prompt: string, model: string | undefined, temperature: string | undefined, maxTokens: string | undefined) {
    if (app && settings.prompts.logRawPrompts) {
        await logRawPrompt(
            app.vault,
            settings,
            prompt,
            model || settings.general.model,
            settings.editor.systen_role,
            temperature || settings.general.temperature,
            maxTokens || settings.general.max_tokens
        );
    }
}

// Request response from Ollama REST API URL (editor)
export async function fetchOllamaResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    // Extract image links from the input
    const imageMatch = prompt.match(/!?\[\[(.*?)\]\]/g);
    const imageLink = imageMatch 
        ? imageMatch
            .map(item => item.startsWith('!') ? item.slice(3, -2) : item.slice(2, -2))
            .filter(link => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|svg)$/i.test(link))
        : [];

    // // Initialize an array to hold the absolute URLs
    const imagesVaultPath: Uint8Array[] | string[] | null = [];

    // Loop through each image link to get the full path
    if (imageLink.length > 0) {
        imageLink.forEach(link => {
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(link, '');
            const image = imageFile ? this.app.vault.adapter.getFullPath(imageFile.path) : null;
            if (image) {
                imagesVaultPath.push(image);
            }
        });
    }

    await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

    try {
        const response = await fetch(ollamaRESTAPIURL + '/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                system: settings.editor.systen_role,
                prompt: prompt,
                images: imagesVaultPath,
                stream: false,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: {
                    temperature: temperature ? parseFloat(temperature) : parseFloat(settings.general.temperature),
                    num_predict: maxTokens ? parseInt(maxTokens) : parseInt(settings.general.max_tokens),
                },
            }),
            signal: signal,
        });
        const data = await response.json();
        const message = data.response.trim();
        return message;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request aborted');
        } else {
            console.error('Ollama request:', error);
            throw error;
        }
    }
}

// Request response from openai-based rest api url (editor) with streaming
export async function fetchRESTAPIURLDataEditorStream(
    settings: BMOSettings, 
    prompt: string,
    editor: Editor,
    insertPosition: EditorPosition,
    model?: string, 
    temperature?: string, 
    maxTokens?: string, 
    signal?: AbortSignal, 
    app?: App
) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

        const response = await fetch(settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.systen_role || 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens || '-1'),
                temperature: parseFloat(temperature || settings.general.temperature),
                stream: true
            }),
            signal: signal
        });

        return await handleStreamingResponse(response, editor, insertPosition, 
            (json) => json.choices[0].delta?.content);
    } catch (error) {
        handleError(error, 'REST API URL request');
        return '';
    }
}

// Request response from openai-based rest api url (editor)
export async function fetchRESTAPIURLDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
        const response = await fetch(settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.systen_role || 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens || '-1'),
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const message = data.choices[0].message.content.trim();
        return message;

    } catch (error) {
        handleError(error, 'REST API URL request');
        return '';
    }
}

// Fetch Anthropic API Editor
export async function fetchAnthropicResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
        const response = await requestUrl({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.APIConnections.anthropic.APIKey,
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                system: settings.editor.systen_role,
                messages: [
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
        });

        const message = response.json.content[0].text.trim();
        return message;

    } catch (error) {
        handleError(error, 'Anthropic request');
        return '';
    }
}

// Fetch Google Gemini API Editor with streaming
export async function fetchGoogleGeminiDataEditorStream(
    settings: BMOSettings, 
    prompt: string,
    editor: Editor,
    insertPosition: EditorPosition,
    model?: string, 
    temperature?: string, 
    maxTokens?: string, 
    signal?: AbortSignal, 
    app?: App
) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${settings.APIConnections.googleGemini.APIKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: settings.editor.systen_role + prompt }
                        ]
                    }
                ],
                model: model || settings.general.model,
                generationConfig: {
                    temperature: parseFloat(temperature || settings.general.temperature),
                    maxOutputTokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                }
            }),
            signal: signal,
        });

        return await handleStreamingResponse(response, editor, insertPosition, 
            (json) => json.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (error) {
        handleError(error, 'Google Gemini request');
        return '';
    }
}

// Fetch Google Gemini API Editor
export async function fetchGoogleGeminiDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.APIConnections.googleGemini.APIKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: settings.editor.systen_role + prompt }
                        ]
                    }
                ],
                model: model || settings.general.model,
                generationConfig: {
                    temperature: parseFloat(temperature || settings.general.temperature),
                    maxOutputTokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                }
            }),
            signal: signal,
        });

        const data = await response.json();
        const message = data.candidates[0].content.parts[0].text.trim();
        return message;
    } catch (error) {
        handleError(error, 'Google Gemini request');
        return '';
    }
}

// Fetch Mistral API Editor with streaming
export async function fetchMistralDataEditorStream(
    settings: BMOSettings, 
    prompt: string,
    editor: Editor,
    insertPosition: EditorPosition,
    model?: string, 
    temperature?: string, 
    maxTokens?: string, 
    signal?: AbortSignal, 
    app?: App
) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.systen_role },
                    { role: 'user', content: prompt }
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseFloat(temperature || settings.general.temperature),
                stream: true
            }),
            signal: signal,
        });

        return await handleStreamingResponse(response, editor, insertPosition, 
            (json) => json.choices[0].delta?.content);
    } catch (error) {
        handleError(error, 'Mistral request');
        return '';
    }
}

// Fetch Mistral API Editor
export async function fetchMistralDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
              model: model || settings.general.model,
              messages: [
                { role: 'system', content: settings.editor.systen_role },
                { role: 'user', content: prompt }
              ],
              max_tokens: parseInt(maxTokens || settings.general.max_tokens),
              temperature: parseFloat(temperature || settings.general.temperature),
            }),
            signal: signal,
        });
        
        const data = await response.json();
        const message = data.choices[0].message.content.trim();
        return message;

    } catch (error) {
        handleError(error, 'Mistral request');
        return '';
    }
}

// Fetch OpenAI-Based API Editor with streaming
export async function fetchOpenAIBaseAPIResponseEditorStream(
    settings: BMOSettings, 
    prompt: string,
    editor: Editor,
    insertPosition: EditorPosition,
    model?: string, 
    temperature?: string, 
    maxTokens?: string, 
    signal?: AbortSignal, 
    app?: App
) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

        const response = await fetch(`${settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openAI.APIKey}`,
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseFloat(temperature || settings.general.temperature),
                stream: true,
                messages: [
                    { role: 'system', content: settings.editor.systen_role },
                    { role: 'user', content: prompt}
                ],
            }),
            signal: signal,
        });

        return await handleStreamingResponse(response, editor, insertPosition, 
            (json) => json.choices[0].delta?.content);
    } catch (error) {
        handleError(error, 'OpenAI Base API request');
        return '';
    }
}

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
    const response = await fetch(`${settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.APIConnections.openAI.APIKey}`,
        },
        body: JSON.stringify({
            model: model || settings.general.model,
            max_tokens: parseInt(maxTokens || settings.general.max_tokens),
            temperature: parseFloat(temperature || settings.general.temperature),
            stream: false,
            messages: [
                { role: 'system', content: settings.editor.systen_role },
                { role: 'user', content: prompt}
            ],
        }),
        signal: signal,
    });
      
    const data = await response.json();
    const message = data.choices[0].message.content || '';
    return message;
}

// Request response from OpenRouter with streaming
export async function fetchOpenRouterEditorStream(
    settings: BMOSettings, 
    prompt: string,
    editor: Editor,
    insertPosition: EditorPosition,
    model?: string, 
    temperature?: string, 
    maxTokens?: string, 
    signal?: AbortSignal, 
    app?: App
) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.systen_role },
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseFloat(temperature || settings.general.temperature),
                stream: true
            }),
            signal: signal,
        });

        return await handleStreamingResponse(response, editor, insertPosition, 
            (json) => json.choices[0].delta?.content);
    } catch (error) {
        handleError(error, 'OpenRouter request');
        return '';
    }
}

// Request response from OpenRouter without streaming
export async function fetchOpenRouterEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal, app?: App) {
    try {
        await logPromptIfEnabled(settings, app, prompt, model, temperature, maxTokens);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.systen_role },
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
            signal: signal,
        });
        
        const data = await response.json();
        const message = data.choices[0].message.content.trim();
        return message;

    } catch (error) {
        handleError(error, 'OpenRouter request');
        return '';
    }
}
