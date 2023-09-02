import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { LoggerService } from '@/log/logger.service';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, lastValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SharedService {
  constructor(
    private config: ConfigService,
    private logger: LoggerService,
    private jwt: JwtService,
  ) {}

  encodeSecretKey(text: string | null): string {
    if (!text) {
      return null;
    }
    const algorithm = 'AES-256-GCM';
    const key = this.config.get('SUPER_SECRET_ENCRYPTION_KEY');
    const stringRepresentation = this.config.get('SUPER_SECRET_IV_KEY');
    const buffer = Buffer.from(
      stringRepresentation.replace(/^<Buffer\s+|\s+>$/g, '').replace(/\s/g, ''),
      'hex',
    );
    const iv = buffer;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decodeSecretKey(text: string | null): string {
    if (!text) {
      return null;
    }
    const algorithm = 'AES-256-GCM';
    const key = this.config.get('SUPER_SECRET_ENCRYPTION_KEY');
    const stringRepresentation = this.config.get('SUPER_SECRET_IV_KEY');
    const buffer = Buffer.from(
      stringRepresentation.replace(/^<Buffer\s+|\s+>$/g, '').replace(/\s/g, ''),
      'hex',
    );
    const iv = buffer;
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = decipher.update(text, 'hex', 'utf8');
    return decrypted;
  }

  async makeHttpRequest(http$: Observable<AxiosResponse<any>>): Promise<any> {
    return await lastValueFrom(
      http$.pipe(
        map((response: AxiosResponse) => {
          return response.data;
        }),
        catchError((error) => {
          const errorMessage = `Server connection Error`;
          console.log(error);
          const status = error.response?.status || HttpStatus.UNAUTHORIZED;
          this.logger.error(`Couldn't fetch `);
          throw new HttpException(errorMessage, status);
        }),
      ),
    );
  }

  buildUrl(subdomain: string, queryParams: { [key: string]: any }): URL {
    const url = new URL(
      this.config.get('WILDBERRIES_FEEDBACKS_API') + subdomain,
    );
    Object.keys(queryParams).forEach((key) => {
      url.searchParams.append(key, queryParams[key]);
    });
    return url;
  }

  async signToken(payload: object): Promise<{ access_token: string }> {
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: secret,
    });
    return {
      access_token: token,
    };
  }
}
