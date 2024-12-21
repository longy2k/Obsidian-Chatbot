import { App, Modal, Setting, TextAreaComponent, ButtonComponent } from 'obsidian';
import BMOGPT, { BMOSettings } from 'src/main';
import { promptSelectGenerateCommand } from '../editor/EditorCommands';

export class PromptInputModal extends Modal {
    contentEl: HTMLElement;
    private plugin: BMOGPT;
    private settings: BMOSettings;
    private selectedText: string;
    private inputValue: string = '';
    private generateButton: ButtonComponent;
    private cancelButton: ButtonComponent;
    private textArea: TextAreaComponent;

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
            .addTextArea((text: TextAreaComponent) => {
                this.textArea = text;
                text.setPlaceholder('Enter your prompt here...')
                    .setValue(this.inputValue)
                    .onChange(value => {
                        this.inputValue = value;
                    });
            });

        new Setting(contentEl)
            .addButton((btn: ButtonComponent) => {
                this.generateButton = btn;
                btn.setButtonText('Generate')
                    .setCta()
                    .onClick(() => {
                        const fullPrompt = `Context:

${this.selectedText}

Prompt:
${this.inputValue}`;
                        this.close();
                        promptSelectGenerateCommand(this.plugin, this.settings, fullPrompt);
                    });
            })
            .addButton((btn: ButtonComponent) => {
                this.cancelButton = btn;
                btn.setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        // Remove event listeners
        if (this.textArea) {
            this.textArea.onChange(() => {});
        }
        if (this.generateButton) {
            this.generateButton.onClick(() => {});
        }
        if (this.cancelButton) {
            this.cancelButton.onClick(() => {});
        }
        
        // Clear content
        const { contentEl } = this;
        contentEl.empty();
    }
}
