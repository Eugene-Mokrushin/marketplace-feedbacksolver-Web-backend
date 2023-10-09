import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LoggerService } from '../../log/logger.service';
import { NewTokenDto, TokenUid } from '../authDto';

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
    // if (payload.exp <= Math.floor(Date.now() / 1000)) {
    //   this.logger.warn(`Token of user ${payload.email} had expired`);
    //   throw new UnauthorizedException(
    //     'У вас нет прав или ваша кнопка более не активна. Для создания заявки обратитесь к MAY Assistant еще раз для получения новой кнопки.',
    //   );
    // }
    if (!payload.shopId) {
      throw new UnauthorizedException('Missing shopId in token payload');
    }
    const errors = await validate(NewTokenDto);
    if (errors.length > 0) {
      throw new UnauthorizedException('Invalid shopId in token payload');
    }

    req.user = { shopId: payload.shopId };
    return { shopId: payload.shopId };
  }
}
