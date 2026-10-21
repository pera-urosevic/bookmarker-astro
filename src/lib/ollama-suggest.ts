import ollama from 'ollama'
import type { Message, Tool } from 'ollama'
import { SYSTEM_PROMPT, buildPrompt, parseSuggestions, type Suggestion } from './suggest.ts'
import { webSearch } from './web-search.ts'

const MAX_TOOL_ROUNDS = 5
const DEFAULT_MODEL = 'gemma4:12b'
// const DEFAULT_MODEL = 'qwen3.5:9b'

const SUGGESTION_FORMAT = {
	type: 'object',
	properties: {
		tags: { type: 'array', items: { type: 'string' } },
		description: { type: 'string' },
	},
	required: ['tags', 'description'],
}

const WEB_SEARCH_TOOL: Tool = {
	type: 'function',
	function: {
		name: 'web_search',
		description: 'Search the web for information about a bookmark.',
		parameters: {
			type: 'object',
			required: ['query'],
			properties: {
				query: { type: 'string', description: 'Search query' },
			},
		},
	},
}

export function suggestionModel(): string {
	return process.env.OLLAMA_MODEL || DEFAULT_MODEL
}

/** Asks Ollama for tags and notes, giving the model a web search tool when needed. */
export async function suggestBookmark(url: string, title: string): Promise<Suggestion> {
	const model = suggestionModel()
	const messages: Message[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: buildPrompt(url, title) },
	]

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const { message } = await ollama.chat({ model, messages, tools: [WEB_SEARCH_TOOL] })
		messages.push(message)
		if (!message.tool_calls?.length) break

		for (const call of message.tool_calls) {
			const name = call.function.name
			const query = String(call.function.arguments?.query ?? '')
			const result = name === 'web_search' ? await webSearch(query) : 'Unknown tool.'
			messages.push({ role: 'tool', content: result, tool_name: name })
		}
	}

	const { message } = await ollama.chat({ model, messages, format: SUGGESTION_FORMAT })
	return parseSuggestions(message.content)
}
