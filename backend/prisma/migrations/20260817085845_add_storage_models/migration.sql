-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_ref" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_selections" (
    "id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "pipeline_used" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_selections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "file_selections" ADD CONSTRAINT "file_selections_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "file_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
