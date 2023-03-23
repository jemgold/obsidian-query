import type { Document } from "langchain/document";
import { BaseDocumentLoader } from "langchain/document_loaders";
import { extract } from "@extractus/article-extractor";

export class ArticleLoader extends BaseDocumentLoader {
	constructor(public url: string) {
		super();
	}

	public async load(): Promise<Document[]> {
		try {
			const article = await extract(this.url);

			if (article) {
				const { content, ...metadata } = article;

				return [
					{
						pageContent: content || "",
						metadata: metadata,
					},
				];
			}
			return [];
		} catch (err) {
			throw err;
		}
	}
}
