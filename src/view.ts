import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Editor, EditorPosition, setIcon } from 'obsidian';
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { commandMap, executeCommand } from './components/chat/Commands';
import { getActiveFileContent } from './components/editor/ReferenceCurrentNote';
import { addMessage, updateUnresolvedInternalLinks } from './components/chat/Message';
import { displayUserMessage } from './components/chat/UserMessage';
import { displayBotMessage, displayErrorBotMessage } from './components/chat/BotMessage';
import { fetchOpenAIAPIResponseStream, 
        fetchOpenAIAPIResponse, 
        fetchOllamaResponse, 
        fetchOllamaResponseStream, 
        fetchRESTAPIURLResponse, 
        fetchRESTAPIURLResponseStream, 
        fetchMistralResponse, 
        fetchMistralResponseStream, 
        fetchGoogleGeminiResponse, 
        fetchAnthropicResponse, 
        fetchOpenRouterResponseStream,
        fetchOpenRouterResponse,
        fetchGoogleGeminiResponseStream} from './components/FetchModelResponse';

export const VIEW_TYPE_CHATBOT = 'chatbot-view';
export const ANTHROPIC_MODELS = ['claude-instant-1.2', 'claude-2.0', 'claude-2.1', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-5-haiku-latest'];
export const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];

export function fileNameMessageHistoryJson(plugin: BMOGPT) {
    const filenameMessageHistoryPath = './.obsidian/plugins/bmo-chatbot/data/';
    const currentProfileMessageHistory = 'messageHistory_' + plugin.settings.profiles.profile.replace('.md', '.json');

    return filenameMessageHistoryPath + currentProfileMessageHistory;
}

export let messageHistory: { role: string; content: string; images: Uint8Array[] | string[] }[] = [];

export let lastCursorPosition: EditorPosition = {
    line: 0,
    ch: 0,
}

export let lastCursorPositionFile: TFile | null = null;
export let activeEditor: Editor | null | undefined = null;

export class BMOView extends ItemView {
    private settings: BMOSettings;
    private textareaElement: HTMLTextAreaElement;
    private preventEnter = false;
    private plugin: BMOGPT;

    constructor(leaf: WorkspaceLeaf, settings: BMOSettings, plugin: BMOGPT) {
        super(leaf);
        this.settings = settings;
        this.plugin = plugin;
        this.icon = 'bot';
        this.addCursorLogging();
    }

    getViewType() {
        return VIEW_TYPE_CHATBOT;
    }

    getDisplayText() {
        return 'BMO Chatbot';
    }
    
    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        const chatbotContainer = container.createEl('div', {
            attr: {
                class: 'chatbotContainer',
            },
        });

        const header = chatbotContainer.createEl('div', {
            attr: {
                id: 'header',
            },
        });
        
        const chatbotNameHeading = chatbotContainer.createEl('h1', { 
            text: this.settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName,
            attr: {
                id: 'chatbotNameHeading'
            }
        });

        // Models dropdown
        const modelOptions = populateModelDropdown(this.plugin, this.settings);

        const dotIndicator = chatbotContainer.createEl('span', {
            attr: {
                class: 'dotIndicator',
                id: 'markDownBoolean'
            }
        });
        
        const referenceCurrentNoteElement = chatbotContainer.createEl('p', {
            text: 'Reference Current Note',
            attr: {
                id: 'referenceCurrentNote'
            }
        });

        header.appendChild(chatbotNameHeading);
        header.appendChild(modelOptions);

        referenceCurrentNoteElement.appendChild(dotIndicator);

        referenceCurrentNoteElement.style.display = 'none';
        
        if (referenceCurrentNoteElement) {
            if (this.settings.general.enableReferenceCurrentNote) {
                referenceCurrentNoteElement.style.display = 'block';
            } else {
                referenceCurrentNoteElement.style.display = 'none';
            }
        }
    
        const messageContainer = chatbotContainer.createEl('div', {
            attr: {
                id: 'messageContainer',
            },
        });

        if (this.settings.appearance.enableHeader) {
            header.style.display = 'block';
        }
        else {
            header.style.display = 'none';
            messageContainer.style.maxHeight = 'calc(100% - 60px)';
            referenceCurrentNoteElement.style.margin = '0.5rem 0 0.5rem 0';
        }
        
        await loadData(this.plugin);
        
        messageContainer.id = 'messageContainer';
        
        messageHistory.forEach(async (messageData) => {   
            if (messageData.role == 'user') {
                const userMessageDiv = displayUserMessage(this.plugin, this.settings, messageData.content);
                messageContainer.appendChild(userMessageDiv);
            }
        
            if (messageData.role == 'assistant') {
                const botMessageDiv = displayBotMessage(this.plugin, this.settings, messageHistory, messageData.content);

                updateUnresolvedInternalLinks(this.plugin, botMessageDiv);
                messageContainer.appendChild(botMessageDiv);
            }
        });

        // Open notes/links from chatbot
        messageContainer.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.classList.contains('internal-link')) {
                const link = target as HTMLAnchorElement;
                const linkName = link.getAttribute('data-href') || '';
                this.plugin.app.workspace.openLinkText(linkName, '', false);
                link.style.color = 'var(--link-color)';
            }
        });
        
        const parentElement = document.getElementById('parentElementId');
        parentElement?.appendChild(messageContainer);

        const chatbox = chatbotContainer.createEl('div', {
            attr: {
                class: 'chatbox',
            }
        });

        const textarea = document.createElement('textarea');
        textarea.setAttribute('contenteditable', true.toString());
        textarea.setAttribute('placeholder', 'Start typing...');


        if (textarea) {
            textarea.style.color = this.settings.appearance.chatBoxFontColor;
            
            // Set the placeholder color to the default value
            const style = document.createElement('style');
            style.textContent = `
                .chatbox textarea::placeholder {
                    color: ${this.settings.appearance.chatBoxFontColor} !important;
                }
            `;
            textarea.appendChild(style);
        }

        // Submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'send';
        setIcon(submitButton, 'arrow-up');
        submitButton.classList.add('submit-button');
        submitButton.title = 'send';


        submitButton.addEventListener('click', () => {
            this.handleKeyup(new KeyboardEvent('keyup', { key: 'Enter' }), true);
        });


        chatbotContainer.style.backgroundColor = this.settings.appearance.chatbotContainerBackgroundColor || DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor;
        messageContainer.style.backgroundColor = this.settings.appearance.messageContainerBackgroundColor || DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor;
        textarea.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        textarea.style.borderColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        textarea.style.color = this.settings.appearance.chatBoxFontColor || DEFAULT_SETTINGS.appearance.chatBoxFontColor;
        chatbox.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        submitButton.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;


        const userMessages = messageContainer.querySelectorAll('.userMessage');
        userMessages.forEach((userMessage: HTMLElement) => {
            userMessage.style.color = this.settings.appearance.userMessageFontColor || DEFAULT_SETTINGS.appearance.userMessageFontColor;
        });

        const botMessages = messageContainer.querySelectorAll('.botMessage');
        botMessages.forEach((botMessage: HTMLElement) => {
            botMessage.style.color = this.settings.appearance.botMessageFontColor || DEFAULT_SETTINGS.appearance.botMessageFontColor;
        });

        chatbox.appendChild(textarea);
        chatbox.appendChild(submitButton);
        
        this.textareaElement = textarea as HTMLTextAreaElement;
        this.addEventListeners();

        // Scroll to bottom of messageContainer
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    addEventListeners() {
        this.textareaElement.addEventListener('keyup', this.handleKeyup.bind(this));
        this.textareaElement.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textareaElement.addEventListener('input', this.handleInput.bind(this));
        this.textareaElement.addEventListener('blur', this.handleBlur.bind(this));
    }
    
    async handleKeyup(event: KeyboardEvent, fromSubmitButton = false) {
        // Check if it's mobile and return if true
        if ((document.body.classList.contains('is-mobile') || document.body.classList.contains('is-tablet')) && event.key === 'Enter' && !fromSubmitButton) {
            event.preventDefault();  // Prevent default to avoid any other actions like submit
            this.textareaElement.value += '\n';
            this.handleInput(event);  // Trigger the input event manually
            return;  // Exit the function early
        }
        
        const input = this.textareaElement.value;
        const index = messageHistory.length - 1;

        // Only allow /stop command to be executed during fetch
        if (this.settings.OllamaConnection.enableStream || 
            this.settings.RESTAPIURLConnection.enableStream || 
            this.settings.APIConnections.mistral.enableStream || 
            this.settings.APIConnections.openAI.enableStream) {
            if ((input === '/s' || input === '/stop') && event.key === 'Enter') {
                this.preventEnter = false;
                await executeCommand(input, this.settings, this.plugin);
            }
        }

        // Check if the input contains any internal links and replace them with the content of the linked file ([[]], ![[]], [[#]])
        const regex = /(!?)\[\[(.*?)\]\]/g;
        let matches;
        let inputModified = input;

        // Store all replacements to be made
        const replacements = new Map<string, string>();

        while ((matches = regex.exec(input)) !== null) {
            const exclamation = matches[1]; // Capture the optional exclamation mark
            const linktext = matches[2];
            // Split the linktext into path and subpath
            const [path, subpath] = linktext.split('#');
            
            const file = this.plugin.app.metadataCache.getFirstLinkpathDest(path, '');
            
            if (file && file instanceof TFile) {
                try {
                    const filePath = file.path; // Assuming file object has a path property
                    const fileExtension = filePath.split('.').pop();
                
                    // Check if the file extension is .md
                    if (fileExtension !== 'md') {
                        const isImageFile = /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|svg)$/i.test(filePath);

                        if (!this.plugin.settings.OllamaConnection.ollamaModels.includes(this.plugin.settings.general.model)) {
                            replacements.set(matches[0], `${exclamation}[[${matches[2]}]]<note-rendered>ERROR: File cannot be read.</note-rendered>`);
                        } else if (this.plugin.settings.OllamaConnection.ollamaModels.includes(this.plugin.settings.general.model)) {
                            if (!isImageFile) {
                                replacements.set(matches[0], `${exclamation}[[${matches[2]}]]<note-rendered>ERROR: File cannot be read.</note-rendered>`);
                            }
                        }
                        continue; // Skip to the next iteration
                    }

                    const content = await this.app.vault.read(file);
                    let contentToInsert = content;

                    // If there is a subpath, find the relevant section
                    if (subpath) {
                        const lines = content.split('\n');
                        let inSubpath = false;
                        const subpathContent = [];
                        let subpathLevel = 0;

                        for (const line of lines) {
                            if (line.startsWith('#')) {
                                const match = line.match(/^#+/);
                                const headingLevel = match ? match[0].length : 0;

                                if (inSubpath) {
                                    if (headingLevel <= subpathLevel) {
                                        break;
                                    }
                                }

                                if (!inSubpath && line.toLowerCase().includes(subpath.toLowerCase())) {
                                    inSubpath = true;
                                    subpathLevel = headingLevel;
                                }
                            }

                            if (inSubpath) {
                                subpathContent.push(line);
                            }
                        }

                        contentToInsert = subpathContent.join('\n');
                    }

                    // Prepare the replacement content
                    replacements.set(matches[0], `${exclamation}[[${matches[2]}]]<note-rendered>${contentToInsert}</note-rendered>`);
                } catch (err) {
                    console.error(`Failed to read the content of "${path}": ${err}`);
                }
            } else {
                // Handle case where the file does not exist or is not a TFile
                replacements.set(matches[0], `${exclamation}[[${matches[2]}]]<note-rendered>File cannot be read.</note-rendered>`);
            }
        }

        // Apply all replacements to inputModified
        for (const [original, replacement] of replacements) {
            inputModified = inputModified.split(original).join(replacement);
        }

        // Remove duplicates in the final output
        inputModified = inputModified.replace(/(<note-rendered>File cannot be read.<\/note-rendered>)+/g, '<note-rendered>File cannot be read.</note-rendered>');



        // console.log(`Modified input: ${inputModified}`);

        if (this.preventEnter === false && !event.shiftKey && event.key === 'Enter') {
            loadData(this.plugin);
            event.preventDefault();
            if (input.length === 0) {
                return;
            }
            
            const messageContainer = document.querySelector('#messageContainer');
            if (messageContainer) {
                const excludedCommands = [
                    '/c', 
                    '/clear', 
                    '/s', 
                    '/stop', 
                    '/save', 
                    '/load ',
                    '/m ', 
                    '/model ', 
                    '/models ', 
                    '/p ', 
                    '/profile ', 
                    '/prof ', 
                    '/profiles ', 
                    '/prompt ', 
                    '/prompts ', 
                    '/append', 
                    '/reference ',
                    '/ref ',
                    '/maxtokens',
                    '/maxtokens ',
                    '/temperature',
                    '/temperature ',
                    '/temp',
                    '/temp ',
                ];

                if (!excludedCommands.some(cmd => input.startsWith(cmd))) {
                    const parts = input.split(' '); // Splits the input on spaces
                    const baseCommand = parts[0]; // The base command is the first part
                
                    if (baseCommand.startsWith('/') && commandMap.hasOwnProperty(baseCommand)) {
                        // This block handles recognized commands with or without parameters
                        addMessage(this.plugin, input, 'userMessage', this.settings, index);
                        const userMessageDiv = displayUserMessage(this.plugin, this.settings, input);
                        messageContainer.appendChild(userMessageDiv);
                        // console.log('Command processed:', commandMap[baseCommand], 'with parameters:', parts.slice(1).join(' ')); // Logs the processed command and parameters
                    } else if (!baseCommand.startsWith('/')) {
                        // This block handles non-command inputs
                        // console.log('User input modified:', inputModified);
                        addMessage(this.plugin, inputModified, 'userMessage', this.settings, index);
                        const userMessageDiv = displayUserMessage(this.plugin, this.settings, input);
                        messageContainer.appendChild(userMessageDiv);
                    } else {
                        // console.log('Unknown command ignored:', input);
                    }
                }
                
                

                if (input.startsWith('/')) {
                    executeCommand(input, this.settings, this.plugin);


                    if (!excludedCommands.some(cmd => input.startsWith(cmd))) {
                        const botMessages = messageContainer.querySelectorAll('.botMessage');
                        const lastBotMessage = botMessages[botMessages.length - 1];
                        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }   
                else {
                    this.preventEnter = true;

                    // Call the chatbot function with the user's input
                    this.BMOchatbot()
                        .then(() => {
                            this.preventEnter = false;
                        })
                        .catch(() => {
                            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
                            const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, 'Oops, something went wrong. Please try again.');
                            messageContainer.appendChild(botMessageDiv);
                        });
                }
            }

            this.textareaElement.value = '';
            this.textareaElement.style.height = '29px';
            this.textareaElement.value = this.textareaElement.value.trim();
            this.textareaElement.setSelectionRange(0, 0);
        }
    }

    handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
        }
    }

    handleInput(event: Event) {
        this.textareaElement.style.height = '29px';
        this.textareaElement.style.height = this.textareaElement.scrollHeight + 'px';
    }

    handleBlur(event: Event) {
        if (!this.textareaElement.value) {
            this.textareaElement.style.height = '29px';
        }
    }

    exportSettings() {
        return this.settings;
    }

    addCursorLogging() {
        const updateCursorPosition = async () => {
            await getActiveFileContent(this.plugin, this.settings); 
            const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const cursor = view.editor.getCursor();
                lastCursorPositionFile = this.plugin.app.workspace.getActiveFile();
                if (cursor != null && this.plugin.app.workspace.activeEditor != null) {
                    lastCursorPosition = cursor;
                    activeEditor = view.editor;
                }
            }
        };

        activeWindow.addEventListener('click', updateCursorPosition);
        activeWindow.addEventListener('keyup', updateCursorPosition);
        activeWindow.addEventListener('keydown', updateCursorPosition);
        activeWindow.addEventListener('input', updateCursorPosition);
    }

    
    cleanup() {
        this.textareaElement.removeEventListener('keyup', this.handleKeyup.bind(this));
        this.textareaElement.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textareaElement.removeEventListener('input', this.handleInput.bind(this));
        this.textareaElement.removeEventListener('blur', this.handleBlur.bind(this));
    }

    async BMOchatbot() {      
        await getActiveFileContent(this.plugin, this.settings);
        const index = messageHistory.length - 1;

        // If model does not exist.
        if (this.settings.general.model === '') {
            const errorMessage = 'Model not found.';

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, errorMessage);
            messageContainer.appendChild(botMessageDiv);

            const botMessages = messageContainer.querySelectorAll('.botMessage');
            const lastBotMessage = botMessages[botMessages.length - 1];
            lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } 
        else {
            // Fetch OpenAI API
            if (this.settings.OllamaConnection.ollamaModels.includes(this.settings.general.model)) {
                if (this.settings.OllamaConnection.enableStream) {
                    await fetchOllamaResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchOllamaResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(this.settings.general.model)){
                if (this.settings.RESTAPIURLConnection.enableStream) {
                    await fetchRESTAPIURLResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchRESTAPIURLResponse(this.plugin, this.settings, index);
                }
            }
            else if (ANTHROPIC_MODELS.includes(this.settings.general.model)) {
                await fetchAnthropicResponse(this.plugin, this.settings, index);
            }
            else if (this.settings.APIConnections.mistral.mistralModels.includes(this.settings.general.model)) {
                if (this.settings.APIConnections.mistral.enableStream) {
                    await fetchMistralResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchMistralResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.APIConnections.googleGemini.geminiModels.includes(this.settings.general.model)) {
                if (this.settings.APIConnections.googleGemini.enableStream) {
                    await fetchGoogleGeminiResponseStream(this.plugin, this.settings, index);
                } else {
                    await fetchGoogleGeminiResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.APIConnections.openAI.openAIBaseModels.includes(this.settings.general.model)) {
                if (this.settings.APIConnections.openAI.enableStream) {
                    await fetchOpenAIAPIResponseStream(this.plugin, this.settings, index); 
                }
                else {
                    await fetchOpenAIAPIResponse(this.plugin, this.settings, index); 
                }
            }
            else if (this.settings.APIConnections.openRouter.openRouterModels.includes(this.settings.general.model)){
                if (this.settings.APIConnections.openRouter.enableStream) {
                    await fetchOpenRouterResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchOpenRouterResponse(this.plugin, this.settings, index);
                }
            }
            else {
                const errorMessage = 'Connection not found.';

                const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
                const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, errorMessage);
                messageContainer.appendChild(botMessageDiv);

                const botMessages = messageContainer.querySelectorAll('.botMessage');
                const lastBotMessage = botMessages[botMessages.length - 1];
                lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        }
        // console.log('BMO settings:', this.settings);
    }

    async onClose() {
        // Nothing to clean up.
    }

}

// Create data folder and load JSON file
async function loadData(plugin: BMOGPT) {
    if (!await plugin.app.vault.adapter.exists('./.obsidian/plugins/bmo-chatbot/data/')) {
        plugin.app.vault.adapter.mkdir('./.obsidian/plugins/bmo-chatbot/data/');
    }

    if (await plugin.app.vault.adapter.exists(fileNameMessageHistoryJson(plugin))) {
        try {
            const fileContent = await plugin.app.vault.adapter.read(fileNameMessageHistoryJson(plugin));

            if (fileContent.trim() === '') {
                messageHistory = [];
            } else {
                messageHistory = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Error processing message history:', error);
        }
    } else {
        messageHistory = [];
    }
}

// Delete all messages from the messageContainer and the messageHistory array
export async function deleteAllMessages(plugin: BMOGPT) {
    const messageContainer = document.querySelector('#messageContainer');

    // Remove all child nodes from the messageContainer
    if (messageContainer) {
        while (messageContainer.firstChild) {
            messageContainer.removeChild(messageContainer.firstChild);
        }
    }

    // Clear the messageHistory array
    messageHistory = [];

    // Write an empty array to the messageHistory.json file
    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), jsonString);
    } catch (error) {
        console.error('Error writing messageHistory.json', error);
    }
}

export function populateModelDropdown(plugin: BMOGPT, settings: BMOSettings): HTMLSelectElement {
    const modelOptions = document.createElement('select');
    modelOptions.id = 'modelOptions';

    if (modelOptions) {
        modelOptions.innerHTML = ''; // Clear existing options
    }

    const defaultModel = settings.general.model || DEFAULT_SETTINGS.general.model;

    // Get models as arrays
    const modelGroups = [
        { name: 'Ollama Models', models: settings.OllamaConnection.ollamaModels },
        { name: 'REST API Models', models: settings.RESTAPIURLConnection.RESTAPIURLModels },
        { name: 'Anthropic Models', models: settings.APIConnections.anthropic.anthropicModels },
        { name: 'Google Gemini Models', models: settings.APIConnections.googleGemini.geminiModels },
        { name: 'Mistral Models', models: settings.APIConnections.mistral.mistralModels },
        { name: 'OpenAI-Based Models', models: settings.APIConnections.openAI.openAIBaseModels },
        { name: 'OpenRouter Models', models: settings.APIConnections.openRouter.openRouterModels }
    ];

    if (defaultModel === '') {
        const optionEl = document.createElement('option');
        optionEl.textContent = 'No Model';
        optionEl.value = '';
        optionEl.selected = true;
        modelOptions.appendChild(optionEl);
    }
    
    modelGroups.forEach(group => {
        if (group.models.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.name;
            group.models.forEach(model => {
                const optionEl = document.createElement('option');
                optionEl.textContent = model;
                optionEl.value = model;
                if (model === defaultModel) {
                    optionEl.selected = true;
                }
                optgroup.appendChild(optionEl);
            });
            modelOptions.appendChild(optgroup);
        }
    });

    modelOptions.addEventListener('change', async function() {
        plugin.settings.general.model = this.value;
        await plugin.saveSettings();
    });

    return modelOptions;
}