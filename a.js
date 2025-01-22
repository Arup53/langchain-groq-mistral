var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var _a, e_1, _b, _c;
import dotenv from "dotenv";
dotenv.config();
import { ChatGroq } from "@langchain/groq";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pull } from "langchain/hub";
import { Annotation } from "@langchain/langgraph";
import { StateGraph } from "@langchain/langgraph";
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0,
});
const embeddings = new MistralAIEmbeddings({
    model: "mistral-embed",
    apiKey: process.env.MISTRAL_API_KEY,
});
const vectorStore = new MemoryVectorStore(embeddings);
const pTagSelector = "p";
const cheerioLoader = new CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-06-23-agent/", {
    selector: pTagSelector,
});
const docs = await cheerioLoader.load();
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
const allSplits = await splitter.splitDocuments(docs);
await vectorStore.addDocuments(allSplits);
const promptTemplate = await pull("rlm/rag-prompt");
// Example:
const example_prompt = await promptTemplate.invoke({
    context: "(context goes here)",
    question: "(question goes here)",
});
const example_messages = example_prompt.messages;
console.assert(example_messages.length === 1);
const InputStateAnnotation = Annotation.Root({
    question: (Annotation),
});
const StateAnnotation = Annotation.Root({
    question: (Annotation),
    context: (Annotation),
    answer: (Annotation),
});
const retrieve = async (state) => {
    const retrievedDocs = await vectorStore.similaritySearch(state.question);
    return { context: retrievedDocs };
};
const generate = async (state) => {
    const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
    const messages = await promptTemplate.invoke({
        question: state.question,
        context: docsContent,
    });
    const response = await llm.invoke(messages);
    return { answer: response.content };
};
const graph = new StateGraph(StateAnnotation)
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "__end__")
    .compile();
let inputs = { question: "What is Task Decomposition?" };
const stream = await graph.stream(inputs, { streamMode: "messages" });
try {
    for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = await stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
        _c = stream_1_1.value;
        _d = false;
        const [message, _metadata] = _c;
        process.stdout.write(message.content + "|");
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (!_d && !_a && (_b = stream_1.return)) await _b.call(stream_1);
    }
    finally { if (e_1) throw e_1.error; }
}
