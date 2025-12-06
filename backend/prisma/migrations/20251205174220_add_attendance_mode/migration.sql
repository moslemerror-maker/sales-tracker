-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "mode" "AttendanceMode";
