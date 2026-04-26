const path = require("path");
const minioClient = require("../config/minio");

const BUCKET = process.env.MINIO_BUCKET || "layanan-kelembagaan-files";

const sanitizeFileName = (fileName = "") => {
    return fileName
        .replace(/[^\w.\-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
};

const decodeOriginalName = (originalName = "") => {
    return Buffer.from(originalName, "latin1").toString("utf8");
};

const buildObjectName = ({ folder, fileName, suffix = "" }) => {
    const decodedName = decodeOriginalName(fileName);
    const ext = path.extname(decodedName);
    const baseName = path.basename(decodedName, ext) || "file";
    const safeBaseName = sanitizeFileName(baseName);
    const safeSuffix = suffix ? `_${sanitizeFileName(String(suffix))}` : "";
    const timestamp = Date.now();

    return `${folder}/${safeBaseName}_${timestamp}${safeSuffix}${ext}`;
};

const uploadBufferToMinio = async ({ file, objectName }) => {
    if (!file || !file.buffer) {
        throw new Error("File buffer tidak valid untuk upload MinIO");
    }

    try {
        await minioClient.putObject(
            BUCKET,
            objectName,
            file.buffer,
            file.size,
            { "Content-Type": file.mimetype }
        );
        return objectName;
    } catch (error) {
        throw new Error(`Upload ke MinIO gagal: ${error.message}`);
    }
};

module.exports = {
    BUCKET,
    buildObjectName,
    decodeOriginalName,
    uploadBufferToMinio,
};
