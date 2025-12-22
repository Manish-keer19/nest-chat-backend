import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get('GITHUB_CLIENT_ID'),
            clientSecret: configService.get('GITHUB_CLIENT_SECRET'),
            callbackURL: configService.get('GITHUB_CALLBACK_URL') || 'http://localhost:3000/auth/github/callback',
            scope: ['user:email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: Function,
    ): Promise<any> {
        const { username, emails, photos, id } = profile;
        const user = {
            email: emails[0].value,
            username: username || emails[0].value.split('@')[0],
            avatarUrl: photos[0]?.value,
            provider: 'GITHUB',
            providerId: id,
        };
        done(null, user);
    }
}
