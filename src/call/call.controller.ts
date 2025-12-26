import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallController {
    constructor(private callService: CallService) { }

    /**
     * Get call history for authenticated user
     */
    @Get('history')
    async getCallHistory(
        @Request() req,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user.userId;
        const limitNum = limit ? parseInt(limit, 10) : 50;

        return this.callService.getUserCallHistory(userId, limitNum);
    }

    /**
     * Get specific call details
     */
    @Get(':callId')
    async getCall(@Param('callId') callId: string) {
        return this.callService.getCall(callId);
    }
    /**
     * Get active call for a conversation
     */
    @Get('conversation/:conversationId/active')
    async getActiveCallForConversation(@Param('conversationId') conversationId: string) {
        return this.callService.getActiveCallForConversation(conversationId);
    }
}
