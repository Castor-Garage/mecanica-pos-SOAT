import type {
  IClientRepository,
  ClientRecord,
  CreateClientData,
} from '../../../domain/client/repositories/IClientRepository.js'
import { CPF } from '../../../domain/client/value-objects/CPF.js'
import { CNPJ } from '../../../domain/client/value-objects/CNPJ.js'
import { ConflictError } from '../../../shared/errors/AppError.js'

export class CreateClientUseCase {
  constructor(private readonly clientRepo: IClientRepository) {}

  async execute(data: CreateClientData): Promise<ClientRecord> {
    if (data.documentType === 'CPF') {
      CPF.create(data.document)
    } else {
      CNPJ.create(data.document)
    }

    const digits = data.document.replace(/\D/g, '')
    const existing = await this.clientRepo.findByDocument(digits)
    if (existing) {
      throw new ConflictError(`Já existe um cliente com este ${data.documentType}`)
    }

    return this.clientRepo.create({ ...data, document: digits })
  }
}
