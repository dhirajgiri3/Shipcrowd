# Helix Team Management System Documentation

## Overview

The Team Management System in Helix allows companies to manage their team members, assign roles and permissions, and track team activity. The system enables efficient team collaboration, proper access control, and comprehensive activity tracking.

## Key Features

- **Role Hierarchy**: Structured role system with clear hierarchy and permissions
- **Team Invitations**: Secure invitation process with personalized messages
- **Permission Management**: Granular control over what each team member can access
- **Activity Tracking**: Comprehensive logging of team member actions
- **Role-Based Access Control**: Access to features based on team member roles

## Role Hierarchy

The system implements a clear role hierarchy with the following roles:

1. **Owner** - Full access to all features, cannot be removed unless ownership is transferred
2. **Admin** - Almost full access, can manage all aspects except ownership transfer
3. **Manager** - Can manage day-to-day operations but with some restrictions
4. **Member** - Standard team member with limited management capabilities
5. **Viewer** - Read-only access to most features

## Team Member Status

Team members can have the following statuses:

1. **Active** - Normal access to the system
2. **Invited** - Invitation sent but not yet accepted
3. **Suspended** - Account temporarily disabled

## Permission System

The permission system allows granular control over what each team member can access:

- **Orders**: view, create, update, delete
- **Products**: view, create, update, delete
- **Warehouses**: view, create, update, delete
- **Customers**: view, create, update, delete
- **Team**: view, invite, update, remove, manage_roles, manage_permissions
- **Reports**: view, export
- **Settings**: view, update

## API Endpoints

### Team Members

- **GET /team** - Get all team members
- **PATCH /team/members/:userId** - Update a team member's role or status
- **DELETE /team/members/:userId** - Remove a team member

### Team Invitations

- **GET /team/invitations** - Get all pending team invitations
- **POST /team/invite** - Invite a team member
- **DELETE /team/invitations/:invitationId** - Cancel a team invitation
- **POST /team/invitations/:invitationId/resend** - Resend a team invitation
- **GET /team/verify-invitation** - Verify a team invitation token

### Permissions

- **GET /team/members/:userId/permissions** - Get a team member's permissions
- **PATCH /team/members/:userId/permissions** - Update a team member's permissions
- **GET /team/my-permissions** - Get current user's permissions

### Activity

- **GET /team/members/:userId/activity** - Get a team member's activity
- **GET /team/activity** - Get company activity
- **GET /team/my-activity** - Get current user's activity

## Role-Based Access Control

### Owner

- Can perform all actions
- Cannot be removed unless ownership is transferred
- Can manage all team members including other owners

### Admin

- Can perform most actions
- Cannot modify owner accounts
- Can manage all other team members

### Manager

- Can manage day-to-day operations
- Cannot remove team members or modify permissions of admins and owners
- Can invite new team members with equal or lower roles

### Member

- Can perform standard operations
- Cannot manage team members
- Has limited access to sensitive features

### Viewer

- Read-only access to most features
- Cannot modify any data
- Cannot access sensitive information

## Invitation Process

1. A team member with appropriate permissions sends an invitation
2. The invitation includes the recipient's email, assigned role, and optional message
3. The recipient receives an email with a secure token
4. The recipient verifies the token and accepts the invitation
5. Upon acceptance, a new user account is created or the existing account is linked to the company

## Best Practices

1. **Principle of Least Privilege**: Assign the minimum permissions necessary
2. **Regular Audits**: Review team member roles and permissions periodically
3. **Clear Ownership**: Ensure there is always at least one owner
4. **Secure Invitations**: Use secure tokens and limited-time invitations
5. **Activity Monitoring**: Regularly review team activity logs

## Security Considerations

1. **Role Separation**: Clear separation of duties between roles
2. **Invitation Expiry**: Invitations expire after 7 days
3. **Audit Logging**: All actions are logged for accountability
4. **Permission Checks**: Multiple layers of permission checks
5. **CSRF Protection**: All sensitive operations are protected against CSRF attacks
