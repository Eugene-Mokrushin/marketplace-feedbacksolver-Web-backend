import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LoggerService } from '../../log/logger.service';
import { TokenUid } from '../authDto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private logger: LoggerService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any, req: any) {
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      this.logger.warn(`Token of user ${payload.uid} had expired`);
      throw new UnauthorizedException(
        'У вас нет прав или ваша кнопка более не активна. Для создания заявки обратитесь к MAY Assistant еще раз для получения новой кнопки.',
      );
    }
    if (!payload.uid) {
      throw new UnauthorizedException('Missing email in token payload');
    }
    const tokenDto = plainToClass(TokenUid, { uid: payload.uid });
    const errors = await validate(tokenDto);
    if (errors.length > 0) {
      throw new UnauthorizedException('Invalid email in token payload');
    }

    req.user = { uid: payload.uid };
    return { uid: payload.uid };
  }
}
