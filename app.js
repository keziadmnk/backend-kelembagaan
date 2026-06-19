const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
require("./models/User");
require('./models/relation');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/$/, ""));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    console.log("CORS blocked origin:", cleanOrigin);
    console.log("Allowed origins:", allowedOrigins);

    return callback(new Error("Origin tidak diizinkan oleh CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

const path = require("path");
const minioClient = require("./config/minio");
const { authenticate } = require("./middleware/auth");
const MINIO_BUCKET = process.env.MINIO_BUCKET || "layanan-kelembagaan-files";

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    ".pdf":  "application/pdf",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls":  "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".zip":  "application/zip",
  };
  return map[ext] || "application/octet-stream";
};

const streamDocumentFromMinio = async (req, res) => {
  const segments = req.params.path;
  const objectName = Array.isArray(segments) ? segments.join('/') : segments;
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Document Proxy] bucket=${MINIO_BUCKET} object=${objectName}`);
  }
  if (!objectName) return res.status(400).json({ success: false, message: "Path file tidak valid" });
  try {
    const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
    res.setHeader("Content-Type", getContentType(objectName));
    stream.on("error", (err) => {
      console.error("[Document Proxy] stream error:", err.message);
      if (!res.headersSent) res.status(404).json({ success: false, message: "File tidak ditemukan" });
    });
    stream.pipe(res);
  } catch (err) {
    console.error("[Document Proxy] getObject error:", err.message);
    res.status(404).json({ success: false, message: "File tidak ditemukan" });
  }
};

app.get("/dokumen/*path", authenticate, streamDocumentFromMinio);
app.get("/minio/*path", authenticate, streamDocumentFromMinio);

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const pengajuanRoutes = require("./routes/pengajuan");
const uploadRoutes = require("./routes/upload");
const modulLayananRoutes = require("./routes/modulLayanan");
const notifikasiRoutes = require("./routes/notifikasiRoutes");
const profileRoutes = require("./routes/profile");
const logProsesRoutes = require('./routes/logProses');

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/modul-layanan", modulLayananRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/profile", profileRoutes);
app.use('/api/proses', logProsesRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
    if (process.env.NODE_ENV === 'production') {
      console.log('Production mode: gunakan migration, sequelize.sync otomatis dilewati.');
      return null;
    }
    return sequelize.sync({ force: false });
  })
  .then(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Database & tables have been synced.');
    }
    console.log("ℹUntuk update schema, jalankan: npx sequelize-cli db:migrate");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = app;

