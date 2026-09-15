-- AlterTable
CREATE TYPE "ProviderConnectionKind" AS ENUM ('social', 'google_ads', 'meta_ads');

-- AlterTable
CREATE TYPE "ProviderConnectionStatus" AS ENUM ('pending', 'connected', 'disconnected', 'expired', 'error');

-- AlterTable
CREATE TYPE "SocialAccountType" AS ENUM ('facebook', 'instagram', 'linkedin', 'x');

-- CreateTable
CREATE TABLE "provider_connections" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "kind" "ProviderConnectionKind" NOT NULL,
    "external_key" TEXT NOT NULL,
    "account_type" "SocialAccountType",
    "status" "ProviderConnectionStatus" NOT NULL DEFAULT 'pending',
    "external_account_id" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "display_name" TEXT,
    "can_read_ads" BOOLEAN,
    "missing_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_health_at" TIMESTAMP(3),
    "last_health_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_connections_workspace_id_idx" ON "provider_connections"("workspace_id");

-- CreateIndex
CREATE INDEX "provider_connections_kind_idx" ON "provider_connections"("kind");

-- CreateIndex
CREATE INDEX "provider_connections_status_idx" ON "provider_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_connections_workspace_id_external_key_key" ON "provider_connections"("workspace_id", "external_key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_credentials_connection_id_key" ON "provider_credentials"("connection_id");

-- AddForeignKey
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
