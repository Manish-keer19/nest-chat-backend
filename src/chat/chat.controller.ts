import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreatePrivateConversationDto, CreateGroupConversationDto } from './dto/create-conversation.dto';
import { DeleteMessageDto, EditMessageDto } from './dto/message.dto';
import { AddUserToGroupDto, RemoveUserFromGroupDto, DeleteConversationDto } from './dto/group.dto';

@ApiTags('Conversations')
@Controller('conversations')
export class ChatsController {
  constructor(private readonly chatService: ChatService) { }

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Simple endpoint to verify the conversations API is running'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message',
    schema: {
      type: 'string',
      example: 'hello brother'
    }
  })
  sayHell() {
    return 'hello brother'
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation messages',
    description: 'Retrieves all messages for a specific conversation by conversation ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv-uuid-123'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of messages in the conversation',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'msg-uuid-1' },
          text: { type: 'string', example: 'Hello there!' },
          senderId: { type: 'string', example: 'user-uuid-1' },
          conversationId: { type: 'string', example: 'conv-uuid-123' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found'
  })
  async getConversationMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create private conversation',
    description: 'Creates a new private conversation between two users'
  })
  @ApiBody({ type: CreatePrivateConversationDto })
  @ApiResponse({
    status: 201,
    description: 'Private conversation created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'conv-uuid-123' },
        type: { type: 'string', example: 'PRIVATE' },
        createdAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data'
  })
  @ApiResponse({
    status: 409,
    description: 'Conversation already exists between these users'
  })
  createPrivate(@Body() body: CreatePrivateConversationDto) {
    return this.chatService.createPrivateConversation(
      body.user1Id,
      body.user2Id,
    );
  }

  @Post('group')
  @ApiOperation({
    summary: 'Create group conversation',
    description: 'Creates a new group conversation with multiple users'
  })
  @ApiBody({ type: CreateGroupConversationDto })
  @ApiResponse({
    status: 201,
    description: 'Group conversation created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'conv-uuid-456' },
        name: { type: 'string', example: 'Project Team' },
        type: { type: 'string', example: 'GROUP' },
        ownerId: { type: 'string', example: 'user-uuid-1' },
        createdAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data'
  })
  createGroup(@Body() body: CreateGroupConversationDto) {
    return this.chatService.createGroup(body.name, body.userIds, body.ownerId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user conversations',
    description: 'Retrieves all conversations (private and group) for a specific user'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'user-uuid-1'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of conversations for the user',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'conv-uuid-123' },
          type: { type: 'string', example: 'PRIVATE' },
          name: { type: 'string', example: 'Project Team', nullable: true },
          participants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' }
              }
            }
          },
          lastMessage: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            },
            nullable: true
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  getUserConversations(@Param('userId') userId: string) {
    return this.chatService.getUserConversations(userId);
  }

  @Post('messages/:id/delete')
  @ApiOperation({
    summary: 'Delete message',
    description: 'Deletes a specific message. Only the message sender can delete their own messages.'
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: 'msg-uuid-1'
  })
  @ApiBody({ type: DeleteMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Message deleted successfully' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'User not authorized to delete this message'
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found'
  })
  deleteMessage(@Param('id') id: string, @Body() body: DeleteMessageDto) {
    return this.chatService.deleteMessage(id, body.userId);
  }

  @Post('messages/:id/edit')
  @ApiOperation({
    summary: 'Edit message',
    description: 'Edits the text content of a specific message. Only the message sender can edit their own messages.'
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: 'msg-uuid-1'
  })
  @ApiBody({ type: EditMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Message edited successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg-uuid-1' },
        text: { type: 'string', example: 'Updated message text' },
        edited: { type: 'boolean', example: true },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'User not authorized to edit this message'
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found'
  })
  editMessage(@Param('id') id: string, @Body() body: EditMessageDto) {
    return this.chatService.editMessage(id, body.userId, body.text);
  }

  @Post(':id/add-user')
  @ApiOperation({
    summary: 'Add user to group',
    description: 'Adds a user to an existing group conversation. Only the group owner can add users.'
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv-uuid-456'
  })
  @ApiBody({ type: AddUserToGroupDto })
  @ApiResponse({
    status: 200,
    description: 'User added to group successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User added to group successfully' },
        conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            participants: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Only group owner can add users'
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation or user not found'
  })
  @ApiResponse({
    status: 400,
    description: 'Not a group conversation or user already in group'
  })
  addUser(@Param('id') id: string, @Body() body: AddUserToGroupDto) {
    return this.chatService.addUserToGroup(id, body.userId, body.requesterId);
  }

  @Post(':id/remove-user')
  @ApiOperation({
    summary: 'Remove user from group',
    description: 'Removes a user from a group conversation. Only the group owner can remove users.'
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv-uuid-456'
  })
  @ApiBody({ type: RemoveUserFromGroupDto })
  @ApiResponse({
    status: 200,
    description: 'User removed from group successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User removed from group successfully' },
        conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            participants: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Only group owner can remove users'
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation or user not found'
  })
  @ApiResponse({
    status: 400,
    description: 'Not a group conversation or user not in group'
  })
  removeUser(@Param('id') id: string, @Body() body: RemoveUserFromGroupDto) {
    return this.chatService.removeUserFromGroup(id, body.userId, body.requesterId);
  }

  @Post(':id/delete')
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Deletes a conversation. For group conversations, only the owner can delete. For private conversations, any participant can delete.'
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv-uuid-123'
  })
  @ApiBody({ type: DeleteConversationDto })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Conversation deleted successfully' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'User not authorized to delete this conversation'
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found'
  })
  deleteConversation(@Param('id') id: string, @Body() body: DeleteConversationDto) {
    return this.chatService.deleteConversation(id, body.userId);
  }
}
