import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
    (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string => {
        const request = ctx.switchToHttp().getRequest();
        const user: JwtPayload = request.user;

        // If a specific property is requested, return that
        return data ? user?.[data] : user;
    },
);
