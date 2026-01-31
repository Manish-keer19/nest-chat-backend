# Delete Test Users API Endpoint

## Overview
This API endpoint allows you to delete all users with `@testmail.com` email addresses and all their associated data from the database.

## Endpoint Details

**URL:** `DELETE /users/testmail`

**Authentication:** Required (JWT Token)

**Description:** Removes all users with `@testmail.com` emails and cascades the deletion to all their related data including:
- User profiles
- Posts, comments, likes, and attachments
- Messages and conversations
- Calls and call participants
- Follow relationships
- All other user-related data

## How to Use

### Using cURL

```bash
curl -X DELETE http://localhost:3000/users/testmail \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman or Thunder Client

1. **Method:** DELETE
2. **URL:** `http://localhost:3000/users/testmail`
3. **Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN`

### Using JavaScript/Fetch

```javascript
fetch('http://localhost:3000/users/testmail', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${yourJwtToken}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully deleted 5 test user(s) and all their associated data",
  "deletedUsers": [
    {
      "username": "testuser1",
      "email": "testuser1@testmail.com"
    },
    {
      "username": "testuser2",
      "email": "testuser2@testmail.com"
    }
  ],
  "stats": {
    "users": 5,
    "posts": 12,
    "comments": 34,
    "likes": 56,
    "attachments": 8,
    "postStats": 12,
    "messages": 45,
    "messageReads": 120,
    "conversationUsers": 15,
    "conversationReads": 30,
    "conversations": 8,
    "follows": 20,
    "calls": 3,
    "callParticipants": 6,
    "callEvents": 15
  }
}
```

### No Users Found Response (200 OK)

```json
{
  "success": true,
  "message": "No users with @testmail.com email found",
  "stats": {}
}
```

### Error Response (401 Unauthorized)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Important Notes

1. **Authentication Required:** You must be logged in and provide a valid JWT token
2. **Irreversible Operation:** This operation permanently deletes data and cannot be undone
3. **Cascade Deletion:** All related data is automatically deleted
4. **Test Data Only:** This endpoint is designed specifically for cleaning up test users with `@testmail.com` emails
5. **Production Use:** Be cautious when using this in production environments

## Swagger Documentation

You can also access this endpoint through the Swagger UI at:
`http://localhost:3000/api` (or your configured Swagger path)

Look for the **Users** section and find the **DELETE /users/testmail** endpoint.
