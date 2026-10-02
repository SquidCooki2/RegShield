import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ComplianceService } from './compliance.service';
import { CreateClientSubmissionDto, DecisionDto, RemediationRequestDto } from './dto/upload-request.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('clients')
  async getAllClients() {
    return this.complianceService.getAllClientsWithReviews();
  }

  @Get('clients/:clientId')
  async getClient(@Param('clientId') clientId: string) {
    return this.complianceService.getClientDetails(clientId);
  }

  @Post('submit')
  @UseInterceptors(FilesInterceptor('files', 10))
  async submitClient(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const dto: CreateClientSubmissionDto = {
      fullName: body.fullName || 'Unnamed Client',
      email: body.email || 'client@example.com',
      phone: body.phone,
      accountType: body.accountType || 'Individual',
      advisorName: body.advisorName || 'Independent Advisor',
      advisorFirm: body.advisorFirm,
      targetPortfolio: body.targetPortfolio || 'Balanced Growth (60/40)',
      estimatedAum: body.estimatedAum ? Number(body.estimatedAum) : 500000,
      notes: body.notes,
    };

    return this.complianceService.createSubmission(dto, files || []);
  }

  @Post('clients/:clientId/decision')
  async makeDecision(
    @Param('clientId') clientId: string,
    @Body() dto: DecisionDto
  ) {
    return this.complianceService.updateDecision(clientId, dto);
  }

  @Post('clients/:clientId/remediation')
  async sendRemediation(
    @Param('clientId') clientId: string,
    @Body() dto: RemediationRequestDto
  ) {
    return this.complianceService.triggerRemediation(clientId, dto);
  }

  @Get('documents/:filename')
  serveLocalDocument(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.resolve(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      // Return synthetic PDF or text placeholder if not physically saved
      res.setHeader('Content-Type', 'text/plain');
      return res.send(`RegShield Compliance Document Archive: ${filename}`);
    }
    return res.sendFile(filePath);
  }
}
