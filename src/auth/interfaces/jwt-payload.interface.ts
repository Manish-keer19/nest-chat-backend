import { Role } from "generated/prisma/browser";

export interface JwtPayload {
    sub: string;  // User ID (UUID)
    email: string;
    role: Role;
}
