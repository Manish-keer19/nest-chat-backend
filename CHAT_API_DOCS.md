# Chat API - Swagger Documentation

## Overview
All chat controller endpoints now have comprehensive Swagger documentation. You can access the interactive API documentation at:

**Swagger UI URL**: `http://localhost:3000/api`

## Available Endpoints

### 1. **GET** `/conversations`
- **Summary**: Health check endpoint
- **Description**: Simple endpoint to verify the conversations API is running
- **Response**: Returns "hello brother"

### 2. **GET** `/conversations/:id`
- **Summary**: Get conversation messages
- **Description**: Retrieves all messages for a specific conversation
- **Parameters**: 
  - `id` (path): Conversation ID
- **Responses**:
  - 200: Array of messages
  - 404: Conversation not found

### 3. **POST** `/conversations`
- **Summary**: Create private conversation
- **Description**: Creates a new private conversation between two users
- **Body**:
  ```json
  {
    "user1Id": "user-uuid-1",
    "user2Id": "user-uuid-2"
  }
  ```
- **Responses**:
  - 201: Private conversation created successfully
  - 400: Invalid input data
  - 409: Conversation already exists

### 4. **POST** `/conversations/group`
- **Summary**: Create group conversation
- **Description**: Creates a new group conversation with multiple users
- **Body**:
  ```json
  {
    "name": "Project Team",
    "userIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
    "ownerId": "user-uuid-1"
  }
  ```
- **Responses**:
  - 201: Group conversation created successfully
  - 400: Invalid input data

### 5. **GET** `/conversations/user/:userId`
- **Summary**: Get user conversations
- **Description**: Retrieves all conversations (private and group) for a specific user
- **Parameters**: 
  - `userId` (path): User ID
- **Responses**:
  - 200: Array of conversations with participants and last message
  - 404: User not found

### 6. **POST** `/conversations/messages/:id/delete`
- **Summary**: Delete message
- **Description**: Deletes a specific message (only sender can delete)
- **Parameters**: 
  - `id` (path): Message ID
- **Body**:
  ```json
  {
    "userId": "user-uuid-1"
  }
  ```
- **Responses**:
  - 200: Message deleted successfully
  - 403: User not authorized
  - 404: Message not found

### 7. **POST** `/conversations/messages/:id/edit`
- **Summary**: Edit message
- **Description**: Edits message text (only sender can edit)
- **Parameters**: 
  - `id` (path): Message ID
- **Body**:
  ```json
  {
    "userId": "user-uuid-1",
    "text": "Updated message text"
  }
  ```
- **Responses**:
  - 200: Message edited successfully
  - 403: User not authorized
  - 404: Message not found

### 8. **POST** `/conversations/:id/add-user`
- **Summary**: Add user to group
- **Description**: Adds a user to a group conversation (only owner can add)
- **Parameters**: 
  - `id` (path): Conversation ID
- **Body**:
  ```json
  {
    "userId": "user-uuid-3",
    "requesterId": "user-uuid-1"
  }
  ```
- **Responses**:
  - 200: User added successfully
  - 400: Not a group or user already in group
  - 403: Only group owner can add users
  - 404: Conversation or user not found

### 9. **POST** `/conversations/:id/remove-user`
- **Summary**: Remove user from group
- **Description**: Removes a user from a group conversation (only owner can remove)
- **Parameters**: 
  - `id` (path): Conversation ID
- **Body**:
  ```json
  {
    "userId": "user-uuid-2",
    "requesterId": "user-uuid-1"
  }
  ```
- **Responses**:
  - 200: User removed successfully
  - 400: Not a group or user not in group
  - 403: Only group owner can remove users
  - 404: Conversation or user not found

### 10. **POST** `/conversations/:id/delete`
- **Summary**: Delete conversation
- **Description**: Deletes a conversation (owner for groups, any participant for private)
- **Parameters**: 
  - `id` (path): Conversation ID
- **Body**:
  ```json
  {
    "userId": "user-uuid-1"
  }
  ```
- **Responses**:
  - 200: Conversation deleted successfully
  - 403: User not authorized
  - 404: Conversation not found

## Features Added

1. **@ApiTags**: Groups all endpoints under "Conversations" in Swagger UI
2. **@ApiOperation**: Provides summary and description for each endpoint
3. **@ApiParam**: Documents path parameters with examples
4. **@ApiBody**: Documents request body with DTO types
5. **@ApiResponse**: Documents all possible response codes with examples
6. **DTOs**: Created type-safe Data Transfer Objects with validation:
   - `CreatePrivateConversationDto`
   - `CreateGroupConversationDto`
   - `DeleteMessageDto`
   - `EditMessageDto`
   - `AddUserToGroupDto`
   - `RemoveUserFromGroupDto`
   - `DeleteConversationDto`

## How to Use Swagger UI

1. Navigate to `http://localhost:3000/api` in your browser
2. You'll see all endpoints organized under "Conversations"
3. Click on any endpoint to expand it
4. Click "Try it out" to test the endpoint
5. Fill in the required parameters/body
6. Click "Execute" to send the request
7. View the response below

## Benefits

- **Interactive Testing**: Test all endpoints directly from the browser
- **Auto-generated Documentation**: Always up-to-date with code changes
- **Type Safety**: DTOs ensure proper validation and type checking
- **Clear Examples**: Each endpoint includes example requests and responses
- **Error Documentation**: All possible error responses are documented
