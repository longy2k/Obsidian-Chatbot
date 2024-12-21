import { Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';
import { fetchOllamaModels } from '../FetchModelList';
import { addDescriptionLink } from 'src/utils/DescriptionLink';

// Ollama Settings
export function addOllamaSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Ollama Connection'});

    const initialState = plugin.settings.toggleOllamaSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.style.display = initialState ? 'block' : 'none';

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = settingsContainer.style.display !== 'none';
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.style.display = 'none';
            plugin.settings.toggleOllamaSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleOllamaSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
        .setName('OLLAMA REST API URL')
        .setDesc(addDescriptionLink('Enter your REST API URL. Update ', 'https://ollama.com/', 'to version >=0.1.42 to avoid CORS restriction.', 'Ollama'))
        .addText(text => text
            .setPlaceholder('http://localhost:11434')
            .setValue(plugin.settings.OllamaConnection.RESTAPIURL || DEFAULT_SETTINGS.OllamaConnection.RESTAPIURL)
            .onChange(async (value) => {
                    plugin.settings.OllamaConnection.ollamaModels = [];
                    plugin.settings.OllamaConnection.RESTAPIURL = value ? value : DEFAULT_SETTINGS.OllamaConnection.RESTAPIURL;
                    if (plugin.settings.OllamaConnection.RESTAPIURL === '') {
                        plugin.settings.OllamaConnection.ollamaModels = [];
                    } else {
                        const models = await fetchOllamaModels(plugin);
                        models?.forEach((model: string) => {
                            if (!plugin.settings.OllamaConnection.ollamaModels.includes(model)) {
                                plugin.settings.OllamaConnection.ollamaModels.push(model);
                            }
                        });
                    }
                })
            .inputEl.addEventListener('focusout', async () => {
                await plugin.saveSettings();
                SettingTab.display();
            })
        )

    new Setting(settingsContainer)
        .setName('Enable Stream')
        .setDesc('Enable Ollama models to stream response.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.OllamaConnection.enableStream).onChange((value) => {
                plugin.settings.OllamaConnection.enableStream = value;
                plugin.saveSettings();
            })
        );

    // Create the toggle container for Advanced Settings within the main settingsContainer
    const advancedToggleSettingContainer = settingsContainer.createDiv({ cls: 'toggleSettingContainer' });
    advancedToggleSettingContainer.createEl('h2', { text: 'Advanced Settings' });

    // Determine the initial state for Advanced Settings from the plugin's settings
    const advancedInitialState = plugin.settings.toggleAdvancedSettings;
    const advancedChevronIcon = advancedToggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(advancedChevronIcon, advancedInitialState ? 'chevron-down' : 'chevron-right');

    // Create the container for Advanced Settings that will be toggled
    const advancedSettingsContainer = settingsContainer.createDiv({ cls: 'settingsContainer' });
    advancedSettingsContainer.style.display = advancedInitialState ? 'block' : 'none';

    // Toggle visibility for Advanced Settings
    advancedToggleSettingContainer.addEventListener('click', async () => {
        const isOpen = advancedSettingsContainer.style.display !== 'none';
        if (isOpen) {
            setIcon(advancedChevronIcon, 'chevron-right'); // Close state
            advancedSettingsContainer.style.display = 'none';
            plugin.settings.toggleAdvancedSettings = false;
        } else {
            setIcon(advancedChevronIcon, 'chevron-down'); // Open state
            advancedSettingsContainer.style.display = 'block';
            plugin.settings.toggleAdvancedSettings = true;
        }
        await plugin.saveSettings();
    });


    new Setting(advancedSettingsContainer)
        .setName('mirostat')
        .setDesc('Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0)')
        .addText(text => text
            .setPlaceholder('0')
            .setValue(plugin.settings.OllamaConnection.ollamaParameters.mirostat || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat)
            .onChange(async (value) => {
                // Parse the input value as an integer
                const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
                
                // Check if the parsed value is a valid integer, if not, fallback to the default URL
                if (isNaN(intValue)) {
                    plugin.settings.OllamaConnection.ollamaParameters.mirostat = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat;
                } else {
                    plugin.settings.OllamaConnection.ollamaParameters.mirostat = intValue.toString();
                }
    
                await plugin.saveSettings();
            })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(advancedSettingsContainer)
    .setName('mirostat_eta')
    .setDesc('Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1)')
    .addText(text => text
        .setPlaceholder('0.1')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (!isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = floatValue.toFixed(2).toString();
            } else {
                // Fallback to the default value if input is not a valid number
                plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta;
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('mirostat_tau')
    .setDesc('Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0)')
    .addText(text => text
        .setPlaceholder('5.00')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (!isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = floatValue.toFixed(2).toString();
            } else {
                // Fallback to the default value if input is not a valid number
                plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau;
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('num_ctx')
    .setDesc('Sets the size of the context window used to generate the next token. (Default: 2048)')
    .addText(text => text
        .setPlaceholder('2048')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.num_ctx || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.num_ctx = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.num_ctx = intValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('num_gqa')
    .setDesc('The number of GQA groups in the transformer layer. Required for some models, for example it is 8 for llama2:70b.')
    .addText(text => text
        .setPlaceholder('0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.num_gqa || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.num_gqa = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.num_gqa = intValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('num_thread')
    .setDesc('Sets the number of threads to use during computation. By default, Ollama will detect this for optimal performance. It is recommended to set this value to the number of physical CPU cores your system has (as opposed to the logical number of cores).')
    .addText(text => text
        .setPlaceholder('0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.num_thread || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.num_thread = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread;
            } else {
    new Setting(advancedSettingsContainer)
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('repeat_last_n')
    .setDesc('Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx)')
    .addText(text => text
        .setPlaceholder('64')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = intValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('repeat_penalty')
    .setDesc('Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1)')
    .addText(text => text
        .setPlaceholder('1.1')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty;
            } else {
                // Fallback to the default value if input is not a valid number
                plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = floatValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('seed')
    .setDesc('Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt.')
    .addText(text => text
        .setPlaceholder('0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.seed || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.seed = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.seed = intValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('stop')
    .setDesc('Sets the stop sequences to use. When this pattern is encountered, the LLM will stop generating text and return. Multiple stop patterns may be set by specifying them as a comma-separated list in the input field.')
    .addText(text => text
        .setPlaceholder('stop, \\n, user:')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.stop && Array.isArray(plugin.settings.OllamaConnection.ollamaParameters.stop) 
                   ? plugin.settings.OllamaConnection.ollamaParameters.stop.join(', ') 
                   : DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.stop.join(', '))
        .onChange(async (value) => {
                // Split the input string by commas, trim whitespace, and ensure it's always stored as an array
                const stopsArray = value ? value.split(',').map(s => s.trim()) : [...DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.stop];
                plugin.settings.OllamaConnection.ollamaParameters.stop = stopsArray;
                await plugin.saveSettings();
            })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );
    
    

    new Setting(advancedSettingsContainer)
    .setName('tfs_z')
    .setDesc('Tail free sampling is used to reduce the impact of less probable tokens from the output. A higher value (e.g., 2.0) will reduce the impact more, while a value of 1.0 disables this setting. (default: 1)')
    .addText(text => text
        .setPlaceholder('1.0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.tfs_z || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.tfs_z = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.tfs_z = floatValue.toFixed(2).toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('top_k')
    .setDesc('Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40)')
    .addText(text => text
        .setPlaceholder('40')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.top_k || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const intValue = parseInt(value, 10); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Check if the parsed value is a valid integer, if not, fallback to the default URL
            if (isNaN(intValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.top_k = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.top_k = intValue.toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('top_p')
    .setDesc('Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9)')
    .addText(text => text
        .setPlaceholder('1.0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.top_p || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.top_p = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.top_p = floatValue.toFixed(2).toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('min_p')
    .setDesc('Alternative to the top_p, and aims to ensure a balance of quality and variety. The parameter p represents the minimum probability for a token to be considered, relative to the probability of the most likely token. (Default: 0.0)')
    .addText(text => text
        .setPlaceholder('0.0')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.min_p || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p)
        .onChange(async (value) => {
            // Parse the input value as an integer
            const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10
            
            // Determine if the float value is an integer (whole number)
            if (isNaN(floatValue)) {
                plugin.settings.OllamaConnection.ollamaParameters.min_p = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p;
            } else {
                plugin.settings.OllamaConnection.ollamaParameters.min_p = floatValue.toFixed(2).toString();
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(advancedSettingsContainer)
    .setName('keep_alive')
    .setDesc('If set to a positive duration (e.g. 20m, 1hr or 30), the model will stay loaded for the provided duration in seconds. If set to a negative duration (e.g. -1), the model will stay loaded indefinitely. If set to 0, the model will be unloaded immediately once finished. If not set, the model will stay loaded for 5 minutes by default.')
    .addText(text => text
        .setPlaceholder('30s')
        .setValue(plugin.settings.OllamaConnection.ollamaParameters.keep_alive || DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive)
        .onChange(async (value) => {
            // Regular expression to validate the input value and capture the number and unit
            const match = value.match(/^(-?\d+)(m|hr|h)?$/);
            
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
            } else {
                // If the input is invalid, revert to the default setting
                plugin.settings.OllamaConnection.ollamaParameters.keep_alive = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive;
            }

            await plugin.saveSettings();
        })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

}