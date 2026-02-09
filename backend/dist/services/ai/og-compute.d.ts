/**
 * 0G Compute Network 客户端
 * 使用 OpenAI 兼容的 Chat Completions 接口
 */
export declare class OgComputeClient {
    private initialized;
    init(): Promise<void>;
    private getChatCompletionsUrl;
    private assertConfigured;
    /** 获取 AI 聊天完成 */
    chatCompletion(messages: Array<{
        role: string;
        content: string;
    }>): Promise<string>;
    /** 流式获取 AI 输出（回调增量内容，返回完整文本） */
    streamChatCompletion(messages: Array<{
        role: string;
        content: string;
    }>, options: {
        signal?: AbortSignal;
        onDelta: (chunk: string) => void;
    }): Promise<string>;
    /** 获取 0G Compute 可用服务列表 */
    listServices(): Promise<unknown[]>;
}
export declare const ogComputeClient: OgComputeClient;
//# sourceMappingURL=og-compute.d.ts.map