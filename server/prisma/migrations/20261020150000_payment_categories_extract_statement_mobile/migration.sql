-- New payment categories: commercial registration extract, statement letter, mobile package.
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'COMMERCIAL_REGISTRATION_EXTRACT';
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'STATEMENT_LETTER';
ALTER TYPE "PaymentCategory" ADD VALUE IF NOT EXISTS 'MOBILE_PACKAGE';
