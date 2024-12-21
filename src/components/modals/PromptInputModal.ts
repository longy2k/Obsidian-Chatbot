import { App, Modal, Setting, TextAreaComponent, ButtonComponent } from 'obsidian';
import BMOGPT, { BMOSettings } from '../../main';
import { promptSelectGenerateCommand } from '../editor/EditorCommands';

export class PromptInputModal extends Modal {
    contentEl: HTMLElement;
    private plugin: BMOGPT;
    private settings: BMOSettings;
    private selectedText: string;
    private inputValue: string = '';

    constructor(app: App, plugin: BMOGPT, settings: BMOSettings, selectedText: string) {
        super(app);
        this.plugin = plugin;
        this.settings = settings;
        this.selectedText = selectedText;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Enter Prompt' });

        new Setting(contentEl)
            .setName('Your prompt')
            .setDesc('The selected text will be used as context for this prompt')
            .addTextArea((text: TextAreaComponent) => text
                .setPlaceholder('Enter your prompt here...')
                .setValue(this.inputValue)
                .onChange(value => {
                    this.inputValue = value;
                }));

        new Setting(contentEl)
            .addButton((btn: ButtonComponent) => btn
                .setButtonText('Generate')
                .setCta()
                .onClick(() => {
                    const fullPrompt = `Context:\n${this.selectedText}\n\nPrompt: ${this.inputValue}`;
                    this.close();
                    promptSelectGenerateCommand(this.plugin, this.settings, fullPrompt);
                }))
            .addButton((btn: ButtonComponent) => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
