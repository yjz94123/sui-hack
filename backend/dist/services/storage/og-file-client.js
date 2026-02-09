"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ogFileClient = exports.OgFileClient = void 0;
const logger_1 = require("../../utils/logger");
/**
 * 0G File Storage 客户端
 * 存储市场快照等较大文件
 *
 * 流程: 创建 ZgFile -> 写入数据 -> 上传到 0G Storage -> 保存 rootHash
 */
class OgFileClient {
    initialized = false;
    /** 初始化文件存储客户端 */
    async init() {
        // TODO: Initialize Indexer with 0G storage config
        // const indexer = new Indexer(zgIndexerRpc);
        this.initialized = true;
        logger_1.logger.info('0G File Storage client initialized');
    }
    /** 上传文件到 0G Storage */
    async uploadFile(filePath) {
        if (!this.initialized)
            await this.init();
        // TODO:
        // const file = new ZgFile(filePath);
        // const [tree, err] = await file.merkleTree();
        // const rootHash = tree.rootHash();
        // await indexer.upload(filePath, zgEvmRpc, signer);
        // await file.close();
        // return rootHash;
        logger_1.logger.info({ filePath }, 'Uploaded file to 0G Storage');
        return 'placeholder-root-hash';
    }
    /** 从 0G Storage 下载文件 */
    async downloadFile(rootHash, outputPath) {
        if (!this.initialized)
            await this.init();
        // TODO: await indexer.download(rootHash, outputPath, withProof);
        logger_1.logger.info({ rootHash, outputPath }, 'Downloaded file from 0G Storage');
    }
    /** 上传市场快照 JSON */
    async uploadSnapshot(marketId, snapshotData) {
        // TODO: Write JSON to temp file, upload, return rootHash
        const _data = JSON.stringify(snapshotData);
        logger_1.logger.info({ marketId }, 'Uploading market snapshot');
        return this.uploadFile(`/tmp/snapshot-${marketId}-${Date.now()}.json`);
    }
}
exports.OgFileClient = OgFileClient;
exports.ogFileClient = new OgFileClient();
//# sourceMappingURL=og-file-client.js.map