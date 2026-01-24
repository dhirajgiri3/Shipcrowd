/**
 * User Management Page (Server Component)
 *
 * Super Admin page for managing platform users.
 * Allows promoting sellers to admins and demoting admins to sellers.
 */

import { UserManagementClient } from './components/UserManagementClient';

export const metadata = {
    title: 'User Management | Helix Admin',
    description: 'Manage platform users, roles, and permissions',
};

export default function UserManagementPage() {
    return <UserManagementClient />;
}
