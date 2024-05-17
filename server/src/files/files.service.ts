import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 } from 'uuid';
import { resolve } from 'path';
import * as fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '../entities/files/File';
import * as process from 'process';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileService: Repository<FileEntity>,
  ) {}
  async createFile(file: Express.Multer.File) {
    // try {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = v4() + '.' + fileExtension;
    const filePath = resolve(__dirname, '..', '..', 'static');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
    fs.writeFileSync(resolve(filePath, fileName), file.buffer);
    let url = process.env.SERVER_URL;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return await this.fileService.save({
      name: fileName,
      extension: fileExtension,
      full_link: url + '/' + fileName,
    });
    // } catch (e) {
    //   throw new InternalServerErrorException(e.message);
    // }
  }
  // createFileFromBuffer(file: Buffer, fileName: string) {
  //   try {
  //     const filePath = resolve(__dirname, "..", "..", "static");
  //     if (!fs.existsSync(filePath)) {
  //       fs.mkdirSync(filePath, { recursive: true });
  //     }
  //     fs.writeFileSync(resolve(filePath, fileName), file);
  //     return fileName;
  //   } catch (e) {
  //     throw new InternalServerErrorException(e.message);
  //   }
  // }
}
