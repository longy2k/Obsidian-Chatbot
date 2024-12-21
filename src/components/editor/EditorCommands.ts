import BMOGPT, { BMOSettings, DEFAULT_SETTINGS } from '../../main';
import { fetchModelRenameTitle } from './FetchRenameNoteTitle';
import { MarkdownView, Notice } from 'obsidian';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from '../../view';
import { 
    fetchOpenAIBaseAPIResponseEditor, 
    fetchOllamaResponseEditor, 
    fetchRESTAPIURLDataEditor, 
    fetchAnthropicResponseEditor, 
    fetchMistralDataEditor, 
    fetchGoogleGeminiDataEditor, 
    fetchOpenRouterEditor 
} from '../FetchModelEditor';

export async function renameTitleCommand(plugin: BMOGPT, settings: BMOSettings) {
    let uniqueNameFound = false;
    let modelRenameTitle;
    let folderName = plugin.app.vault.getAbstractFileByPath(plugin.app.workspace.getActiveFile()?.path || '')?.parent?.path || '';
    const fileExtension = '.md';
    const allFiles = plugin.app.vault.getFiles(); // Retrieve all files from the vault
    const activeFile = plugin.app.workspace.getActiveFile();
    let fileContent = '';
  
    try {
        new Notice('Generating title...');

        if (activeFile) {
            fileContent = await plugin.app.vault.read(activeFile);
        }
    
        if (folderName && !folderName.endsWith('/')) {
        folderName += '/';
        }
    
        // Function to check if a file name already exists
        const fileNameExists = (name: string | null) => {
            return allFiles.some((file) => file.path === folderName + name + fileExtension);
        };
    
        while (!uniqueNameFound) {
            modelRenameTitle = await fetchModelRenameTitle(settings, fileContent);
        
            if (!fileNameExists(modelRenameTitle)) {
                uniqueNameFound = true;
            }
        }
    
        const fileName = folderName + modelRenameTitle + fileExtension;
    
        if (activeFile) {
            plugin.app.vault.rename(activeFile, fileName);
        }

        new Notice('Renamed note title.');
    } catch (error) {
        console.error(error);
    }
}

// Prompt + Select + Generate command
export async function promptSelectGenerateCommand(plugin: BMOGPT, settings: BMOSettings, customPrompt?: string) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const select = customPrompt || view?.editor.getSelection();
    if (view && select && select.trim() !== '') {
        const generatingNotice = new Notice('Generating...', 0);
        if (settings.OllamaConnection.RESTAPIURL && settings.OllamaConnection.ollamaModels.includes(settings.general.model)) {
            try {
                const response = await fetchOllamaResponseEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response ?? 'ERROR');

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + (response ?? 'ERROR').length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.RESTAPIURLConnection.RESTAPIURL && settings.RESTAPIURLConnection.RESTAPIURLModels.includes(settings.general.model)){
            try {
                const response = await fetchRESTAPIURLDataEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (ANTHROPIC_MODELS.includes(settings.general.model)) {
            try {
                const response = await fetchAnthropicResponseEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                view.editor.replaceSelection(response);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.APIConnections.googleGemini.geminiModels.includes(settings.general.model)) {
            try {
                const response = await fetchGoogleGeminiDataEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.APIConnections.mistral.mistralModels.includes(settings.general.model)) {
            try {
                const response = await fetchMistralDataEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (OPENAI_MODELS.includes(settings.general.model)) {
            try {
                const response = await fetchOpenAIBaseAPIResponseEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response || '');

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + (response?.length ?? 0)
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if ((settings.APIConnections.openAI.openAIBaseUrl != DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl) && settings.APIConnections.openAI.openAIBaseModels.includes(settings.general.model)){
            try {
                const response = await fetchOpenAIBaseAPIResponseEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response || '');

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + (response?.length ?? 0)
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.APIConnections.openRouter.openRouterModels.includes(settings.general.model)){
            try {
                const response = await fetchOpenRouterEditor(settings, select, undefined, undefined, undefined, undefined, plugin.app); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        generatingNotice.hide();
        new Notice('Generation complete.');
    }
    else {
        new Notice('No text selected.');    
    }
}
