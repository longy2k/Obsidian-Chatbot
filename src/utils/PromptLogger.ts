import { TFile, Vault } from 'obsidian';
import { BMOSettings } from '../main';

export async function logRawPrompt(
    vault: Vault,
    settings: BMOSettings,
    prompt: string,
    model: string,
    systemRole: string,
    temperature: string,
    maxTokens: string
) {
    if (!settings.prompts.logRawPrompts) {
        console.debug('Raw prompt logging disabled');
        return;
    }

    try {
        const folderPath = settings.prompts.rawPromptsFolderPath || 'BMO/raw-prompts';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}.md`;
        const filePath = `${folderPath}/${filename}`;

        // Create BMO folder if it doesn't exist
        const bmoFolder = 'BMO';
        if (!await vault.adapter.exists(bmoFolder)) {
            await vault.createFolder(bmoFolder);
        }

        // Create raw-prompts folder if it doesn't exist
        if (!await vault.adapter.exists(folderPath)) {
            await vault.createFolder(folderPath);
        }

        // Create the content with metadata
        const content = `---
timestamp: ${new Date().toISOString()}
model: ${model}
temperature: ${temperature}
max_tokens: ${maxTokens}
---

# System Role

${systemRole}

# Prompt

${prompt}`;

        // Create the file
        await vault.create(filePath, content);
        console.log(`Raw prompt logged to ${filePath}`);
    } catch (error) {
        console.error('Error logging raw prompt:', error);
    }
}
