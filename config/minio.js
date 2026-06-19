const Minio = require("minio");
require("dotenv").config();

const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
};

if (process.env.MINIO_PORT) {
  minioConfig.port = parseInt(process.env.MINIO_PORT, 10);
}

if (process.env.NODE_ENV === "production" && (!minioConfig.accessKey || !minioConfig.secretKey)) {
  throw new Error("MINIO_ACCESS_KEY dan MINIO_SECRET_KEY wajib diisi di production");
}

const minioClient = new Minio.Client(minioConfig);

module.exports = minioClient;
