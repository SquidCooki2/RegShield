import { Module } from '@nestjs/common';
import { S3Module } from '../aws-s3/s3.module';
import { BedrockModule } from '../aws-bedrock/bedrock.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { OcrEngineService } from './ocr-engine.service';

@Module({
  imports: [S3Module, BedrockModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, OcrEngineService],
  exports: [ComplianceService, OcrEngineService],
})
export class ComplianceModule {}
