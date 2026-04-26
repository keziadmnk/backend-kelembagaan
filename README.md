# Backend — Layanan Kelembagaan Perangkat Daerah

Backend REST API untuk sistem layanan kelembagaan perangkat daerah Sumatera Barat.  
Dibangun dengan **Express 5**, **Sequelize**, **PostgreSQL**, dan **MinIO** sebagai object storage untuk file upload.

---

## Prasyarat

Pastikan sudah terinstal di komputer Anda:

| Software | Versi Min | Keterangan |
|---|---|---|
| Node.js | 18+ | Runtime JavaScript |
| PostgreSQL | 14+ | Database utama |
| MinIO | terbaru | Object storage untuk file upload |
| Git | terbaru | Version control |

---

## 1. Clone Repository

```bash
git clone <url-repo-anda>
cd backend-kelembagaan
```

---

## 2. Instalasi Dependensi

```bash
npm install
```

---

## 3. Konfigurasi Environment

Salin file contoh `.env.example` menjadi `.env`:

```bash
# Windows
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

Kemudian buka file `.env` dan sesuaikan nilainya:

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=layanankelembagaan

# Server
PORT=3001
JWT_SECRET=ganti_dengan_secret_yang_kuat

# MinIO Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=layanan-kelembagaan-files
```

---

## 4. Setup MinIO (WAJIB — Baru di Versi Ini)

Sistem ini menggunakan **MinIO** sebagai penyimpanan file (dokumen, bukti proses, surat rekomendasi). **Tanpa MinIO, fitur upload/download file tidak akan berfungsi.**

### Cara A — Menggunakan Docker (Paling Mudah)

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v minio_data:/data \
  minio/minio server /data --console-address ":9001"
```

### Cara B — Menggunakan Binary MinIO

1. Download dari [https://min.io/download](https://min.io/download) sesuai OS Anda.
2. Jalankan:
   ```bash
   # Windows
   minio.exe server C:\minio-data --console-address ":9001"

   # Linux / Mac
   ./minio server ~/minio-data --console-address ":9001"
   ```

### Buat Bucket

Setelah MinIO berjalan, buat bucket bernama `layanan-kelembagaan-files`:

1. Buka browser → [http://localhost:9001](http://localhost:9001)
2. Login dengan: **Username** `minioadmin` / **Password** `minioadmin`
3. Klik **Buckets** → **Create Bucket**
4. Nama bucket: **`layanan-kelembagaan-files`**
5. Klik **Create Bucket**

> ⚠️ Nama bucket **harus persis sama** dengan nilai `MINIO_BUCKET` di file `.env`.

---

## 5. Setup Database PostgreSQL

Buat database terlebih dahulu:

```sql
CREATE DATABASE layanankelembagaan;
```

Kemudian jalankan migrasi untuk membuat semua tabel:

```bash
npx sequelize-cli db:migrate
```

Isi data awal (opsional):

```bash
npm run seed
```

---

## 6. Menjalankan Server

```bash
# Mode production
npm start

# Mode development (auto-restart saat ada perubahan)
npm run dev
```

Server akan berjalan di: **http://localhost:3001**

---

## Struktur Penyimpanan File di MinIO

| Folder di MinIO | Isi |
|---|---|
| `documents/` | Dokumen persyaratan pengajuan |
| `bukti-proses/` | Bukti dukung tahapan proses |
| `rekomendasi/` | Surat rekomendasi final |
| `profiles/` | Foto profil pengguna |

---

## Catatan Penting

- Folder `uploads/` yang lama sudah **tidak digunakan**. Semua file sekarang disimpan langsung ke MinIO (tidak ke disk lokal).
- File `.env` **tidak boleh** di-commit ke GitHub — sudah dikecualikan di `.gitignore`.
- MinIO harus **sudah berjalan** sebelum server backend dijalankan.
