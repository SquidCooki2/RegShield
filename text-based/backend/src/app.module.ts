import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { BedrockModule } from './modules/aws-bedrock/bedrock.module';
import { S3Module } from './modules/aws-s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ComplianceModule,
    BedrockModule,
    S3Module,
  ],
})
export class AppModule {}
