import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { CounterpartyDocument } from './counterparty-document.entity.js';
import { Counterparty } from './counterparty.entity.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

export const DOCUMENT_UPLOAD = {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
};

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
  'xls',
  'xlsx',
]);

export type DocumentFile = Pick<CounterpartyDocument, 'name' | 'mimeType' | 'content'>;

@Injectable()
export class CounterpartyDocumentsService {
  constructor(
    @InjectRepository(CounterpartyDocument)
    private readonly documentsRepository: Repository<CounterpartyDocument>,
    @InjectRepository(Counterparty)
    private readonly counterpartiesRepository: Repository<Counterparty>,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, counterpartyId: string): Promise<CounterpartyDocument[]> {
    await this.findCounterparty(actor, counterpartyId);
    return this.documentsRepository.find({
      where: { companyId: actor.companyId!, counterpartyId },
      order: { createdAt: 'DESC' },
    });
  }

  async upload(
    actor: AuthUser,
    counterpartyId: string,
    file: Express.Multer.File | undefined,
    dto: UploadDocumentDto,
  ): Promise<CounterpartyDocument> {
    const counterparty = await this.findCounterparty(actor, counterpartyId);
    if (!file || !file.size) {
      throw new BadRequestException('Choose a file to upload');
    }
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8').trim();
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    if (!name.includes('.') || !ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Only PDF, image (JPG, PNG), Word and Excel files can be uploaded',
      );
    }
    const saved = await this.documentsRepository.save(
      this.documentsRepository.create({
        companyId: actor.companyId!,
        counterpartyId,
        name: name.slice(0, 200),
        type: dto.type,
        validUntil: dto.validUntil || null,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        content: file.buffer,
        uploadedByName: actor.displayName,
      }),
    );
    await this.audit.record(
      actor,
      'counterparty.document_add',
      `Added document ${saved.name} to counterparty ${counterparty.name}`,
      undefined,
      { entityId: counterparty.id, source: 'form' },
    );
    const { content: _content, ...rest } = saved;
    return rest as CounterpartyDocument;
  }

  async file(
    actor: AuthUser,
    counterpartyId: string,
    documentId: string,
  ): Promise<DocumentFile> {
    const document = await this.documentsRepository.findOne({
      select: { id: true, name: true, mimeType: true, content: true },
      where: { id: documentId, counterpartyId, companyId: actor.companyId! },
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return document;
  }

  async remove(actor: AuthUser, counterpartyId: string, documentId: string): Promise<void> {
    const counterparty = await this.findCounterparty(actor, counterpartyId);
    const document = await this.documentsRepository.findOneBy({
      id: documentId,
      counterpartyId,
      companyId: actor.companyId!,
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    await this.documentsRepository.delete({ id: document.id, companyId: actor.companyId! });
    await this.audit.record(
      actor,
      'counterparty.document_delete',
      `Deleted document ${document.name} of counterparty ${counterparty.name}`,
      undefined,
      { entityId: counterparty.id, source: 'form' },
    );
  }

  private async findCounterparty(actor: AuthUser, id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartiesRepository.findOneBy({
      id,
      companyId: actor.companyId!,
    });
    if (!counterparty) {
      throw new NotFoundException(`Counterparty ${id} not found`);
    }
    return counterparty;
  }
}
