import { ItemView, WorkspaceLeaf, Notice, setIcon, MarkdownRenderer } from "obsidian";
import NotebookAgentPlugin from "./main";
import { ContextManager } from "./context-manager";
import { AIService, AIMessage } from "./ai-service";
import { ToolExecutor } from "./tool-executor";
import { SYSTEM_PROMPT } from "./system-prompt";

export const VIEW_TYPE_NOTEBOOK = "notebook-agent-view";

export class NotebookAgentView extends ItemView {
	plugin: NotebookAgentPlugin;
    contextManager: ContextManager;
    aiService: AIService;
    toolExecutor: ToolExecutor;

    // Conversation history
    messages: AIMessage[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: NotebookAgentPlugin) {
		super(leaf);
		this.plugin = plugin;
        this.contextManager = new ContextManager(plugin.app);
        this.aiService = new AIService(plugin.settings);
        this.toolExecutor = new ToolExecutor(plugin.app);
	}

	getViewType() {
		return VIEW_TYPE_NOTEBOOK;
	}

	getDisplayText() {
		return "Notebook Agent";
	}

    getIcon() {
        return "bot";
    }

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
        container.addClass("notebook-agent-view-container");

        // --- Header ---
        const headerEl = container.createEl("div", { cls: "notebook-agent-header" });
        headerEl.createEl("h4", { text: "Notebook Agent" });

        const contextContainer = headerEl.createEl("div", { cls: "notebook-agent-context-selector" });
        contextContainer.createEl("span", { text: "Context: " });

        const contextSelect = contextContainer.createEl("select");
        contextSelect.createEl("option", { text: "Current Folder", value: "folder" });
        contextSelect.createEl("option", { text: "Current File", value: "file" });
        contextSelect.createEl("option", { text: "Whole Vault (Limit 50)", value: "vault" });

        // --- Chat Area ---
		const messagesContainer = container.createEl("div", { cls: "notebook-agent-messages" });

        // Initial Message
        this.addMessage(messagesContainer, 'assistant', "Hello! I am ready to help you with your notes.");

        // --- Input Area ---
        const inputArea = container.createEl("div", { cls: "notebook-agent-input-area" });

        const textArea = inputArea.createEl("textarea", { cls: "notebook-agent-input" });
        textArea.placeholder = "Ask something or tell me to create a note...";

        const sendBtn = inputArea.createEl("button", { text: "Send" });

        sendBtn.addEventListener("click", async () => {
            const input = textArea.value;
            if (!input) return;

            // 1. Add User Message to UI and History
            this.addMessage(messagesContainer, 'user', input);
            textArea.value = "";
            textArea.focus();

            // 2. Prepare Context (Only if it's the first message or context changed?
            // For now, let's refresh context on every turn or be smarter.
            // To be safe/simple, we inject context in the SYSTEM prompt or as a System message
            // at the beginning of the conversation history for this turn.)

            // Let's create a temporary message list for this generation
            const contextType = contextSelect.value as 'file' | 'folder' | 'vault';

            // Show loading indicator
            const loadingEl = messagesContainer.createEl("div", { cls: "notebook-agent-message ai loading" });
            loadingEl.setText("Reading context...");

            const contextData = await this.contextManager.getContext(contextType);

            loadingEl.setText("Thinking...");

            // Construct the full prompt chain
            const fullMessages: AIMessage[] = [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'system', content: `CURRENT CONTEXT:\n${contextData}` },
                ...this.messages // The history already contains the latest user message
            ];

            try {
                // 3. Call AI
                const response = await this.aiService.generate(fullMessages);

                loadingEl.remove(); // Remove loading indicator

                // 4. Check for Tools
                // We look for the JSON block pattern
                const toolMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

                if (toolMatch) {
                    try {
                        const jsonStr = toolMatch[1];
                        const toolCall = JSON.parse(jsonStr);

                        // Show tool execution UI
                        this.addMessage(messagesContainer, 'assistant', `Executing tool: \`${toolCall.tool}\`...`);

                        const toolResult = await this.toolExecutor.execute(toolCall.tool, toolCall.parameters);

                        // Add tool result to history as system or user?
                        // usually 'function' role in OpenAI, but here we simulate with 'user' or 'system' saying "Tool Output:"

                        // We add the AI's *intent* to call the tool to history first
                        this.messages.push({ role: 'assistant', content: response });

                        // Then the result
                        const resultMsg = `Tool '${toolCall.tool}' Output:\n${toolResult}`;
                        // We use 'user' role for tool outputs to ensure compatibility across providers
                        // (Anthropic/Gemini restrict 'system' usage).
                        this.messages.push({ role: 'user', content: resultMsg });

                        // Loop back to AI to interpret the result
                        const followUpMessages: AIMessage[] = [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'system', content: `CURRENT CONTEXT:\n${contextData}` },
                            ...this.messages
                        ];

                        const followUpResponse = await this.aiService.generate(followUpMessages);
                        this.addMessage(messagesContainer, 'assistant', followUpResponse);

                    } catch (e) {
                        this.addMessage(messagesContainer, 'assistant', `Error parsing tool JSON: ${e.message}\nRaw: ${response}`);
                    }
                } else {
                    // Normal text response
                    this.addMessage(messagesContainer, 'assistant', response);
                }

            } catch (err) {
                loadingEl.remove();
                this.addMessage(messagesContainer, 'assistant', `Error: ${err.message}`);
            }
        });

        textArea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
	}

    addMessage(container: HTMLElement, role: 'user' | 'assistant', text: string) {
        const msgEl = container.createEl("div", { cls: `notebook-agent-message ${role === 'user' ? 'user' : 'ai'}` });

        // Use Obsidian's Markdown Renderer
        MarkdownRenderer.renderMarkdown(text, msgEl, "", this.plugin);

        // Add to history
        this.messages.push({ role, content: text });

        // Scroll
        container.scrollTop = container.scrollHeight;
    }

	async onClose() {
		// Nothing to clean up
	}
}
