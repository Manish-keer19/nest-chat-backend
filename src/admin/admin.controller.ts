import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {

    // Only users with ADMIN role can access this route
    @Get('dashboard')
    @Roles(Role.ADMIN)
    @ApiOperation({
        summary: 'Get admin dashboard',
        description: 'Access admin dashboard. Requires ADMIN role.'
    })
    @ApiResponse({
        status: 200,
        description: 'Admin dashboard data',
        schema: {
            example: {
                message: 'Welcome to Admin Dashboard',
                user: {
                    id: 'user-uuid-123',
                    email: 'admin@example.com',
                    role: 'ADMIN'
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 403, description: 'Forbidden - User does not have ADMIN role' })
    getAdminDashboard(@CurrentUser() user: JwtPayload) {
        return {
            message: 'Welcome to Admin Dashboard',
            user: {
                id: user.sub,
                email: user.email,
                role: user.role,
            },
        };
    }

    // Only users with ADMIN role can access this route
    @Get('users')
    @Roles(Role.ADMIN)
    @ApiOperation({
        summary: 'Get all users',
        description: 'Retrieve list of all users. Requires ADMIN role.'
    })
    @ApiResponse({
        status: 200,
        description: 'List of users',
        schema: {
            example: {
                message: 'List of all users (admin only)',
                requestedBy: 'admin@example.com'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 403, description: 'Forbidden - User does not have ADMIN role' })
    getAllUsers(@CurrentUser() user: JwtPayload) {
        return {
            message: 'List of all users (admin only)',
            requestedBy: user.email,
        };
    }

    // Both ADMIN and USER can access this route
    @Get('stats')
    @Roles(Role.ADMIN, Role.USER)
    @ApiOperation({
        summary: 'Get statistics',
        description: 'Get application statistics. Available to both ADMIN and USER roles.'
    })
    @ApiResponse({
        status: 200,
        description: 'Statistics data',
        schema: {
            example: {
                message: 'Statistics available to both admin and users'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    getStats() {
        return {
            message: 'Statistics available to both admin and users',
        };
    }
}
