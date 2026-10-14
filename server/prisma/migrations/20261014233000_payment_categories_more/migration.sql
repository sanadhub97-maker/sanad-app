-- New payment categories: wage protection, health certificate, technical report, maintenance contract.
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'WAGE_PROTECTION';
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'HEALTH_CERTIFICATE';
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'TECHNICAL_REPORT';
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'MAINTENANCE_CONTRACT';
