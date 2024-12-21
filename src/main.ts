import { DataWriteOptions, Plugin, TFile} from 'obsidian';
import { BMOView, VIEW_TYPE_CHATBOT, populateModelDropdown } from './view';
import { BMOSettingTab } from './settings';
import { promptSelectGenerateCommand, renameTitleCommand } from './components/editor/EditorCommands';
import { cursorCompletionCommand, stopCompletion } from './components/editor/CursorCompletion';
import { PromptInputModal } from './components/modals/PromptInputModal';
import { colorToHex, isValidHexColor } from './utils/ColorConverter';
import { bmoCodeBlockProcessor } from './components/editor/BMOCodeBlockProcessor';

export interface BMOSettings {
	profiles: {
		profile: string,
		profileFolderPath: string,
		lastLoadedChatHistoryPath: string | null,
		lastLoadedChatHistory: (string | null)[],
	},
	general: {
		model: string,
		system_role: string,
		max_tokens: string,
		temperature: string,
		enableReferenceCurrentNote: boolean,
	},
	appearance: {
		userName: string,
		chatbotName: string,
		chatbotContainerBackgroundColor: string,
		messageContainerBackgroundColor: string,
		userMessageFontColor: string,
		userMessageBackgroundColor: string,
		botMessageFontColor: string,
		botMessageBackgroundColor: string,
		chatBoxFontColor: string,
		chatBoxBackgroundColor: string,
		enableHeader: boolean,
		enableScrollBar: boolean,
		bmoGenerateBackgroundColor: string,
		bmoGenerateFontColor: string,
	},
	prompts: {
		prompt: string,
		promptFolderPath: string,
		rawPromptsFolderPath: string,
		logRawPrompts: boolean,
	},
	editor: {
		systen_role: string,
	},
	chatHistory: {
		chatHistoryPath: string,
		templateFilePath: string,
		allowRenameNoteTitle: boolean,
	}
	OllamaConnection: {
		RESTAPIURL: string,
		enableStream: boolean,
		ollamaParameters: {
			mirostat: string,
			mirostat_eta: string,
			mirostat_tau: string,
			num_ctx: string,
			num_gqa: string,
			num_thread: string,
			repeat_last_n: string,
			repeat_penalty: string,
			seed: string,
			stop: string[],
			tfs_z: string,
			top_k: string,
			top_p: string,
			min_p: string,
			keep_alive: string,
		},
		ollamaModels: string[],
	},
	RESTAPIURLConnection: {
		APIKey: string,
		RESTAPIURL: string,
		enableStream: boolean,
		RESTAPIURLModels: string[],
	},
	APIConnections: {
		anthropic: {
			APIKey: string,
			anthropicModels: string[],
		},
		googleGemini: {
			APIKey: string,
			enableStream: boolean,
			geminiModels: string[],
		},
		mistral: {
			APIKey: string,
			enableStream: boolean,
			mistralModels: string[],
		},
		openAI: {
			APIKey: string,
			openAIBaseUrl: string,
			enableStream: boolean,
			openAIBaseModels: string[],
		},
		openRouter: {
			APIKey: string,
			enableStream: boolean,
			openRouterModels: string[],
		},
	},
	toggleGeneralSettings: boolean,
	toggleAppearanceSettings: boolean,
	togglePromptSettings: boolean,
	toggleEditorSettings: boolean,
	toggleChatHistorySettings: boolean,
	toggleProfileSettings: boolean,
	toggleAPIConnectionSettings: boolean,
	toggleOpenAISettings: boolean,
	toggleMistralSettings: boolean,
	toggleGoogleGeminiSettings: boolean,
	toggleAnthropicSettings: boolean,
	toggleRESTAPIURLSettings: boolean,
	toggleOpenRouterSettings: boolean,
	toggleOllamaSettings: boolean,
	toggleAdvancedSettings: boolean,
}

export const DEFAULT_SETTINGS: BMOSettings = {
	profiles: {
		profile: 'BMO.md',
		profileFolderPath: 'BMO/Profiles',
		lastLoadedChatHistoryPath: null,
		lastLoadedChatHistory: [],
	},
	general: {
		model: '',
		system_role: 'You are a helpful assistant.',
		max_tokens: '',
		temperature: '1.00',
		enableReferenceCurrentNote: false,
	},
	appearance: {
		userName: 'YOU',
		chatbotName: 'BMO',
		chatbotContainerBackgroundColor: '--background-secondary',
		messageContainerBackgroundColor: '--background-secondary',
		userMessageFontColor: '--text-normal',
		userMessageBackgroundColor: '--background-primary',
		botMessageFontColor: '--text-normal',
		botMessageBackgroundColor: '--background-secondary',
		chatBoxFontColor: '--text-normal',
		chatBoxBackgroundColor: '--interactive-accent',
		enableHeader: true,
		enableScrollBar: false,
		bmoGenerateBackgroundColor: '#0c0a12',
		bmoGenerateFontColor: '--text-normal',
	},
	prompts: {
		prompt: '',
		promptFolderPath: 'BMO/Prompts',
		rawPromptsFolderPath: 'BMO/raw-prompts',
		logRawPrompts: false,
	},
	editor: {
		systen_role: 'You are a helpful assistant.',
	},
	chatHistory: {
		chatHistoryPath: 'BMO/History',
		templateFilePath: '',
		allowRenameNoteTitle: false,
	},
	OllamaConnection: {
		RESTAPIURL: 'http://localhost:11434',
		enableStream: true,
		ollamaParameters: {
			mirostat: '0',
			mirostat_eta: '0.10',
			mirostat_tau: '5.00',
			num_ctx: '2048',
			num_gqa: '',
			num_thread: '',
			repeat_last_n: '64',
			repeat_penalty: '1.10',
			seed: '',
			stop: [],
			tfs_z: '1.00',
			top_k: '40',
			top_p: '0.90',
			min_p: '0.0',
			keep_alive: '',
		},
		ollamaModels: [],
	},
	RESTAPIURLConnection: {
		APIKey: '',	
		RESTAPIURL: '',
		enableStream: false,
		RESTAPIURLModels: [],
	},
	APIConnections: {
		anthropic: {
			APIKey: '',
			anthropicModels: [],
		},
		googleGemini: {
			APIKey: '',
			enableStream: false,
			geminiModels: [],
		},
		mistral: {
			APIKey: '',
			enableStream: false,
			mistralModels: [],
		},
		openAI: {
			APIKey: '',
			openAIBaseUrl: 'https://api.openai.com/v1',
			enableStream: true,
			openAIBaseModels: [],
		},
		openRouter: {
			APIKey: '',
			enableStream: false,
			openRouterModels: [],
		},
	},
	toggleGeneralSettings: true,
	toggleAppearanceSettings: false,
	togglePromptSettings: false,
	toggleEditorSettings: false,
	toggleChatHistorySettings: false,
	toggleProfileSettings: false,
	toggleAPIConnectionSettings: true,
	toggleOpenAISettings: false,
	toggleMistralSettings: false,
	toggleGoogleGeminiSettings: false,
	toggleAnthropicSettings: false,
	toggleRESTAPIURLSettings: true,
	toggleOpenRouterSettings: false,
	toggleOllamaSettings: true,
	toggleAdvancedSettings: false,
}

export let checkActiveFile: TFile | null = null;

export default class BMOGPT extends Plugin {
	settings: BMOSettings;

	async onload() {
		await this.loadSettings();

		const folderPath = this.settings.profiles.profileFolderPath || DEFAULT_SETTINGS.profiles.profileFolderPath;

		const defaultFilePath = `${folderPath}/${DEFAULT_SETTINGS.profiles.profile}`;
		const defaultProfile = this.app.vault.getAbstractFileByPath(defaultFilePath) as TFile;
	
		// Check if the folder exists, create it if not
		if (!await this.app.vault.adapter.exists(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		// Check if the 'Default.md' file exists, create it if not
		if (!await this.app.vault.adapter.exists(defaultFilePath)) {
			this.app.vault.create(defaultFilePath, '');
			console.log('Default profile created.');
		}

		this.registerEvent(
			this.app.vault.on('create', async (file: TFile) => {
			if (file instanceof TFile && file.path.startsWith(folderPath)) {
				const fileContent = await this.app.vault.read(file);
		
				// Check if the file content is empty
				if (fileContent.trim() === '') {
					// File content is empty, proceed with default front matter and appending content
					defaultFrontMatter(this, file);
				}

				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				if (this.settings.profiles.lastLoadedChatHistory.length === 0) {
					// Ensure each profile has a corresponding element in lastLoadedChatHistory
					profileFiles.forEach((profile, index) => {
						if (!this.settings.profiles.lastLoadedChatHistory[index]) {
						this.settings.profiles.lastLoadedChatHistory[index] = null;
						}
					});
				} else {
					if (this.settings.profiles.lastLoadedChatHistory.length !== profileFiles.length) {
						// Finding the index of the currentProfile in the profileFiles array
						const profileIndex = profileFiles.findIndex((profileFiles) => profileFiles.basename === file.basename);

						this.settings.profiles.lastLoadedChatHistory.splice(profileIndex, 0, null);
					}
				}


		
				await this.saveSettings();
			}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file: TFile) => {
				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				if (file instanceof TFile && file.path.startsWith(this.settings.chatHistory.chatHistoryPath)) {
					const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
					// Finding the index of the currentProfile in the profileFiles array
					const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);

					const currentIndex = this.settings.profiles.lastLoadedChatHistory.indexOf(file.path);

					if (this.settings.profiles.lastLoadedChatHistory[currentIndex] === file.path) {
						this.settings.profiles.lastLoadedChatHistory[currentIndex] = null;
					}

					if (profileIndex === currentIndex) {
						this.settings.profiles.lastLoadedChatHistoryPath = null;
					} 
				}

				if (file instanceof TFile && file.path.startsWith(folderPath)) {
					const filenameMessageHistory = './.obsidian/plugins/bmo-chatbot/data/' + 'messageHistory_' + file.name.replace('.md', '.json');
					this.app.vault.adapter.remove(filenameMessageHistory);

					const profileIndex = profileFiles.findIndex((profileFile) => profileFile.name > file.name);

					this.settings.profiles.lastLoadedChatHistory.splice(profileIndex, 1);

					if (file.path === defaultFilePath) {
						this.settings = DEFAULT_SETTINGS;
						this.app.vault.create(defaultFilePath, '');
						await updateSettingsFromFrontMatter(this, defaultProfile);
					}
					else {
						if (this.settings.profiles.profile === file.name) {
							this.settings.profiles.profile = DEFAULT_SETTINGS.profiles.profile;

							// Fetching files from the specified folder (profiles)
							const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

							// Sorting the files array alphabetically by file name
							profileFiles.sort((a, b) => a.name.localeCompare(b.name));
					
							const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
							// Finding the index of the currentProfile in the profileFiles array
							const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);

							if (this.settings.profiles.lastLoadedChatHistoryPath !== null) {
								this.settings.profiles.lastLoadedChatHistoryPath = this.settings.profiles.lastLoadedChatHistory[profileIndex];
							}

							const fileContent = (await this.app.vault.read(defaultProfile)).replace(/^---\s*[\s\S]*?---/, '').trim();
							this.settings.general.system_role = fileContent;
							await updateSettingsFromFrontMatter(this, defaultProfile);
						}
					}
				}
				await this.saveSettings();
			}
		));

		// Update frontmatter when the profile file is modified
		this.registerEvent(
			this.app.vault.on('modify', async (file: TFile) => {
				const currentProfilePath = `${folderPath}/${this.settings.profiles.profile}`;
				if (file.path === currentProfilePath) {
					await updateSettingsFromFrontMatter(this, file);
					const fileContent = (await this.app.vault.read(file)).replace(/^---\s*[\s\S]*?---/, '').trim();
					this.settings.general.system_role = fileContent;
					await this.saveSettings();
				}
			}
		));

		this.registerEvent(
			this.app.vault.on('rename', async (file: TFile, oldPath: string) => {
				try {
					const currentProfilePath = `${folderPath}/${this.settings.profiles.profile}`;
					if (oldPath === currentProfilePath) {
						this.settings.profiles.profile = file.name;
						this.settings.appearance.chatbotName = file.basename;
						await this.saveSettings();
					}

					if (file instanceof TFile && file.path.startsWith(folderPath)) {
						const filenameMessageHistoryPath = './.obsidian/plugins/bmo-chatbot/data/';
						const oldProfileMessageHistory = 'messageHistory_' + oldPath.replace(folderPath + '/', '').replace('.md', '.json');
					
						await this.app.vault.adapter.rename(filenameMessageHistoryPath + oldProfileMessageHistory, filenameMessageHistoryPath + 'messageHistory_' + file.name.replace('.md', '.json'))
						.catch((error) => {
							console.error('Error handling rename event:', error);
						});
					
						await this.app.vault.adapter.remove(filenameMessageHistoryPath + oldProfileMessageHistory);
					}
				} catch (error) {
					if (error.message.includes('ENOENT: no such file or directory, unlink')) {
						// Ignore the specific error and do nothing
					} else {
						console.error('Error handling rename event:', error);
					}
				}

				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				const currentIndex = profileFiles.findIndex((profileFile) => profileFile.path === file.path);

				const prevFileName = oldPath.replace(folderPath + '/', '');

				// Create a new array with prevFileName added
				const updatedProfileFiles = [...profileFiles, { name: prevFileName }];

				// Sort the updated array
				updatedProfileFiles.sort((a, b) => a.name.localeCompare(b.name));

				const fileIndex = updatedProfileFiles.findIndex((profileFile) => profileFile.name === file.name);

				// Remove the currentIndex from the updated array
				if (fileIndex !== -1) {
					updatedProfileFiles.splice(fileIndex, 1);
				} 

				const prevIndex = updatedProfileFiles.findIndex((profileFile) => profileFile.name === prevFileName);

				if (currentIndex !== -1) {
					const [removed] = this.settings.profiles.lastLoadedChatHistory.splice(prevIndex, 1);
					this.settings.profiles.lastLoadedChatHistory.splice(currentIndex, 0, removed);
				}

				const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
				// Finding the index of the currentProfile in the profileFiles array
				const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);


				// // Find and replace the oldPath with the new path in lastLoadedChatHistory
				const index = this.settings.profiles.lastLoadedChatHistory.indexOf(oldPath);


				if (this.settings.profiles.lastLoadedChatHistory[profileIndex] === oldPath) {
					this.settings.profiles.lastLoadedChatHistory[index] = file.path;
					this.settings.profiles.lastLoadedChatHistoryPath = file.path;
				} else if (this.settings.profiles.lastLoadedChatHistory[index] === oldPath) {
					this.settings.profiles.lastLoadedChatHistory[index] = file.path;
				}

				await this.saveSettings();
			})
		);

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleFileSwitch();
            })
        );

		this.registerView(
			VIEW_TYPE_CHATBOT,
			(leaf) => new BMOView(leaf, this.settings, this)
		);

		this.addRibbonIcon('bot', 'BMO Chatbot', () => {
			this.activateView();
		});

		this.addCommand({
            id: 'open-bmo-chatbot',
            name: 'Open BMO Chatbot',
            callback: () => {
                this.activateView();
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '0',
				},
            ],
        });

		this.addCommand({
            id: 'rename-note-title',
            name: 'Rename Note Title',
            callback: () => {
				renameTitleCommand(this, this.settings);
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '\'',
				},
            ],
        });

		// Register context menu items
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				// Add cursor completion
				menu.addItem((item) => {
					item
						.setTitle('BMO: Continue writing')
						.setIcon('bot')
						.onClick(() => cursorCompletionCommand(this, this.settings));
				});

				// Add if text is selected
				const selection = editor.getSelection();
				if (selection) {
					// Add send as prompt
					menu.addItem((item) => {
						item
							.setTitle('BMO: Send as prompt')
							.setIcon('message-square')
							.onClick(() => promptSelectGenerateCommand(this, this.settings));
					});

					// Add use as prompt context
					menu.addItem((item) => {
						item
							.setTitle('BMO: Use as prompt context')
							.setIcon('message-plus')
							.onClick(() => {
								new PromptInputModal(this.app, this, this.settings, selection).open();
							});
					});
				}
			})
		);

		// Add file menu items
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile)) {
					return;
				}
	
				menu.addItem((item) => {
					item
						.setTitle('BMO: Generate new title')
						.setIcon('text')
						.onClick(() => renameTitleCommand(this, this.settings));
				});
			})
		);

		// Register commands
		this.addCommand({
			id: 'cursor-completion',
			name: 'Continue writing from cursor',
			callback: () => cursorCompletionCommand(this, this.settings),
			hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: 'Enter',
				},
			],
		});

		this.addCommand({
			id: 'stop-completion',
			name: 'Stop current completion',
			callback: () => stopCompletion(),
			hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: 'Escape',
				},
			],
		});

		this.addCommand({
			id: 'prompt-select-generate',
			name: 'Send selection as prompt',
			callback: () => promptSelectGenerateCommand(this, this.settings),
			hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: '=',
				},
			],
		});

		// Add stop button to ribbon
		this.addRibbonIcon('square', 'Stop BMO completion', () => {
			stopCompletion();
		});

		// Register BMO code block processor
		bmoCodeBlockProcessor(this, this.settings);

		this.addSettingTab(new BMOSettingTab(this.app, this));
	}

	handleFileSwitch() {
		checkActiveFile = this.app.workspace.getActiveFile();
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT).forEach((leaf) => {
			const bmoView = leaf.view as BMOView;
	
			if (bmoView) {
				this.saveSettings();
			}
			
		});
		
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHATBOT);
	
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		await rightLeaf?.setViewState({
			type: VIEW_TYPE_CHATBOT,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		// Focus on the textarea
		const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
	
		if (textarea) {
			textarea.style.opacity = '0';
			textarea.style.transition = 'opacity 1s ease-in-out';
	
			setTimeout(() => {
				textarea.focus();
				textarea.style.opacity = '1';
			}, 50); 
		}
	
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		const messageContainer = document.querySelector('#messageContainer');
		if (messageContainer) {
			messageContainer.scroll({
				top: messageContainer.scrollHeight, 
				behavior: 'smooth' 
			});
		}
	}
	

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		const currentProfileFile = `${this.settings.profiles.profileFolderPath}/${this.settings.profiles.profile}`
		const currentProfile = this.app.vault.getAbstractFileByPath(currentProfileFile) as TFile;
		updateFrontMatter(this, currentProfile);

		// Update the model dropdown in the header
		const header = document.querySelector('#header') as HTMLElement;
		const modelOptions = header?.querySelector('#modelOptions');
		if (modelOptions) {
			modelOptions.remove();
		}
		const populateModelOptions = populateModelDropdown(this, this.settings);
		header?.appendChild(populateModelOptions);

		// Save the settings
		await this.saveData(this.settings);
	}
}

export async function defaultFrontMatter(plugin: BMOGPT, file: TFile) {
    // Define a callback function to modify the frontmatter
    const setDefaultFrontMatter = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        frontmatter.model = DEFAULT_SETTINGS.general.model;
        frontmatter.max_tokens = parseInt(DEFAULT_SETTINGS.general.max_tokens);
        frontmatter.temperature = parseFloat(DEFAULT_SETTINGS.general.temperature);
        frontmatter.enable_reference_current_note = DEFAULT_SETTINGS.general.enableReferenceCurrentNote;
		frontmatter.prompt = DEFAULT_SETTINGS.prompts.prompt;
		frontmatter.user_name = DEFAULT_SETTINGS.appearance.userName;
		// frontmatter.chatbot_name = DEFAULT_SETTINGS.appearance.chatbotName;
		frontmatter.enable_header = DEFAULT_SETTINGS.appearance.enableHeader;
		frontmatter.chatbot_container_background_color = DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor.replace(/^#/, '');
		frontmatter.message_container_background_color = DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor.replace(/^#/, '');
		frontmatter.user_message_font_color = DEFAULT_SETTINGS.appearance.userMessageFontColor.replace(/^#/, '');
		frontmatter.user_message_background_color = DEFAULT_SETTINGS.appearance.userMessageBackgroundColor.replace(/^#/, '');
		frontmatter.bot_message_font_color = DEFAULT_SETTINGS.appearance.botMessageFontColor.replace(/^#/, '');
		frontmatter.chatbot_message_background_color = DEFAULT_SETTINGS.appearance.botMessageBackgroundColor.replace(/^#/, '');
		frontmatter.chatbox_font_color = DEFAULT_SETTINGS.appearance.chatBoxFontColor.replace(/^#/, '');
		frontmatter.chatbox_background_color = DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor.replace(/^#/, '');
		frontmatter.bmo_generate_background_color = DEFAULT_SETTINGS.appearance.bmoGenerateBackgroundColor.replace(/^#/, '');
		frontmatter.bmo_generate_font_color = DEFAULT_SETTINGS.appearance.bmoGenerateFontColor.replace(/^#/, '');
		frontmatter.systen_role = DEFAULT_SETTINGS.editor.systen_role;
		frontmatter.ollama_mirostat = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat);
		frontmatter.ollama_mirostat_eta = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta);
		frontmatter.ollama_mirostat_tau = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau);
		frontmatter.ollama_num_ctx = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx);
		frontmatter.ollama_num_gqa = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa);
		frontmatter.ollama_num_thread = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread);
		frontmatter.ollama_repeat_last_n = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n);
		frontmatter.ollama_repeat_penalty = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty);
		frontmatter.ollama_seed = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed);
		frontmatter.ollama_stop = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.stop;
		frontmatter.ollama_tfs_z = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z);
		frontmatter.ollama_top_k = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k);
		frontmatter.ollama_top_p = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p);
		frontmatter.ollama_min_p = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p);
		frontmatter.ollama_keep_alive = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, setDefaultFrontMatter, writeOptions);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }

	plugin.app.vault.append(file, DEFAULT_SETTINGS.general.system_role);
}

export async function updateSettingsFromFrontMatter(plugin: BMOGPT, file: TFile){
    // Define a callback function to modify the frontmatter
    const updateSettings = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        plugin.settings.general.model = frontmatter.model;
		plugin.settings.general.max_tokens = frontmatter.max_tokens;
		plugin.settings.general.temperature = frontmatter.temperature;
		plugin.settings.general.enableReferenceCurrentNote = frontmatter.enable_reference_current_note;
		plugin.settings.prompts.prompt = frontmatter.prompt;
		plugin.settings.appearance.userName = frontmatter.user_name;
		plugin.settings.appearance.chatbotName = file.basename;
		plugin.settings.appearance.enableHeader = frontmatter.enable_header;
		plugin.settings.appearance.chatbotContainerBackgroundColor = '#' + frontmatter.chatbot_container_background_color;
		plugin.settings.appearance.messageContainerBackgroundColor = '#' + frontmatter.message_container_background_color;
		plugin.settings.appearance.userMessageFontColor = '#' + frontmatter.user_message_font_color;
		plugin.settings.appearance.userMessageBackgroundColor = '#' + frontmatter.user_message_background_color;
		plugin.settings.appearance.botMessageFontColor = '#' + frontmatter.bot_message_font_color;
		plugin.settings.appearance.botMessageBackgroundColor = '#' + frontmatter.chatbot_message_background_color;
		plugin.settings.appearance.chatBoxFontColor = '#' + frontmatter.chatbox_font_color;
		plugin.settings.appearance.chatBoxBackgroundColor = '#' + frontmatter.chatbox_background_color;
		plugin.settings.appearance.bmoGenerateBackgroundColor = '#' + frontmatter.bmo_generate_background_color;
		plugin.settings.appearance.bmoGenerateFontColor = '#' + frontmatter.bmo_generate_font_color;
		plugin.settings.editor.systen_role = frontmatter.systen_role;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat = frontmatter.ollama_mirostat;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = frontmatter.ollama_mirostat_eta;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = frontmatter.ollama_mirostat_tau;
		plugin.settings.OllamaConnection.ollamaParameters.num_ctx = frontmatter.ollama_num_ctx;
		plugin.settings.OllamaConnection.ollamaParameters.num_gqa = frontmatter.ollama_num_gqa;
		plugin.settings.OllamaConnection.ollamaParameters.num_thread = frontmatter.ollama_num_thread;
		plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = frontmatter.ollama_repeat_last_n;
		plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = frontmatter.ollama_repeat_penalty;
		plugin.settings.OllamaConnection.ollamaParameters.seed = frontmatter.ollama_seed;
		plugin.settings.OllamaConnection.ollamaParameters.stop = frontmatter.ollama_stop;
		plugin.settings.OllamaConnection.ollamaParameters.tfs_z = frontmatter.ollama_tfs_z;
		plugin.settings.OllamaConnection.ollamaParameters.top_k = frontmatter.ollama_top_k;
		plugin.settings.OllamaConnection.ollamaParameters.top_p = frontmatter.ollama_top_p;
		plugin.settings.OllamaConnection.ollamaParameters.min_p = frontmatter.ollama_min_p;
		plugin.settings.OllamaConnection.ollamaParameters.keep_alive = frontmatter.ollama_keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, updateSettings, writeOptions);
		const fileContent = (await plugin.app.vault.read(file)).replace(/^---\s*[\s\S]*?---/, '').trim();
		plugin.settings.general.system_role = fileContent;
		updateProfile(plugin, file);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }
}

export async function updateFrontMatter(plugin: BMOGPT, file: TFile){
    // Define a callback function to modify the frontmatter
    const modifyFrontMatter = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        frontmatter.model = plugin.settings.general.model;
        frontmatter.max_tokens = parseInt(plugin.settings.general.max_tokens);
        frontmatter.temperature = parseFloat(plugin.settings.general.temperature);
        frontmatter.enable_reference_current_note = plugin.settings.general.enableReferenceCurrentNote;
		frontmatter.prompt = plugin.settings.prompts.prompt.replace('.md', '');
		frontmatter.user_name = plugin.settings.appearance.userName;
		// frontmatter.chatbot_name = plugin.settings.appearance.chatbotName;
		frontmatter.enable_header = plugin.settings.appearance.enableHeader;
		frontmatter.chatbot_container_background_color = plugin.settings.appearance.chatbotContainerBackgroundColor.replace(/^#/, '');
		frontmatter.message_container_background_color = plugin.settings.appearance.messageContainerBackgroundColor.replace(/^#/, '');
		frontmatter.user_message_font_color = plugin.settings.appearance.userMessageFontColor.replace(/^#/, '');
		frontmatter.user_message_background_color = plugin.settings.appearance.userMessageBackgroundColor.replace(/^#/, '');
		frontmatter.bot_message_font_color = plugin.settings.appearance.botMessageFontColor.replace(/^#/, '');
		frontmatter.chatbot_message_background_color = plugin.settings.appearance.botMessageBackgroundColor.replace(/^#/, '');
		frontmatter.chatbox_font_color = plugin.settings.appearance.chatBoxFontColor.replace(/^#/, '');
		frontmatter.chatbox_background_color = plugin.settings.appearance.chatBoxBackgroundColor.replace(/^#/, '');
		frontmatter.bmo_generate_background_color = plugin.settings.appearance.bmoGenerateBackgroundColor.replace(/^#/, '');
		frontmatter.bmo_generate_font_color = plugin.settings.appearance.bmoGenerateFontColor.replace(/^#/, '');
		frontmatter.systen_role = plugin.settings.editor.systen_role;
		frontmatter.ollama_mirostat = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat);
		frontmatter.ollama_mirostat_eta = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta);
		frontmatter.ollama_mirostat_tau = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau);
		frontmatter.ollama_num_ctx = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_ctx);
		frontmatter.ollama_num_gqa = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_gqa);
		frontmatter.ollama_num_thread = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_thread);
		frontmatter.ollama_repeat_last_n = parseInt(plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n);
		frontmatter.ollama_repeat_penalty = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty);
		frontmatter.ollama_seed = parseInt(plugin.settings.OllamaConnection.ollamaParameters.seed);
		frontmatter.ollama_stop = plugin.settings.OllamaConnection.ollamaParameters.stop;
		frontmatter.ollama_tfs_z = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.tfs_z);
		frontmatter.ollama_top_k = parseInt(plugin.settings.OllamaConnection.ollamaParameters.top_k);
		frontmatter.ollama_top_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.top_p);
		frontmatter.ollama_min_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.min_p);
		frontmatter.ollama_keep_alive = plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, modifyFrontMatter, writeOptions);
		updateProfile(plugin, file);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }
}

export async function updateProfile(plugin: BMOGPT, file: TFile) {
	try {
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter: any) => {

			plugin.settings.general.model = frontmatter.model || DEFAULT_SETTINGS.general.model;

			if (frontmatter.max_tokens) {
				plugin.settings.general.max_tokens = frontmatter.max_tokens.toString();
				frontmatter.max_tokens = parseInt(plugin.settings.general.max_tokens);
			} else {
				plugin.settings.general.max_tokens = DEFAULT_SETTINGS.general.max_tokens;
			}

			if (frontmatter.temperature) {
				if (frontmatter.temperature < 0) {
					frontmatter.temperature = '0.00';
				} else if (frontmatter.temperature > 2) {
					frontmatter.temperature = '2.00';
				} else {
					plugin.settings.general.temperature = parseFloat(frontmatter.temperature).toFixed(2).toString();
					frontmatter.temperature = parseFloat(plugin.settings.general.temperature);
				}
			} else {
				plugin.settings.general.temperature = DEFAULT_SETTINGS.general.temperature;
				frontmatter.temperature = DEFAULT_SETTINGS.general.temperature;
			}

			plugin.settings.general.enableReferenceCurrentNote = frontmatter.enable_reference_current_note;

			const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote') as HTMLElement;
			if (referenceCurrentNoteElement) {
				if (frontmatter.enable_reference_current_note === true) {
					referenceCurrentNoteElement.style.display = 'block';
				} else {
					referenceCurrentNoteElement.style.display = 'none';
				}
			}

			if (frontmatter.prompt && (frontmatter.prompt !== '')) {
				plugin.settings.prompts.prompt = frontmatter.prompt + '.md'
			} else {
				plugin.settings.prompts.prompt = DEFAULT_SETTINGS.prompts.prompt;
			}

			if (frontmatter.user_name) {
				plugin.settings.appearance.userName = frontmatter.user_name.substring(0, 30);
			} else {
				plugin.settings.appearance.userName = DEFAULT_SETTINGS.appearance.userName;
			}
			frontmatter.user_name = plugin.settings.appearance.userName;

			const userNames = document.querySelectorAll('.userName') as NodeListOf<HTMLHeadingElement>;
			userNames.forEach(userName => {
				userName.textContent = plugin.settings.appearance.userName;
			});


			// if (frontmatter.chatbot_name) {
				// plugin.settings.appearance.chatbotName = frontmatter.chatbot_name.toUpperCase().substring(0, 30);
			// } else {
			// 	plugin.settings.appearance.chatbotName = DEFAULT_SETTINGS.appearance.chatbotName;
			// }
			// frontmatter.chatbot_name = plugin.settings.appearance.chatbotName;

			const chatbotNameHeading = document.querySelector('#chatbotNameHeading') as HTMLHeadingElement;
			const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
			if (chatbotNameHeading) {
				chatbotNameHeading.textContent = plugin.settings.appearance.chatbotName;
			}
			chatbotNames.forEach(chatbotName => {
				chatbotName.textContent = plugin.settings.appearance.chatbotName;
			});

			const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
			const messageContainer = document.querySelector('#messageContainer') as HTMLElement;

			if (isValidHexColor(frontmatter.chatbot_container_background_color)) {
				plugin.settings.appearance.chatbotContainerBackgroundColor = '#' + frontmatter.chatbot_container_background_color.substring(0, 6);
				if (chatbotContainer) {
					chatbotContainer.style.backgroundColor = plugin.settings.appearance.chatbotContainerBackgroundColor;
				}
			} else {
				plugin.settings.appearance.chatbotContainerBackgroundColor = colorToHex(DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor);
				frontmatter.chatbot_container_background_color = plugin.settings.appearance.chatbotContainerBackgroundColor.replace(/^#/, '');
				if (chatbotContainer) {
					const defaultChatbotContainerBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor).trim();
					chatbotContainer.style.backgroundColor = defaultChatbotContainerBackgroundColor;
				}
			}

			if (isValidHexColor(frontmatter.message_container_background_color)) {
				plugin.settings.appearance.messageContainerBackgroundColor = '#' + frontmatter.message_container_background_color.substring(0, 6);
				if (messageContainer) {
					messageContainer.style.backgroundColor = plugin.settings.appearance.messageContainerBackgroundColor;
				}
			} else {
				plugin.settings.appearance.messageContainerBackgroundColor = colorToHex(DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor);
				frontmatter.message_container_background_color = plugin.settings.appearance.messageContainerBackgroundColor.replace(/^#/, '');
				if (messageContainer) {
					const defaultMessageContainerBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor).trim();
					messageContainer.style.backgroundColor = defaultMessageContainerBackgroundColor;
				}
			}

			if (isValidHexColor(frontmatter.user_message_font_color)) {
				plugin.settings.appearance.userMessageFontColor = '#' + frontmatter.user_message_font_color.substring(0, 6);
				if (messageContainer) {
					const userMessages = messageContainer.querySelectorAll('.userMessage');
					userMessages.forEach((userMessage) => {
					const element = userMessage as HTMLElement;
					element.style.color = plugin.settings.appearance.userMessageFontColor;
					});
				}
			} else {
				plugin.settings.appearance.userMessageFontColor = colorToHex(DEFAULT_SETTINGS.appearance.userMessageFontColor);
				frontmatter.user_message_font_color = plugin.settings.appearance.userMessageFontColor.replace(/^#/, '');
				if (messageContainer) {
					const userMessages = messageContainer.querySelectorAll('.userMessage');
					userMessages.forEach((userMessage) => {
					const element = userMessage as HTMLElement;
					const defaultUserMessageFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageFontColor).trim();
					element.style.color = defaultUserMessageFontColor;
					});
				}
			}
			
			if (isValidHexColor(frontmatter.user_message_background_color)) {
				plugin.settings.appearance.userMessageBackgroundColor = '#' + frontmatter.user_message_background_color.substring(0, 6);
				if (messageContainer) {
					const userMessages = messageContainer.querySelectorAll('.userMessage');
					userMessages.forEach((userMessage) => {
					const element = userMessage as HTMLElement;
					element.style.backgroundColor = plugin.settings.appearance.userMessageBackgroundColor;
					});
				}
			} else {
				plugin.settings.appearance.userMessageBackgroundColor = colorToHex(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor);
				frontmatter.user_message_background_color = plugin.settings.appearance.userMessageBackgroundColor.replace(/^#/, '');
				if (messageContainer) {
					const userMessages = messageContainer.querySelectorAll('.userMessage');
					userMessages.forEach((userMessage) => {
					const element = userMessage as HTMLElement;
					const defaultUserMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim();
					element.style.backgroundColor = defaultUserMessageBackgroundColor;
					});
				}
			}

			if (isValidHexColor(frontmatter.bot_message_font_color)) {
				plugin.settings.appearance.botMessageFontColor = '#' + frontmatter.bot_message_font_color.substring(0, 6);
				if (messageContainer) {
					const botMessages = messageContainer.querySelectorAll('.botMessage');
					botMessages.forEach((botMessage) => {
					const element = botMessage as HTMLElement;
					element.style.color = plugin.settings.appearance.botMessageFontColor;
					});
				}
			} else {
				plugin.settings.appearance.botMessageFontColor = colorToHex(DEFAULT_SETTINGS.appearance.botMessageFontColor);
				frontmatter.bot_message_font_color = plugin.settings.appearance.botMessageFontColor.replace(/^#/, '');
				if (messageContainer) {
					const botMessages = messageContainer.querySelectorAll('.botMessage');
					botMessages.forEach((botMessage) => {
					const element = botMessage as HTMLElement;
					const defaultBotMessageFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageFontColor).trim();
					element.style.color = defaultBotMessageFontColor;
					});
				}
			}
			
			if (isValidHexColor(frontmatter.chatbot_message_background_color)) {
				plugin.settings.appearance.botMessageBackgroundColor = '#' + frontmatter.chatbot_message_background_color.substring(0, 6);
				if (messageContainer) {
					const botMessages = messageContainer.querySelectorAll('.botMessage');
					botMessages.forEach((botMessage) => {
						const element = botMessage as HTMLElement;
						element.style.backgroundColor = plugin.settings.appearance.botMessageBackgroundColor;
					});
				}
			} else {
				plugin.settings.appearance.botMessageBackgroundColor = colorToHex(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor);
				frontmatter.chatbot_message_background_color = plugin.settings.appearance.botMessageBackgroundColor.replace(/^#/, '');
				if (messageContainer) {
					const botMessages = messageContainer.querySelectorAll('.botMessage');
					botMessages.forEach((botMessage) => {
						const element = botMessage as HTMLElement;
						const defaultBotMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim();
						element.style.backgroundColor = defaultBotMessageBackgroundColor;
					});
				}
			}

			if (isValidHexColor(frontmatter.chatbox_font_color)) {
				plugin.settings.appearance.chatBoxFontColor = '#' + frontmatter.chatbox_font_color.substring(0, 6);
				const textarea = document.querySelector('.chatbox textarea') as HTMLElement;
				if (textarea) {
					textarea.style.color = plugin.settings.appearance.chatBoxFontColor;
					
					// Set the placeholder color to the default value
					const style = document.createElement('style');
					style.textContent = `
						.chatbox textarea::placeholder {
							color: ${plugin.settings.appearance.chatBoxFontColor} !important;
						}
					`;
					textarea.appendChild(style);
				}
			} else {
				plugin.settings.appearance.chatBoxFontColor = colorToHex(DEFAULT_SETTINGS.appearance.chatBoxFontColor);
				frontmatter.chatbox_font_color = plugin.settings.appearance.chatBoxFontColor.replace(/^#/, '');
                const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
				const defaultChatBoxFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxFontColor).trim();
                
                if (textarea) {
                    textarea.style.color = DEFAULT_SETTINGS.appearance.chatBoxFontColor;
                    
                    // Set the placeholder color to the selected value
                    const style = document.createElement('style');
                    style.textContent = `
                        .chatbox textarea::placeholder {
                            color: ${defaultChatBoxFontColor} !important;
                        }
                    `;
                    textarea.appendChild(style);
                }
			}

			if (isValidHexColor(frontmatter.chatbox_background_color)) {
				plugin.settings.appearance.chatBoxBackgroundColor = '#' + frontmatter.chatbox_background_color.substring(0, 6);
				
				if (messageContainer) {
					const chatbox = document.querySelector('.chatbox');
					if (chatbox) {
						const element = chatbox as HTMLElement;
						element.style.backgroundColor = plugin.settings.appearance.chatBoxBackgroundColor;
						element.style.borderColor = plugin.settings.appearance.chatBoxBackgroundColor;
					}
					
					const textarea = document.querySelector('.chatbox textarea');
					if (textarea) {
						const element = textarea as HTMLElement;
						element.style.backgroundColor = plugin.settings.appearance.chatBoxBackgroundColor;
						element.style.borderColor = plugin.settings.appearance.chatBoxBackgroundColor;
					}
					
					const submitButton = document.querySelector('.chatbox .submit-button');
					if (submitButton) {
						const element = submitButton as HTMLElement;
						element.style.backgroundColor = plugin.settings.appearance.chatBoxBackgroundColor;
						element.style.borderColor = plugin.settings.appearance.chatBoxBackgroundColor;
					}
				}
			} else {
				plugin.settings.appearance.chatBoxBackgroundColor = DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
				frontmatter.chatbox_background_color = DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor.replace(/^#/, '');

				const defaultChatBoxBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor).trim();

				if (messageContainer) {
					const chatbox = document.querySelector('.chatbox');
					if (chatbox) {
						const element = chatbox as HTMLElement;
						element.style.backgroundColor = defaultChatBoxBackgroundColor;
						element.style.borderColor = defaultChatBoxBackgroundColor;
					}
					
					const textarea = document.querySelector('.chatbox textarea');
					if (textarea) {
						const element = textarea as HTMLElement;
						element.style.backgroundColor = defaultChatBoxBackgroundColor;
						element.style.borderColor = defaultChatBoxBackgroundColor;
					}

					const submitButton = document.querySelector('.chatbox .submit-button');
					if (submitButton) {
						const element = submitButton as HTMLElement;
						element.style.backgroundColor = defaultChatBoxBackgroundColor;
						element.style.borderColor = defaultChatBoxBackgroundColor;
					}

				}
			}

			if (isValidHexColor(frontmatter.bmo_generate_background_color)) {
				plugin.settings.appearance.bmoGenerateBackgroundColor = '#' + frontmatter.bmo_generate_background_color.substring(0, 6);
				
				const containers = document.querySelectorAll('.bmoCodeBlockContainer');
				containers.forEach((container) => {
					const element = container as HTMLElement;
					element.style.backgroundColor = plugin.settings.appearance.bmoGenerateBackgroundColor;
				});
			} else {
				plugin.settings.appearance.bmoGenerateBackgroundColor = colorToHex(DEFAULT_SETTINGS.appearance.bmoGenerateBackgroundColor);
				frontmatter.bmo_generate_background_color = plugin.settings.appearance.bmoGenerateBackgroundColor.replace(/^#/, '');
				
				const containers = document.querySelectorAll('.bmoCodeBlockContainer');
				containers.forEach((container) => {
					const element = container as HTMLElement;
					const defaultBMOGenerateBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.bmoGenerateBackgroundColor).trim();
					element.style.backgroundColor = defaultBMOGenerateBackgroundColor;
				});
			}

			if (isValidHexColor(frontmatter.bmo_generate_font_color)) {
				plugin.settings.appearance.bmoGenerateFontColor = '#' + frontmatter.bmo_generate_font_color.substring(0, 6);
				
				const containers = document.querySelectorAll('.bmoCodeBlockContent');
				containers.forEach((container) => {
					const element = container as HTMLElement;
					element.style.color = plugin.settings.appearance.bmoGenerateFontColor;
				});
			} else {
				plugin.settings.appearance.bmoGenerateFontColor = colorToHex(DEFAULT_SETTINGS.appearance.bmoGenerateFontColor);
				frontmatter.bmo_generate_font_color = plugin.settings.appearance.bmoGenerateFontColor.replace(/^#/, '');
				
				const containers = document.querySelectorAll('.bmoCodeBlockContent');
				containers.forEach((container) => {
					const element = container as HTMLElement;
					const defaultBMOGenerateFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.bmoGenerateFontColor).trim();
					element.style.color = defaultBMOGenerateFontColor;
				});
			}

			plugin.settings.editor.systen_role = frontmatter.systen_role;

			plugin.settings.appearance.enableHeader = frontmatter.enable_header;
			if (frontmatter.enable_header === true) {
				const header = document.querySelector('#header') as HTMLElement;

				if (header) {
					header.style.display = 'block';
					referenceCurrentNoteElement.style.margin = '-0.5rem 0 0.5rem 0';
				}
			} else {
				const header = document.querySelector('#header') as HTMLElement;
				const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
				if (header) {
					header.style.display = 'none';
					messageContainer.style.maxHeight = 'calc(100% - 60px)';
					referenceCurrentNoteElement.style.margin = '0.5rem 0 0.5rem 0';
				}
			}

			const intValue = parseInt(frontmatter.ollama_mirostat, 10); // 10 is the radix parameter to ensure parsing is done in base 10
	
			// Check if the parsed value is a valid integer, if not, fallback to the default URL
			if (isNaN(intValue)) {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat;
				frontmatter.ollama_mirostat = plugin.settings.OllamaConnection.ollamaParameters.mirostat;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat = intValue.toString();
				frontmatter.ollama_mirostat = intValue;
			}


			if (isNaN(parseFloat(frontmatter.ollama_mirostat_eta))) {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta;
				frontmatter.ollama_mirostat_eta = plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = parseFloat(frontmatter.ollama_mirostat_eta).toFixed(2).toString();
				frontmatter.ollama_mirostat_eta = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta);
			}

			if (isNaN(parseFloat(frontmatter.ollama_mirostat_tau))) {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau;
				frontmatter.ollama_mirostat_tau = plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = parseFloat(frontmatter.ollama_mirostat_tau).toFixed(2).toString();
				frontmatter.ollama_mirostat_tau = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau);
			}

			if (isNaN(parseInt(frontmatter.ollama_num_ctx))) {
				plugin.settings.OllamaConnection.ollamaParameters.num_ctx = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx;
				frontmatter.ollama_num_ctx = plugin.settings.OllamaConnection.ollamaParameters.num_ctx;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.num_ctx = parseInt(frontmatter.ollama_num_ctx).toString();
				frontmatter.ollama_num_ctx = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_ctx);
			}

			if (isNaN(parseInt(frontmatter.ollama_num_gqa))) {
				plugin.settings.OllamaConnection.ollamaParameters.num_gqa = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.num_gqa = parseInt(frontmatter.ollama_num_gqa).toString();
				frontmatter.ollama_num_gqa = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_gqa);
			}

			if (isNaN(parseInt(frontmatter.ollama_num_thread))) {
				plugin.settings.OllamaConnection.ollamaParameters.num_thread = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.num_thread = parseInt(frontmatter.ollama_num_thread).toString();
				frontmatter.ollama_num_thread = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_thread);
			}

			if (isNaN(parseInt(frontmatter.ollama_repeat_last_n))) {
				plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n;
				frontmatter.ollama_repeat_last_n = plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = parseInt(frontmatter.ollama_repeat_last_n).toString();
				frontmatter.ollama_repeat_last_n = parseInt(plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n);
			}

			if (isNaN(parseFloat(frontmatter.ollama_repeat_penalty))) {
				plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty;
				frontmatter.ollama_repeat_penalty = plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = parseFloat(frontmatter.ollama_repeat_penalty).toFixed(2).toString();
				frontmatter.ollama_repeat_penalty = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty);
			}

			if (isNaN(parseInt(frontmatter.ollama_seed))) {
				plugin.settings.OllamaConnection.ollamaParameters.seed = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.seed = parseInt(frontmatter.ollama_seed).toString();
				frontmatter.ollama_seed = parseInt(plugin.settings.OllamaConnection.ollamaParameters.seed);
			}

			plugin.settings.OllamaConnection.ollamaParameters.stop = frontmatter.ollama_stop;

			if (isNaN(parseFloat(frontmatter.ollama_tfs_z))) {
				plugin.settings.OllamaConnection.ollamaParameters.tfs_z = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z;
				frontmatter.ollama_tfs_z = plugin.settings.OllamaConnection.ollamaParameters.tfs_z;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.tfs_z = parseFloat(frontmatter.ollama_tfs_z).toFixed(2).toString();
				frontmatter.ollama_tfs_z = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.tfs_z);
			}

			if (isNaN(parseInt(frontmatter.ollama_top_k))) {
				plugin.settings.OllamaConnection.ollamaParameters.top_k = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k;
				frontmatter.ollama_top_k = plugin.settings.OllamaConnection.ollamaParameters.top_k;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.top_k = parseInt(frontmatter.ollama_top_k).toString();
				frontmatter.ollama_top_k = parseInt(plugin.settings.OllamaConnection.ollamaParameters.top_k);
			}

			if (isNaN(parseInt(frontmatter.ollama_top_p))) {
				plugin.settings.OllamaConnection.ollamaParameters.top_p = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p;
				frontmatter.ollama_top_p = plugin.settings.OllamaConnection.ollamaParameters.top_p;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.top_p = parseFloat(frontmatter.ollama_top_p).toFixed(2).toString();
				frontmatter.ollama_top_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.top_p);
			}

			if (isNaN(parseInt(frontmatter.ollama_min_p))) {
				plugin.settings.OllamaConnection.ollamaParameters.min_p = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p;
				frontmatter.ollama_min_p = plugin.settings.OllamaConnection.ollamaParameters.min_p;
			} else {
				plugin.settings.OllamaConnection.ollamaParameters.min_p = parseFloat(frontmatter.ollama_min_p).toFixed(2).toString();
				frontmatter.ollama_min_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.min_p);
			}

			// Regular expression to validate the input value and capture the number and unit
			const match = String(frontmatter.ollama_keep_alive).match(/^(-?\d+)(m|hr|h)?$/);

			if (match) {
				const num = parseInt(match[1]);
				const unit = match[2];

				// Convert to seconds based on the unit
				let seconds;
				if (unit === 'm') {
					seconds = num * 60; // Convert minutes to seconds
				} else if (unit === 'hr' || unit === 'h') {
					seconds = num * 3600; // Convert hours to seconds
				} else {
					seconds = num; // Assume it's already in seconds if no unit
				}

				// Store the value in seconds
				plugin.settings.OllamaConnection.ollamaParameters.keep_alive = seconds.toString();
				frontmatter.ollama_keep_alive = plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
			} else {
				// If the input is invalid, revert to the default setting
				plugin.settings.OllamaConnection.ollamaParameters.keep_alive = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive;
				frontmatter.ollama_keep_alive = plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
			}

		});
	} catch (error) {
		console.error('Error processing frontmatter:', error);
	}
}
