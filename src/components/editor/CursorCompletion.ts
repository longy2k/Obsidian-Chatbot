import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import BMOGPT, { BMOSettings } from 'src/main';
import { 
    fetchOllamaResponseEditor,
    fetchRESTAPIURLDataEditor,
    fetchRESTAPIURLDataEditorStream,
    fetchAnthropicResponseEditor,
    fetchMistralDataEditor,
    fetchMistralDataEditorStream,
    fetchGoogleGeminiDataEditor,
    fetchGoogleGeminiDataEditorStream,
    fetchOpenAIBaseAPIResponseEditor,
    fetchOpenAIBaseAPIResponseEditorStream,
    fetchOpenRouterEditor,
    fetchOpenRouterEditorStream
} from '../FetchModelEditor';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from 'src/view';

let abortController: AbortController | null = null;

export function stopCompletion() {
    if (abortController) {
        abortController.abort();
        abortController = null;
        new Notice('Completion stopped');
    }
}

export async function cursorCompletionCommand(plugin: BMOGPT & Plugin, settings: BMOSettings) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        new Notice('No active markdown view');
        return;
    }

    const editor = view.editor;
    const selection = editor.getSelection();
    const cursor = editor.getCursor();
    let contextText: string;
    let insertPosition = cursor;

    if (selection && selection.trim() !== '') {
        // If text is selected, use only that as context
        contextText = selection;
        // Find the end of selection to insert completion there
        const selectionRange = editor.listSelections()[0];
        insertPosition = selectionRange.head.line > selectionRange.anchor.line || 
            (selectionRange.head.line === selectionRange.anchor.line && selectionRange.head.ch > selectionRange.anchor.ch) 
            ? selectionRange.head 
            : selectionRange.anchor;
    } else {
        // If no selection, use text up to cursor
        contextText = editor.getRange({ line: 0, ch: 0 }, cursor);
        if (!contextText) {
            new Notice('No text found before cursor');
            return;
        }
    }

    // Create new abort controller for this completion
    if (abortController) {
        abortController.abort();
    }
    abortController = new AbortController();

    const generatingNotice = new Notice('Generating...', 0);
    try {
        let response: string | undefined | null = '';

        // Use existing fetch methods with abort controller
        if (settings.OllamaConnection.RESTAPIURL && settings.OllamaConnection.ollamaModels.includes(settings.general.model)) {
            response = await fetchOllamaResponseEditor(
                settings,
                contextText,
                undefined,
                undefined,
                undefined,
                abortController.signal,
                plugin.app
            );
        }
        else if (settings.RESTAPIURLConnection.RESTAPIURL && settings.RESTAPIURLConnection.RESTAPIURLModels.includes(settings.general.model)) {
            if (settings.RESTAPIURLConnection.enableStream) {
                response = await fetchRESTAPIURLDataEditorStream(
                    settings,
                    contextText,
                    editor,
                    insertPosition,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            } else {
                response = await fetchRESTAPIURLDataEditor(
                    settings,
                    contextText,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            }
        }
        else if (ANTHROPIC_MODELS.includes(settings.general.model)) {
            response = await fetchAnthropicResponseEditor(settings, contextText, undefined, undefined, undefined, abortController.signal, plugin.app);
        }
        else if (settings.APIConnections.mistral.mistralModels.includes(settings.general.model)) {
            if (settings.APIConnections.mistral.enableStream) {
                response = await fetchMistralDataEditorStream(
                    settings,
                    contextText,
                    editor,
                    insertPosition,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            } else {
                response = await fetchMistralDataEditor(
                    settings,
                    contextText,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            }
        }
        else if (settings.APIConnections.googleGemini.geminiModels.includes(settings.general.model)) {
            if (settings.APIConnections.googleGemini.enableStream) {
                response = await fetchGoogleGeminiDataEditorStream(
                    settings,
                    contextText,
                    editor,
                    insertPosition,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            } else {
                response = await fetchGoogleGeminiDataEditor(
                    settings,
                    contextText,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            }
        }
        else if (OPENAI_MODELS.includes(settings.general.model) || 
                (settings.APIConnections.openAI.openAIBaseUrl !== 'https://api.openai.com/v1' && 
                settings.APIConnections.openAI.openAIBaseModels.includes(settings.general.model))) {
            if (settings.APIConnections.openAI.enableStream) {
                response = await fetchOpenAIBaseAPIResponseEditorStream(
                    settings,
                    contextText,
                    editor,
                    insertPosition,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            } else {
                response = await fetchOpenAIBaseAPIResponseEditor(
                    settings,
                    contextText,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            }
        }
        else if (settings.APIConnections.openRouter.openRouterModels.includes(settings.general.model)) {
            if (settings.APIConnections.openRouter.enableStream) {
                response = await fetchOpenRouterEditorStream(
                    settings,
                    contextText,
                    editor,
                    insertPosition,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            } else {
                response = await fetchOpenRouterEditor(
                    settings,
                    contextText,
                    undefined,
                    undefined,
                    undefined,
                    abortController.signal,
                    plugin.app
                );
            }
        }
        else {
            throw new Error('No compatible model found');
        }

        if (response) {
            // Insert response at cursor position
            editor.replaceRange(response, insertPosition);
        }

        generatingNotice.hide();
        new Notice('Generation complete');
    } catch (error) {
        if (error.name === 'AbortError') {
            new Notice('Generation stopped');
        } else if (error instanceof Error) {
            const errorMessage = error.message.includes('No compatible model found') 
                ? 'No compatible model found' 
                : `Error generating completion: ${error.message}`;
            new Notice(errorMessage);
            console.error('Cursor completion error:', error);
        } else {
            new Notice('Unknown error occurred during generation');
            console.error('Unknown cursor completion error:', error);
        }
    } finally {
        generatingNotice.hide();
        abortController = null;
    }
}
