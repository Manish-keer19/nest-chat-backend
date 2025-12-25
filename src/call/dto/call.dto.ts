import { IsString, IsEnum, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { CallType } from '../../../generated/prisma/client';

export class InitiateCallDto {
    @IsArray()
    @IsString({ each: true })
    recipientIds: string[];

    @IsEnum(CallType)
    callType: CallType;

    @IsOptional()
    @IsString()
    conversationId?: string;
}

export class CallIdDto {
    @IsString()
    callId: string;
}

export class RejectCallDto {
    @IsString()
    callId: string;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class ToggleMuteDto {
    @IsString()
    callId: string;

    @IsBoolean()
    isMuted: boolean;
}

export class ToggleVideoDto {
    @IsString()
    callId: string;

    @IsBoolean()
    isVideoOff: boolean;
}

export class WebRTCOfferDto {
    @IsString()
    callId: string;

    @IsString()
    targetUserId: string;

    offer: RTCSessionDescriptionInit;
}

export class WebRTCAnswerDto {
    @IsString()
    callId: string;

    @IsString()
    targetUserId: string;

    answer: RTCSessionDescriptionInit;
}

export class WebRTCIceCandidateDto {
    @IsString()
    callId: string;

    @IsString()
    targetUserId: string;

    candidate: RTCIceCandidateInit;
}
